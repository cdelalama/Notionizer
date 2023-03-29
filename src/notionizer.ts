// main.ts
import { Bot, InputFile } from 'grammy';
import { YouTube } from 'youtube-sr';
import ytdl from 'ytdl-core';
import { createWriteStream, createReadStream, promises as fsPromises, unlink } from 'fs';
import { transcribe } from './whisper'; // Import your Whisper API wrapper here
import * as dotenv from 'dotenv';

dotenv.config();

const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN as string);

bot.command('start', (ctx) => ctx.reply('Welcome! Send me a YouTube URL and I will transcribe the video for you.'));

bot.on('message', async (ctx) => {
  if (ctx.message.text) {
    const url = ctx.message.text;

    try {
      const video = await YouTube.getVideo(url);
      console.log(video);
      console.log(video.duration);

      if (video.duration < 54000000) {
        const audioStream = ytdl(url, { filter: 'audioonly' });
        const audioFile = `./${video.id}.mp3`;

        audioStream.pipe(createWriteStream(audioFile)).on('finish', async () => {
          try {
            const transcript = await transcribe(audioFile); // Use your Whisper API wrapper to transcribe the audio
            const transcriptFile = `./${video.id}_transcript.txt`;

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
      ctx.reply('Error fetching the video. Please check the URL and try again.');
    }
  }
});

bot.catch((err) => console.error(err));

bot.start();