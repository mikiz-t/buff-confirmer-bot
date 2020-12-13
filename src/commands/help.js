const config = require('../../config.json');

module.exports = {
  response:`To confirm a buff please post a message that contains a **buff name** and the **time** you will pop it. Then ${config.confirmationThreshold} users must react with ${config.confirmationEmoji} to confirm it.
To cancel a buff, react to your message (or the confirmation message) with ❌.

These buff names are accepted: onyxia, ony, nefarian, nef, hakkar, hoh, heart, rend
These time formats are accepted: 1900, 19.00, 19:00, 19`,
  execute(message) {
    const res = `${message.mentions.users.first() || ''} ${this.response}`;
    message.channel.send(res);
  }
}