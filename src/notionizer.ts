import { Bot, InputFile } from 'grammy';
import { createWriteStream, createReadStream, promises as fsPromises, unlink } from 'fs';
import { pipeline } from 'stream';
import ytdl from 'ytdl-core-discord';
import ffmpeg from 'fluent-ffmpeg';
import { transcribe } from './whisper';
import dotenv from 'dotenv';

dotenv.config();
const BOT_TOKEN = process.env.BOT_TOKEN;

const bot = new Bot(BOT_TOKEN!);

async function splitAudioFile(inputFile: string, duration: number, chunkDuration: number): Promise<string[]> {
  const chunkCount = Math.ceil(duration / chunkDuration);
  const outputFiles: string[] = []; // Explicitly specify the type as string[]

  for (let i = 0; i < chunkCount; i++) {
    const outputFile = `${inputFile}_chunk_${i}.mp3`;
    outputFiles.push(outputFile);

    await new Promise<void>((resolve, reject) => {
      ffmpeg(inputFile)
        .setStartTime(i * chunkDuration)
        .setDuration(chunkDuration)
        .output(outputFile)
        .on('end', () => resolve())
        .on('error', (err: Error) => reject(err))
        .run();
    });
  }

  return outputFiles;
}

bot.on('message', async (ctx) => {
  try {
    if (!ctx.message || !ctx.message.text) {
      return; // Ignore non-text messages
    }

    const videoUrl = ctx.message.text;

    if (!videoUrl || !ytdl.validateURL(videoUrl)) {
      // Do nothing if the message is not a valid YouTube video URL
      return;
    }

    const videoInfo = await ytdl.getInfo(videoUrl);
    const videoDuration = parseInt(videoInfo.videoDetails.lengthSeconds);
    const audioStream = await ytdl(videoUrl, { quality: 'highestaudio', filter: 'audioonly' });    const audioFile = `./${videoInfo.videoDetails.videoId}.mp3`;

    pipeline(audioStream, createWriteStream(audioFile), async (err) => {
      if (err) {
        await ctx.reply('Error saving the audio. Please try again.');
        return;
      }

      // Send a message to the user indicating that the bot is processing the request
      await ctx.reply('Processing your request. This may take a few minutes, please wait...');

      try {
        const chunkDuration = 300; // 5 minutes
        const audioChunks = await splitAudioFile(audioFile, videoDuration, chunkDuration);
        const transcripts = await Promise.all(audioChunks.map((chunk) => transcribe(chunk)));

        const combinedTranscript = transcripts.join('\n');
        const transcriptFile = `./${videoInfo.videoDetails.videoId}_transcript.txt`;

        await fsPromises.writeFile(transcriptFile, combinedTranscript);
        await ctx.replyWithDocument(new InputFile(createReadStream(transcriptFile)));

        // Clean up the files
        unlink(audioFile, () => {});
        unlink(transcriptFile, () => {});
        audioChunks.forEach((chunk) => unlink(chunk, () => {}));
      } catch (error) {
        ctx.reply('Error transcribing the audio. Please try again.');
      }
    });
  } catch (error) {
    console.error('Error in the message event handler:', error);
    await ctx.reply('An error occurred. Please try again.');
  }
});

bot.start();