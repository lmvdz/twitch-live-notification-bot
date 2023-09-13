# twitch-live-notification-bot
Use ChatGPT to generate a tweet for when you go live on Twitch, and also send a message to discord

# General Information

The bot will first check and only work if the twitch channel is live
Uses OPENAI ChatGPT API to generate the tweet text
Adds a gif using GIPHY api
Sends the tweet to Twitter using API
Sends an message to discord channel

# Arguments

`--twitch` the twitch channel ( .env optional )
`--game` the game being played ( required )
`--useGiphy` should the tweet include a gif ( default: true )
`--giphy` the gif to search ( default: same as game )
`--giphyOffset` the offset of the search ( default: 0 )
`--twitter` the twitter user name ( .env optional )
`--onlyNotifyIfLive` only post on twitter/discord if live on twitch ( default: true )
`--discord` the discord channel id to post to ( .env optional )
`--mentionEveryone` mention @everyone in discord ( default: true )

# Setup

create `.env` file in project root

```env

# required twitch channel name or --twitch
TWITCH_CHANNEL=

# openai api key required for generating tweet
OPENAI_API_KEY=

# giphy api key
GIPHY_API_KEY=

# twitter user or --twitter
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
# discord channel id or --discord
DISCORD_CHANNEL_ID=


```

# Build
`npm install`
`npm run build`

# Run

`npm run start -- --game="Rocket League" --mentionEveryone=false`  
  
`npm run start -- --game="Rocket League" --giphy="Gamer" --giphyOffset=0 --twitter=Lmvdzande --twitch=Lmvdzande --discord=762072595917963296`  
  
`npm run start -- --game="Rocket League" --useGiphy=false --prompt="Create a going live on twitch tweet for the Lmvdzande channel using https://twitch.tv/Lmvdzande as the twich channel url. The game that is being played is Rocket League. The tweet must be less than 250 characters."` 
