import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const config = {
  telegram: {
    token: process.env.TELEGRAM_BOT_TOKEN || '',
    allowedUsers: (process.env.TELEGRAM_ALLOWED_USER_IDS || '').split(',').map((id) => parseInt(id.trim(), 10)).filter((id) => !isNaN(id)),
  },
  groq: {
    apiKey: process.env.GROQ_API_KEY || '',
    chatModel: process.env.GROQ_CHAT_MODEL || 'llama-3.3-70b-versatile',
    transcriptionModel: process.env.GROQ_TRANSCRIPTION_MODEL || 'whisper-large-v3-turbo',
  },
  db: {
    url: process.env.DATABASE_URL || path.join(__dirname, '../../data/database.sqlite'),
  },
  logLevel: process.env.LOG_LEVEL || 'info',
  isDev: process.env.NODE_ENV !== 'production',
};

// Validations
if (!config.telegram.token) console.warn('Warning: TELEGRAM_BOT_TOKEN is not set.');
if (!config.groq.apiKey) console.warn('Warning: GROQ_API_KEY is not set.');
