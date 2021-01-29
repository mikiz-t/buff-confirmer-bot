const Discord = require('discord.js');
const { mode, token, channels, confirmationThreshold, confirmationEmoji, trustedConfirmerRoles, blacklistedRole } = require('../config.json');
const db = require('./database');
const regexes = require('./regexes');
const help = require('./commands/help');

const client = new Discord.Client();
client.once('ready', () => console.log('Ready!'));

let channelsMap;
const confirmedMessages = [];

if (mode === "dev") {
  channelsMap = {};
  channelsMap['780159998151098378'] = '765940655939125299';
  channelsMap['784885854744084510'] = '784852416591953951';
} else {
  channelsMap = channels;
}

client.on('message', message => {
  if (mode === 'dev') {
    if (listeningToChannel(message.channel.id)) {
      message.react(confirmationEmoji);
    }
  }

  if (message.content.startsWith('?help')) {
    return help.execute(message);
  }
});


client.on('messageReactionAdd', async (reaction, user) => {
  if ((user.bot || reaction.message.author.bot) && mode !== 'dev') return;
  if (reaction.emoji.name === '❌') {
    return shouldDeleteMessage(reaction, user);
  }
  if (listeningToChannel(reaction.message.channel.id)) {
    const shouldConfirm = await shouldConfirmMessage(reaction);
    if (shouldConfirm) {
      handleMessage(reaction.message);
    }
  }
});

client.on('messageUpdate', (oldMessage, newMessage) => {
  const confirmedMessage = getConfirmedBuffMessage(newMessage.id);

  if (confirmedMessage) {
    const buffEmote = newMessage.guild.emojis.cache.find(emoji => emoji.name === 'pepebuffs');

    confirmedMessage.confirmations.forEach(async m => {
      const channel = await newMessage.guild.channels.cache.get(m.channel);
      const message = await channel.messages.fetch(m.message);
      message.edit(`${buffEmote} ${newMessage.content} ${buffEmote}
This message has been edited by ${newMessage.author}.
Original message: "${confirmedMessage.content}"`);
    });

    newMessage.channel.send(`${newMessage.author} has edited their confirmed buff! New message: "${newMessage.content}"`)
  }
});

client.on('messageDelete', deletedMessage => {
  const confirmedMessage = getConfirmedBuffMessage(deletedMessage.id);

  if (confirmedMessage && !confirmedMessage.cancelled) {
    confirmedMessage.cancelled = true;

    confirmedMessage.confirmations.forEach(async m => {
      const channel = await deletedMessage.guild.channels.cache.get(m.channel);
      const message = await channel.messages.fetch(m.message);
      message.edit(`~~${message.content}~~ \nThis confirmation has been deleted.`);
    });

    deletedMessage.channel.send(`A confirmed buff by ${deletedMessage.author} has been deleted: "${deletedMessage.content}"`);
  }
});

client.login(token);

function getConfirmedBuffMessage(id) {
  return confirmedMessages.find(c => c.message === id && c.confirmations.length > 0);
}

async function shouldDeleteMessage(reaction, user) {
  const confirmedMessage = confirmedMessages.find(c => {
    return (c.message === reaction.message.id && c.confirmations.length > 0)
    || c.confirmations.some(conf => conf.message === reaction.message.id);
  });

  if (!confirmedMessage) {
    return false;
  }

  const reactingMember = reaction.message.guild.member(user.id);
  const shouldDelete = user.id == confirmedMessage.author || isTrustedConfirmer(reactingMember);

  if (shouldDelete && !confirmedMessage.cancelled) {
    confirmedMessage.cancelled = true;

    confirmedMessage.confirmations.forEach(async m => {
      const channel = await reaction.message.guild.channels.cache.get(m.channel);
      const message = await channel.messages.fetch(m.message);
      message.edit(`~~${message.content}~~ \nThis buff has been cancelled.`);
    });

    const channel = await reaction.message.guild.channels.cache.get(confirmedMessage.channel);
    const message = await channel.messages.fetch(confirmedMessage.message);
    if (message.reactions.cache.has('🆗')) {
      message.reactions.cache.get('🆗').remove();
    }
  }
}

