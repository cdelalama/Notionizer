// main.ts
import { Bot, InputFile } from 'grammy';
import { createWriteStream, createReadStream, promises as fsPromises, unlink } from 'fs';
import { transcribe } from './whisper'; // Import your Whisper API wrapper here
import * as dotenv from 'dotenv';
import { video_basic_info, stream } from 'play-dl';
import { pipeline } from 'stream';

dotenv.config();

const bot = new Bot(process.env.BOT_TOKEN as string);

bot.command('start', (ctx) => ctx.reply('Welcome! Send me a YouTube URL and I will transcribe the video for you.'));

bot.on('message', async (ctx) => {
  if (ctx.message.text) {
    const url = ctx.message.text;
    console.log('URL received:', url);

    try {
      const videoInfo = await video_basic_info(url);
      console.log('Video info:', videoInfo);
      const videoDuration = videoInfo.video_details.durationInSec;

      if (videoDuration < 5400) {
        const audioStream = await stream(url, { quality: 0 }); // 0 represents the highest audio quality
        const audioFile = `./${videoInfo.video_details.id}.mp3`;
      
        pipeline(audioStream.stream, createWriteStream(audioFile), async (err) => {
          if (err) {
            ctx.reply('Error saving the audio. Please try again.');
            return;
          }
      
          // Send a message to the user indicating that the bot is processing the request
          await ctx.reply('Processing your request. This may take a few minutes, please wait...');
      
          try {
            const transcript = await transcribe(audioFile); // Use your Whisper API wrapper to transcribe the audio
            const transcriptFile = `./${videoInfo.video_details.id}_transcript.txt`;
      
            await fsPromises.writeFile(transcriptFile, transcript);
            await ctx.replyWithDocument(new InputFile(createReadStream(transcriptFile)));
      
            unlink(audioFile, () => {});
            unlink(transcriptFile, () => {});
          } catch (error) {
            ctx.reply('Error transcribing the audio. Please try again.');
          }
        });
      } else {
        ctx.reply('Videos for transcription are limited to 1.5 hours. Please provide a shorter video.');
      }
    } catch (error) {
      console.error('Error fetching the video:', error);
      ctx.reply('Error fetching the video. Please check the URL and try again.');
    }
  }
});

bot.catch((err) => console.error(err));

bot.start();