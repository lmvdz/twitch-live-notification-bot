# twitch-live-notification-bot
Use ChatGPT to generate a tweet for when you go live on Twitch and also send a message to discord

# General Information

The bot will first check and only work if the twitch channel is live
Uses OPENAI ChatGPT API to generate the tweet text
Adds a gif using GIPHY api
Sends the tweet to Twitter using API
Sends an message to discord channel

# Arguments

`--game` the game being played ( required )
`--useGiphy` should the tweet include a gif ( default: true )
`--giphy` the gif to search ( default: same as game )
`--giphyOffset` the offset of the search ( default: 0 )
`--onlyNotifyIfLive` only post on twitter/discord if live on twitch ( default: true )
`--mentionEveryone` mention @everyone in discord ( default: true )

# Setup

create `.env` file in project root

```env

# required twitch channel name
TWITCH_CHANNEL=

# openai api key required for generating tweet
OPENAI_API_KEY=

# giphy api key
GIPHY_API_KEY=

# twitter user
TWITTER_USER=

# for twitter api you need to have read/write enabled
TWITTER_API_KEY=
TWITTER_API_KEY_SECRET=

# twitter access token required (should be your twitter user's access token)
TWITTER_ACCESS_TOKEN=
TWITTER_ACCESS_SECRET=

# twitch api client credential auth https://dev.twitch.tv/console/apps
TWITCH_CLIENT_ID=
TWITCH_CLIENT_SECRET=

# discord bot access token https://discord.com/developers/applications

# permissions id required = 223232
DISCORD_BOT_TOKEN=

# discord channel id
DISCORD_CHANNEL_ID=

DEFAULT_PROMPT='Create a unique and expressive tweet with newlines for going live on twitch using ${twitch} as the channel and ${game} as the game and https://twitch.tv/${twitch} as the channel link. Must be less than 250 characters'


```

# Build
`npm install`
`npm run build`

# Run

> will create a tweet and post in discord if the twitch user defined in the .env file is live
`npm run start -- --game="Rocket League" --mentionEveryone=false`  
  
> will create a tweet and post in discord to @everyone on the specified channel using a gif search on "Gamer" 
`npm run start -- --game="Rocket League" --giphy="Gamer" --giphyOffset=0 --discord=762072595917963296`  
  
> will create a tweet without a gif and post in discord to @everyone with a custom chatgpt prompt to generate the tweet.
`npm run start -- --game="Rocket League" --useGiphy=false --prompt="Create a going live on twitch tweet for the ${twitch} channel using https://twitch.tv/${twitch} as the twich channel url. The game that is being played is ${game}. The tweet must be less than 250 characters."` 