function isTrustedConfirmer(member) {
  const userRoles = member.roles.cache.map(r => r.name);
  return userRoles.some(role => trustedConfirmerRoles.includes(role));
}

function listeningToChannel(channelId) {
  return channelsMap.hasOwnProperty(channelId);
}

async function shouldConfirmMessage(reaction) {
  //check it's the right emote
  if (reaction.emoji.name !== confirmationEmoji) {
    return false;
  }

  //check if it was already confirmed
  const dbMessages = await db('buff_messages').where({
    message_id: reaction.message.id
  })

  if (dbMessages.length > 0 || confirmedMessages.some(c => c.message === reaction.message.id)) {
    return false;
  }

  //get the roles of all who reacted
  const reactedUsers = await reaction.users.fetch();
  const reactedUsersRoles = reactedUsers.map(user => {
    return reaction.message.guild.member(user.id).roles.cache.map(r => r.name);
  });

  //check if a member with a trusted confirmer role reacted
  const hasTrustedConfirmer = reactedUsersRoles.some(roles => {
    let intersect = roles.filter(role => trustedConfirmerRoles.includes(role));
    return intersect.length > 0;
  });

  //check (number of reactions - number of reactions by blacklisted roles)
  const validConfirmations = reactedUsersRoles.reduce((total, roles) => {
    return roles.includes(blacklistedRole) ? total : total + 1;
  }, 0);

  return hasTrustedConfirmer || (validConfirmations >= confirmationThreshold);
}

async function handleMessage(reactionMessage) {
  try {
    confirmedMessages.push({
      channel: reactionMessage.channel.id,
      message: reactionMessage.id,
      author: reactionMessage.author.id,
      content: reactionMessage.content,
      confirmations: [],
      cancelled: false
    });
    await db('buff_messages').insert({
      message_id: reactionMessage.id
    });

    const buff = reactionMessage.content.match(regexes.buff);
    const time = reactionMessage.content.match(regexes.time);

    if (!buff || !time) {
      return reactionMessage.reply('Your buff has not been confirmed because it was not properly formatted. It must contain a buff name and a timestamp. Please post a new message. Type ?help for more info.');
    }

    const confirmationMessage = confirmedMessages.find(c => c.message === reactionMessage.id);

    const messageContent = formatMessage(buff[0], reactionMessage);

    if (['hakkar', 'hoh', 'heart', 'zg'].includes(buff[0].toLowerCase())) {
      Object.values(channelsMap).forEach(async channel => {
        const outputChannel = reactionMessage.channel.guild.channels.cache.get(channel);
        const message = await outputChannel.send(messageContent);
        confirmationMessage.confirmations.push({
          channel: message.channel.id,
          message: message.id
        });
        if (message.channel.type === 'news') {
          await message.crosspost();
        }
      })
    } else {
      const outputChannel = reactionMessage.channel.guild.channels.cache.get(channelsMap[reactionMessage.channel.id]);
      const message = await outputChannel.send(messageContent);
      confirmationMessage.confirmations.push({
        channel: message.channel.id,
        message: message.id
      });
      if (message.channel.type === 'news') {
        await message.crosspost();
      }
    }

    reactionMessage.react('🆗');
  } catch (err) {
    console.log(err);
  }
}

function formatMessage(buff, message) {
  let buffEmote;

  switch (buff.toLowerCase()) {
    case 'ony':
    case 'onyxia':
      buffEmote = 'ony';
      break;
    case 'nef':
    case 'nefarian':
      buffEmote = 'nef';
      break;
    case 'hakkar':
    case 'hoh':
    case 'heart':
    case 'zg':
      buffEmote = 'hakkar';
      break;
    case 'rend':
      buffEmote = 'rend';
      break;
    default:
      buffEmote = 'pepebuffs';
      break;
  }

  buffEmote = message.guild.emojis.cache.find(emoji => emoji.name === buffEmote);

  return `${buffEmote} "${message.content}" ${buffEmote}
Confirmed by: ${message.author}`;
}
