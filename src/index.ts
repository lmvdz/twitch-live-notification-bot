import { SendTweetV2Params, TwitterApi, TwitterApiTokens } from 'twitter-api-v2';
import { config } from 'dotenv'
import axios from 'axios'
import fs from 'fs'
import { ChatGPTAPI } from 'chatgpt'
import { APIEmbedField, Client, EmbedBuilder, GatewayIntentBits, TextChannel } from 'discord.js';
import yargs from 'yargs'

/** LOAD ENV */
config();

/** PARSE ARGUMENTS */
const args = yargs(process.argv.slice(2)).argv as unknown as { 
    twitch?: string, 
    game: string, 
    useGiphy?: string,
    giphy?: string,
    giphyOffset?: string, 
    twitter?: string, 
    onlyNotifyIfLive?: string,
    discord?: string, 
    mentionEveryone?: string, 
    prompt?: string 
}

const twitchChannel = args["twitch"] ? args["twitch"] : process.env.TWITCH_CHANNEL
const game = args["game"]
if (game === undefined) {
    console.error("please supply a --game")
    process.exit()
}
const useGiphy = args['useGiphy'] ? args['useGiphy'] === "true" : true
const giphySearch = args["giphy"] ? args["giphy"] : game
const giphyOffset = args["giphyOffset"] ? args["giphyOffset"] : 0
const twitterUser = args["twitter"] ? args["twitter"] : process.env.TWITTER_USER
const onlyNotifyIfLive = args["onlyNotifyIfLive"] ? args["onlyNotifyIfLive"] === 'true' : true
const discord = args["discord"] ? args["discord"] : process.env.DISCORD_CHANNEL_ID
const mentionEveryone = args["mentionEveryone"] ? args["mentionEveryone"] === 'true' : true

const promptArguments = {
    twitch: twitchChannel, 
    game: game, 
    useGiphy: useGiphy,
    giphy: giphySearch,
    giphyOffset: giphyOffset, 
    twitter: twitterUser, 
    discord: discord, 
    mentionEveryone: mentionEveryone, 
}


const prompt = (() => { 
    let regexMatch = /\$\{([a-zA-Z0-9\-\_\|]+)\}/gm;
    let prompt = args["prompt"] ? args["prompt"] : process.env.DEFAULT_PROMPT!;
    let matches = prompt.match(regexMatch);
    if (matches !== null) {
        matches.forEach(function (match) {           
            let value = (promptArguments as any)[match.substr(2, match.length - 3)];
            prompt = prompt.replace(match, value);
        })
    }
    return prompt
})();

let twitchChannelData: any = undefined;

if (twitchChannel) {
    /** Get Twitch Channel Data  */
    twitchChannelData = (await axios.get(`https://api.twitch.tv/helix/streams?user_login=${twitchChannel}`, {
        headers: {
            'Authorization': `Bearer ${(await axios.post(`https://id.twitch.tv/oauth2/token?client_id=${process.env.TWITCH_CLIENT_ID}&client_secret=${process.env.TWITCH_CLIENT_SECRET}&grant_type=client_credentials`)).data.access_token}`,
            'Client-Id': process.env.TWITCH_CLIENT_ID
        }
    })).data.data[0]

    if (twitchChannelData === undefined) {
        console.warn(`WARNING: ${twitchChannel} is not live!`)
    }
} else {
    console.error('no --twitchChannel or TWITCH_CHANNEL found')
}


/**
 * POST TO TWITTER
 */
