import { Context } from 'telegraf';
import { processMessage } from '../services/memory';
import { dbQueries } from '../db/queries';
import { logger } from '../utils/logger';

export const handleUserMessage = async (ctx: Context, userId: string, text: string) => {
    try {
        await ctx.sendChatAction('typing');
        const response = await processMessage(userId, text);
        await ctx.reply(response, { parse_mode: 'Markdown' });
    } catch (err: any) {
        logger.error('Error handling user message:', err?.message || err);
        if (err?.response?.data) console.error('API Response Data:', JSON.stringify(err.response.data, null, 2));
        await ctx.reply('Ha ocurrido un error procesando tu mensaje.');
    }
};

export const handleCommandStart = async (ctx: Context) => {
    const userId = ctx.from?.id.toString();
    if (userId) {
        dbQueries.createConversation(userId);
    }
    await ctx.reply(`¡Hola! Soy tu asistente personal con IA. Estoy listo para ayudarte con texto y notas de voz.\nUsa /help para ver lo que puedo hacer.`);
};

export const handleCommandHelp = async (ctx: Context) => {
    await ctx.reply(`Comandos disponibles:\n/start - Iniciar el bot\n/help - Mostrar este mensaje\n/status - Ver el estado del bot\n/memory - Ver los recuerdos guardados sobre ti\n/clear - Borrar todo el historial y recuerdos`);
};

export const handleCommandStatus = async (ctx: Context) => {
    await ctx.reply('Estado: En línea y funcionando perfectamente. 🚀');
};

export const handleCommandMemory = async (ctx: Context) => {
    const userId = ctx.from?.id.toString();
    if (!userId) return;
    
    const memories = dbQueries.getUserMemories(userId);
    if (memories.length === 0) {
        await ctx.reply('Todavía no he guardado ningún recuerdo importante sobre ti.');
        return;
    }
    
    const memoryText = memories.map((m, i) => `${i + 1}. ${m.content}`).join('\n');
    await ctx.reply(`Aquí están tus recuerdos:\n\n${memoryText}`);
};

export const handleCommandClear = async (ctx: Context) => {
    const userId = ctx.from?.id.toString();
    if (!userId) return;
    
    const conv = dbQueries.getConversation(userId);
    if (conv) {
        dbQueries.clearConversation(conv.id);
    }
    dbQueries.clearUserMemories(userId);
    
    dbQueries.createConversation(userId); // start fresh
    await ctx.reply('🧹 He borrado todo nuestro historial y los recuerdos. Empezamos desde cero.');
};
