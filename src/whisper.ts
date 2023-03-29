import axios from 'axios';

export async function transcribe(audioFile: string): Promise<string> {
  // Implement your Whisper API call here
  // For example, using axios:
  const response = await axios.post('https://api.openai.com/v1/whisper/transcribe', {
    audio_file: audioFile,
  }, {
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
    },
  });

  return response.data.text;
}