if (twitterUser) {
    if (onlyNotifyIfLive && twitchChannelData !== undefined) {
        try {
            /** CONNECT CHATGPT */
            const api = new ChatGPTAPI({
                apiKey: process.env.OPENAI_API_KEY!,
                completionParams: {
                    model: "gpt-4"
                }
            })
    
            /** Ask ChatGPT to create the Tweet */
            const chatgptTweet = await api.sendMessage(prompt);
    
            /** CONNECT TWITTER */
            const twitterClient = new TwitterApi({
                appKey: process.env.TWITTER_API_KEY,
                appSecret: process.env.TWITTER_API_KEY_SECRET,
                accessToken: process.env.TWITTER_ACCESS_TOKEN,
                accessSecret: process.env.TWITTER_ACCESS_SECRET
            } as TwitterApiTokens);
    
            /** Allow Twitter Client to Read and Write */
            const rwTwitterClient = twitterClient.readWrite;
    
            let gifID: any = undefined
    
            if (useGiphy) {
                /** UTLITY: Get the GIF from Giphy */
                const getGIF = async (query: string, offset: string | number) => {
                    const url = `https://api.giphy.com/v1/gifs/search?api_key=${process.env.GIPHY_API_KEY}&q=${query.split(" ").join("+")}&limit=25&offset=${offset}&rating=g&lang=en&bundle=messaging_non_clips`
                    return (await axios.get(url)).data
                }
    
                /** Search for the gif */
                const gifSearch = await getGIF(giphySearch, giphyOffset)
    
                /** Fetch the gif */
                const gif = (await axios.get('https://i.giphy.com/media/' + gifSearch.data[0].id + "/giphy.gif", {
                    responseType: "text",
                    responseEncoding: "base64",
                })).data
    
                /** Download the gif */
                fs.writeFileSync('./gif.gif', gif, { encoding: "base64" })
    
                /** Upload the gif to Twitter */
                gifID = await rwTwitterClient.v1.uploadMedia('./gif.gif');
            }
    
            
    
            /** Create the tweet */
    
            let text = chatgptTweet.text.trim();
            if (text.startsWith("\"")) {
                text = text.substring(1)
            }

            if (text.endsWith("\"")) {
                text = text.substring(0, text.length - 2)
            }

            console.log(text)
    
            let tweetPayload = {
                text: text
            } as SendTweetV2Params
    
            if (gifID) {
                tweetPayload.media = {
                    media_ids: [gifID]
                }
            }
    
            const tweetPostResult = await rwTwitterClient.v2.tweet(tweetPayload);
    
            console.log(`sent tweet https://twitter.com/${twitterUser}/status/${tweetPostResult.data.id}`)
        } catch (error) {
            console.error('failed to post to twitter');
            console.error(error);
        }
    } else {
        console.log(`${twitchChannel} is not live, will not post tweet`)
    }
} else {
    console.log(`no --twitter or TWITTER_USER found`)
}

/**
 * POST TO DISCORD
 */
if (discord) {
    if (onlyNotifyIfLive && twitchChannelData !== undefined) {
        try {
            /** CONNECT DISCORD */
            const client = new Client({
                intents: [GatewayIntentBits.Guilds, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMessages]
            });
    
            /** DISCORD LOGIN */
            await client.login(process.env.DISCORD_BOT_TOKEN!)
    
            /** SEND TWITCH LIVE EMBED WHEN READY */
            client.on('ready', async (client) => {
                await client.channels.fetch(process.env.DISCORD_CHANNEL_ID!);
                const embed = new EmbedBuilder();
                embed.setTitle(`${twitchChannel} is${twitchChannelData ? ' now live ' : ' '}on Twitch!`);
                embed.setDescription(`**[${twitchChannelData ? 'Watch the stream' : 'Check out the channel'}](https://twitch.tv/${twitchChannel})** ${mentionEveryone ? '@everyone' : ''}`);
                embed.setColor(0x6441A4);
                if (twitchChannelData) {
                    embed.setThumbnail(twitchChannelData.thumbnail_url);
                    embed.addFields(...[
                        { name: "Game", value: game } as APIEmbedField,
                        { name: "Title", value: twitchChannelData.title } as APIEmbedField,
                        { name: "Viewers", value: twitchChannelData.viewer_count } as APIEmbedField
                    ]);
                }
                (client.channels.cache.get(process.env.DISCORD_CHANNEL_ID!) as TextChannel).send({ embeds: [embed] })
                console.log(`sent message to discord`)
    
                await client.destroy()
            });
        } catch (error) {
            console.error("failed to post to discord")
            console.error(error)
        }
    } else {
        console.log(`${twitchChannel} is not live, will not post discord message`)
    }
} else {
    console.log(`no --discord or DISCORD_CHANNEL_ID found`)
}




