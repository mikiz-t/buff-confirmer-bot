# Buff confirmer bot

## Requirements

- Nodejs 12.0.0 or newer
- sqlite3

## Set up

Do the following

```
npm install
npm run migrate
cp config.json.example config.json
```

Add your bot token and configure any other settings in `config.json`. For the channels: the key is the "input" channel and the value is the "output" channel.

Start the bot with `npm run start`

The bot does not require any permissions except to be able to read, send and manage messages in the configured channels.