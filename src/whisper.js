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
exports.transcribe = void 0;
// whisper.ts
const axios_1 = __importDefault(require("axios"));
const fs_1 = require("fs");
const form_data_1 = __importDefault(require("form-data"));
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
function transcribe(audioFile) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const formData = new form_data_1.default();
            formData.append('audio_file', (0, fs_1.createReadStream)(audioFile));
            const response = yield axios_1.default.post('https://api.openai.com/v1/whisper/transcribe', formData, {
                headers: {
                    'Content-Type': `multipart/form-data; boundary=${formData.getBoundary()}`,
                    Authorization: `Bearer ${OPENAI_API_KEY}`,
                },
            });
            return response.data.transcript;
        }
        catch (error) {
            console.error('Error in transcribe function:', error);
            throw error;
        }
    });
}
exports.transcribe = transcribe;
