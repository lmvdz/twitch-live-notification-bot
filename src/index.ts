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
const args = yargs(process.argv.slice(2)).argv as unknown as { twitch?: string, game: string, giphy?: string, giphyOffset?: string, twitter?: string, discord?: string, prompt?: string }

const twitchChannel = args["twitch"] as string || process.env.TWITCH_CHANNEL
const game = args["game"]
const giphySearch = args["giphy"] ? args["giphy"] : game
const giphyOffset = args["giphyOffset"] ? args["giphyOffset"] : 0
const twitterUser = args["twitter"] ? args["twitter"] : process.env.TWITTER_USER
const discord = args["discord"] ? args["discord"] : process.env.DISCORD_CHANNEL_ID
const prompt = args["prompt"] ? args["prompt"] : `Create a unique and expressive tweet with newlines for going live on twitch using ${twitchChannel} as the channel and ${game} as the game and https://twitch.tv/${twitchChannel} as the channel link. Must be less than 250 characters`

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
        console.log(`${twitchChannel} is not live!`)
        process.exit()
    }
} else {
    console.error('no --twitchChannel or TWITCH_CHANNEL found')
}


/**
 * POST TO TWITTER
 */
if (twitterUser) {
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

        /** UTLITY: Get the GIF from Giphy */
        const getGIF = async (query: string, offset: string | number) => {
            const url = `https://api.giphy.com/v1/gifs/search?api_key=uJKhh5fLXqJWJluguGo3e4bQUGYLop0o&q=${query.split(" ").join("+")}&limit=25&offset=${offset}&rating=g&lang=en&bundle=messaging_non_clips`
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
        const id = await rwTwitterClient.v1.uploadMedia('./gif.gif');

        /** Create the tweet */

        const tweetPostResult = await rwTwitterClient.v2.tweet({
            media: {
                media_ids: [id]
            },
            text: chatgptTweet.text
        } as SendTweetV2Params);

        console.log(`sent tweet https://twitter.com/${twitterUser}/status/${tweetPostResult.data.id}`)
    } catch (error) {
        console.error('failed to post to twitter');
        console.error(error);
    }

} else {
    console.log(`no --twitter or TWITTER_USER found`)
}

/**
 * POST TO DISCORD
 */
if (discord) {
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
            embed.setTitle(`${twitchChannel} is now live on Twitch!`);
            embed.setDescription(`**[Watch the stream](https://twitch.tv/${twitchChannel})**`);
            embed.setColor(0x6441A4);
            embed.setThumbnail(twitchChannelData.thumbnail_url);
            embed.addFields(...[
                { name: "Title", value: twitchChannelData.title } as APIEmbedField,
                { name: "Viewers", value: twitchChannelData.viewer_count } as APIEmbedField
            ]);
            (client.channels.cache.get(process.env.DISCORD_CHANNEL_ID!) as TextChannel).send({ embeds: [embed] })
            console.log(`sent message to discord`)

            await client.destroy()
        });
    } catch (error) {
        console.error("failed to post to discord")
        console.error(error)
    }
} else {
    console.log(`no --discord or DISCORD_CHANNEL_ID found`)
}




