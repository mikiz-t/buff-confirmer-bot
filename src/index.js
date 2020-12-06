const Discord = require('discord.js');
const { mode, token, channels, confirmationThreshold, confirmationEmoji, trustedConfirmerRoles, blacklistedRole } = require('../config.json');
const db = require('./database');

const client = new Discord.Client();
client.once('ready', () => console.log('Ready!'));

let channelsMap;

if (mode === "dev") {
  client.on('message', message => message.react(confirmationEmoji));
  channelsMap = {};
  channelsMap['780159998151098378'] = '765940655939125299';
  channelsMap['784885854744084510'] = '784852416591953951';
} else {
  channelsMap = channels;
}

client.on('messageReactionAdd', async (reaction) => {
  if (listeningToChannel(reaction.message.channel.id)) {
    const shouldConfirm = await shouldConfirmMessage(reaction);
    if (shouldConfirm) {
      handleMessage(reaction.message);
    }
  }
});

client.login(token);

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
  if (dbMessages.length > 0) {
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
    await db('buff_messages').insert({
      message_id: reactionMessage.id
    });

    const buffRegex = RegExp(/onyxia|ony|nef|nefarian|hakkar|hoh|heart|rend/, 'gi');
    const timeRegex = RegExp(/\d{1,2}[:.]?\d{2}|\d{2}/, 'g');

    const buff = reactionMessage.content.match(buffRegex);
    const time = reactionMessage.content.match(timeRegex);

    if (!buff || !time) {
      return reactionMessage.reply('Your buff has not been confirmed because it was not properly formatted. It must contain a buff name and a timestamp. Please post a new message.');
    }

    const messageContent = formatMessage(buff[0], reactionMessage);

    if (['hakkar', 'hoh', 'heart'].includes(buff[0].toLowerCase())) {
      Object.values(channelsMap).forEach(async channel => {
        const outputChannel = reactionMessage.channel.guild.channels.cache.get(channel);
        const message = await outputChannel.send(messageContent);

        if (message.channel.type === 'news') {
          await message.crosspost();
        }
      })
    } else {
      const outputChannel = reactionMessage.channel.guild.channels.cache.get(channelsMap[reactionMessage.channel.id]);
      const message = await outputChannel.send(messageContent);

      if (message.channel.type === 'news') {
        await message.crosspost();
      }
    }
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
Confirrmed by: ${message.author}`;
}
