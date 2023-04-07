"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
// main.ts
const grammy_1 = require("grammy");
const fs_1 = require("fs");
const whisper_1 = require("./whisper"); // Import your Whisper API wrapper here
const dotenv = __importStar(require("dotenv"));
const play_dl_1 = require("play-dl");
const stream_1 = require("stream");
dotenv.config();
const bot = new grammy_1.Bot(process.env.BOT_TOKEN);
bot.command('start', (ctx) => ctx.reply('Welcome! Send me a YouTube URL and I will transcribe the video for you.'));
bot.on('message', (ctx) => __awaiter(void 0, void 0, void 0, function* () {
    if (ctx.message.text) {
        const url = ctx.message.text;
        console.log('URL received:', url);
        try {
            const videoInfo = yield (0, play_dl_1.video_basic_info)(url);
            console.log('Video info:', videoInfo);
            const videoDuration = videoInfo.video_details.durationInSec;
            if (videoDuration < 5400) {
                const audioStream = yield (0, play_dl_1.stream)(url, { quality: 0 }); // 0 represents the highest audio quality
                const audioFile = `./${videoInfo.video_details.id}.mp3`;
                (0, stream_1.pipeline)(audioStream.stream, (0, fs_1.createWriteStream)(audioFile), (err) => __awaiter(void 0, void 0, void 0, function* () {
                    if (err) {
                        ctx.reply('Error saving the audio. Please try again.');
                        return;
                    }
                    // Send a message to the user indicating that the bot is processing the request
                    yield ctx.reply('Processing your request. This may take a few minutes, please wait...');
                    try {
                        const transcript = yield (0, whisper_1.transcribe)(audioFile); // Use your Whisper API wrapper to transcribe the audio
                        const transcriptFile = `./${videoInfo.video_details.id}_transcript.txt`;
                        yield fs_1.promises.writeFile(transcriptFile, transcript);
                        yield ctx.replyWithDocument(new grammy_1.InputFile((0, fs_1.createReadStream)(transcriptFile)));
                        (0, fs_1.unlink)(audioFile, () => { });
                        (0, fs_1.unlink)(transcriptFile, () => { });
                    }
                    catch (error) {
                        ctx.reply('Error transcribing the audio. Please try again.');
                    }
                }));
            }
            else {
                ctx.reply('Videos for transcription are limited to 1.5 hours. Please provide a shorter video.');
            }
        }
        catch (error) {
            console.error('Error fetching the video:', error);
            ctx.reply('Error fetching the video. Please check the URL and try again.');
        }
    }
}));
bot.catch((err) => console.error(err));
bot.start();
