"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const grammy_1 = require("grammy");
const fs_1 = require("fs");
const stream_1 = require("stream");
const ytdl_core_1 = __importDefault(require("ytdl-core"));
const fluent_ffmpeg_1 = __importDefault(require("fluent-ffmpeg"));
const whisper_1 = require("./whisper");
const BOT_TOKEN = 'YOUR_BOT_TOKEN';
const bot = new grammy_1.Bot(BOT_TOKEN);
function splitAudioFile(inputFile, duration, chunkDuration) {
    return __awaiter(this, void 0, void 0, function* () {
        const chunkCount = Math.ceil(duration / chunkDuration);
        const outputFiles = [];
        for (let i = 0; i < chunkCount; i++) {
            const outputFile = `${inputFile}_chunk_${i}.mp3`;
            outputFiles.push(outputFile);
            yield new Promise((resolve, reject) => {
                (0, fluent_ffmpeg_1.default)(inputFile)
                    .setStartTime(i * chunkDuration)
                    .setDuration(chunkDuration)
                    .output(outputFile)
                    .on('end', () => resolve())
                    .on('error', (err) => reject(err)) // Specify the type of 'err' as 'Error'
                    .run();
            });
        }
        return outputFiles;
    });
}
bot.command('transcribe', (ctx) => __awaiter(void 0, void 0, void 0, function* () {
    if (!ctx.message) {
        yield ctx.reply('Error: Message is undefined.');
        return;
    }
    const videoUrl = ctx.message.text.split(' ')[1];
    if (!videoUrl || !ytdl_core_1.default.validateURL(videoUrl)) {
        yield ctx.reply('Please provide a valid YouTube video URL.');
        return;
    }
    const videoInfo = yield ytdl_core_1.default.getInfo(videoUrl);
    const videoDuration = parseInt(videoInfo.videoDetails.lengthSeconds);
    const audioStream = (0, ytdl_core_1.default)(videoUrl, { quality: 'highestaudio', filter: 'audioonly' });
    const audioFile = `./${videoInfo.videoDetails.videoId}.mp3`;
    (0, stream_1.pipeline)(audioStream, (0, fs_1.createWriteStream)(audioFile), (err) => __awaiter(void 0, void 0, void 0, function* () {
        if (err) {
            yield ctx.reply('Error saving the audio. Please try again.');
            return;
        }
        // Send a message to the user indicating that the bot is processing the request
        yield ctx.reply('Processing your request. This may take a few minutes, please wait...');
        try {
            const chunkDuration = 300; // 5 minutes
            const audioChunks = yield splitAudioFile(audioFile, videoDuration, chunkDuration);
            const transcripts = yield Promise.all(audioChunks.map((chunk) => (0, whisper_1.transcribe)(chunk)));
            const combinedTranscript = transcripts.join('\n');
            const transcriptFile = `./${videoInfo.videoDetails.videoId}_transcript.txt`;
            yield fs_1.promises.writeFile(transcriptFile, combinedTranscript);
            yield ctx.replyWithDocument(new grammy_1.InputFile((0, fs_1.createReadStream)(transcriptFile)));
            // Clean up the files
            (0, fs_1.unlink)(audioFile, () => { });
            (0, fs_1.unlink)(transcriptFile, () => { });
            audioChunks.forEach((chunk) => (0, fs_1.unlink)(chunk, () => { }));
        }
        catch (error) {
            ctx.reply('Error transcribing the audio. Please try again.');
        }
    }));
}));
bot.start();
