import axios from 'axios';
import { createReadStream } from 'fs';
import FormData from 'form-data';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

export async function transcribe(audioFile: string): Promise<string> {
  const formData = new FormData();
  formData.append('audio_file', createReadStream(audioFile));

  const response = await axios.post(
    'https://api.openai.com/v1/whisper/transcribe',
    formData,
    {
      headers: {
        'Content-Type': `multipart/form-data; boundary=${formData.getBoundary()}`,
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
    }
  );

  return response.data.transcript;
}