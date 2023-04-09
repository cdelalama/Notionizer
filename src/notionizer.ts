import { Bot, InputFile, Context } from 'grammy';

import { createWriteStream, createReadStream, promises as fsPromises, unlink } from 'fs';
import { video_info, stream } from 'play-dl';
import ffmpeg from 'fluent-ffmpeg';
import { transcribe } from './whisper';
import dotenv from 'dotenv';

dotenv.config();
const BOT_TOKEN = process.env.BOT_TOKEN;

const bot = new Bot(BOT_TOKEN!);

async function splitAudioFile(inputFile: string, duration: number, chunkDuration: number, ctx: Context): Promise<string[]> {
  const chunkCount = Math.ceil(duration / chunkDuration);
  const outputFiles: string[] = [];

  try {
    for (let i = 0; i < chunkCount; i++) {
      const outputFile = `${inputFile}_chunk_${i}.mp3`;
      outputFiles.push(outputFile);

      try {
        await new Promise<void>((resolve, reject) => {
          ffmpeg(inputFile)
            .setStartTime(i * chunkDuration)
            .setDuration(chunkDuration)
            .output(outputFile)
            .on('end', () => {
              const message = `Added chunk ${i + 1} of ${chunkCount}.`;
              console.log(message);
              ctx.reply(message);
              resolve();
            })
            .on('error', (err: Error) => reject(err))
            .run();
        });
      } catch (err) {
        console.error(`Error processing chunk ${i}:`, err);
        outputFiles.forEach((file) => unlink(file, () => {}));
        throw err;
      }
    }
  } catch (err) {
    console.error('Error splitting audio file:', err);
    throw err;
  }

  return outputFiles;
}


bot.on('message', async (ctx) => {
  try {
    if (!ctx.message || !ctx.message.text) {
      return;
    }

    const videoUrl = ctx.message.text;

    if (!videoUrl || !(await video_info(videoUrl))) {
      return;
    }

    const videoInfo = await video_info(videoUrl);
    const videoDuration = videoInfo.video_details.durationInSec;

    const highestQualityAudioFormat = videoInfo.format
      .filter((format) => format.mimeType?.startsWith('audio/'))
      .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))[0];

    console.log('Highest quality audio format:', highestQualityAudioFormat);
    
    const audioStream = await stream(videoUrl, { quality: highestQualityAudioFormat.itag });
    
    console.log('Audio stream:', audioStream);

    const audioFile = `./${videoInfo.video_details.id}.mp3`;

    const writeStream = createWriteStream(audioFile);

    audioStream.stream
      .on('data', (chunk) => {
        writeStream.write(chunk);
      })
      .on('end', async () => {
        writeStream.end();

        // Send a message to the user indicating that the bot is processing the request
        await ctx.reply('Processing your request. This may take a few minutes, please wait...');

        try {
          const chunkDuration = 300; // 5 minutes
          const audioChunks = await splitAudioFile(audioFile, videoDuration, chunkDuration, ctx);
          console.log('Finished splitting the audio file into chunks.');
          const transcripts = await Promise.all(audioChunks.map((chunk) => transcribe(chunk)));
          console.log('Finished transcribing all audio chunks.');

          const combinedTranscript = transcripts.join('\n');
          const transcriptFile = `./${videoInfo.video_details.id}_transcript.txt`;

          await fsPromises.writeFile(transcriptFile, combinedTranscript);
          await ctx.replyWithDocument(new InputFile(createReadStream(transcriptFile)));
          console.log('Transcript document sent to user.');

          // Clean up the files
          unlink(audioFile, () => {});
          unlink(transcriptFile, () => {});
          audioChunks.forEach((chunk) => unlink(chunk, () => {}));
          console.log('Finished cleaning up files.');
        } catch (error) {
          console.error('Error transcribing the audio:', error);
          ctx.reply('Error transcribing the audio. Please try again.');
        }
      })
      .on('error', async (err) => {
        console.error('Error saving the audio stream:', err);
        await ctx.reply('Error saving the audio. Please try again.');
      });
  } catch (error) {
    console.error('Error in the message event handler:', error);
    await ctx.reply('An error occurred. Please try again.');
  }
});

         
bot.command('test', (ctx) => ctx.reply('Hello, world!'));


bot.start();
