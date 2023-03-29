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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// main.ts
const grammy_1 = require("grammy");
const youtube_sr_1 = require("youtube-sr");
const ytdl_core_1 = __importDefault(require("ytdl-core"));
const fs_1 = require("fs");
const whisper_1 = require("./whisper"); // Import your Whisper API wrapper here
const dotenv = __importStar(require("dotenv"));
dotenv.config();
const bot = new grammy_1.Bot(process.env.TELEGRAM_BOT_TOKEN);
bot.command('start', (ctx) => ctx.reply('Welcome! Send me a YouTube URL and I will transcribe the video for you.'));
bot.on('message', (ctx) => __awaiter(void 0, void 0, void 0, function* () {
    if (ctx.message.text) {
        const url = ctx.message.text;
        try {
            const video = yield youtube_sr_1.YouTube.getVideo(url);
            console.log(video);
            console.log(video.duration);
            if (video.duration < 54000000) {
                const audioStream = (0, ytdl_core_1.default)(url, { filter: 'audioonly' });
                const audioFile = `./${video.id}.mp3`;
                audioStream.pipe((0, fs_1.createWriteStream)(audioFile)).on('finish', () => __awaiter(void 0, void 0, void 0, function* () {
                    try {
                        const transcript = yield (0, whisper_1.transcribe)(audioFile); // Use your Whisper API wrapper to transcribe the audio
                        const transcriptFile = `./${video.id}_transcript.txt`;
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
            ctx.reply('Error fetching the video. Please check the URL and try again.');
        }
    }
}));
bot.catch((err) => console.error(err));
bot.start();
