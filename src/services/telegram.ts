import { Telegraf } from 'telegraf';
import { message } from 'telegraf/filters';
import { config } from '../config';
import { logger } from '../utils/logger';
import { handleUserMessage, handleCommandStart, handleCommandHelp, handleCommandStatus, handleCommandMemory, handleCommandClear } from '../bot/handlers';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { openaiService } from './openai'; // Para transcribir audio que venga desde la URL directamente si se descarga

if (!config.telegram.token) {
  throw new Error('TELEGRAM_BOT_TOKEN must be provided!');
}

export const bot = new Telegraf(config.telegram.token);

// Middleware for authorization
bot.use(async (ctx, next) => {
  const userId = ctx.from?.id;
  if (!userId) {
    return;
  }
  
  if (config.telegram.allowedUsers.length > 0 && !config.telegram.allowedUsers.includes(userId)) {
    logger.warn(`Unauthorized access attempt by user ID: ${userId}`);
    await ctx.reply('Lo siento, no estás autorizado para usar este bot.');
    return;
  }
  
  return next();
});

// Basic Commands
bot.command('start', handleCommandStart);
bot.command('help', handleCommandHelp);
bot.command('status', handleCommandStatus);
bot.command('memory', handleCommandMemory);
bot.command('clear', handleCommandClear);

// Text Messages
bot.on(message('text'), async (ctx) => {
  const text = ctx.message.text;
  const userId = ctx.from.id.toString();
  await handleUserMessage(ctx, userId, text);
});

// Voice and Audio Messages
bot.on([message('voice'), message('audio')], async (ctx) => {
  const userId = ctx.from.id.toString();
  
  try {
    const fileId = 'voice' in ctx.message ? ctx.message.voice.file_id : ctx.message.audio.file_id;
    const fileLink = await ctx.telegram.getFileLink(fileId);
    
    await ctx.sendChatAction('typing');
    // Download the file
    const tempFilePath = path.join(os.tmpdir(), `${fileId}.ogg`);
    
    // Native fetch wrapper to download and save locally
    const response = await fetch(fileLink.toString());
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const arrayBuffer = await response.arrayBuffer();
    fs.writeFileSync(tempFilePath, Buffer.from(arrayBuffer));
    
    // Transcribe
    const transcript = await openaiService.transcribeAudio(tempFilePath);
    
    // Clean up temp file
    fs.unlinkSync(tempFilePath);
    
    if (!transcript.trim()) {
      await ctx.reply('No he podido entender el audio, ¿puedes repetirlo?');
      return;
    }
    
    // Process as text message
    await ctx.reply(`🎙️ _Transcripción:_ ${transcript}`, { parse_mode: 'Markdown' });
    await handleUserMessage(ctx, userId, transcript);
    
  } catch (error) {
    logger.error('Error procesando audio:', error);
    await ctx.reply('Ups, hubo un problema al procesar ese audio.');
  }
});

// Error handling
bot.catch((err, ctx) => {
  logger.error(`Error for ${ctx.updateType}`, err);
});

export const startBot = () => {
  bot.launch();
  logger.info('🤖 Bot is running...');
};

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
