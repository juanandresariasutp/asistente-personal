import { dbQueries } from '../db/queries';
import { openaiService } from './openai';
import { logger } from '../utils/logger';

const MAX_UNSUMMARIZED_MESSAGES = 10;

export const processMessage = async (userId: string, text: string): Promise<string> => {
  // 1. Get or create conversation
  let conv = dbQueries.getConversation(userId);
  if (!conv) {
    dbQueries.createConversation(userId);
    conv = dbQueries.getConversation(userId);
  }
  if (!conv) throw new Error('Could not get or create conversation');

  const convId = conv.id;

  // 2. Add user message
  dbQueries.addMessage(convId, 'user', text);

  // 3. Build Context
  const memories = dbQueries.getUserMemories(userId);
  const memoryText = memories.length > 0 ? `Datos recordados permanente sobre el usuario:\n${memories.map(m => `- ${m.content}`).join('\n')}` : '';

  const summary = dbQueries.getLatestSummary(convId);
  const summaryText = summary ? `Resumen de la conversación anterior:\n${summary.content}` : '';

  let systemPrompt = `Eres un asistente personal amable, eficiente y conciso. Hablas español. Estás diseñado para su uso en Telegram.\n\n`;
  if (memoryText) systemPrompt += `${memoryText}\n\n`;
  if (summaryText) systemPrompt += `${summaryText}\n\n`;
  systemPrompt += `Mantén tus respuestas naturales y conversacionales. Trata de ayudar al usuario en lo que necesite basándote en lo que recuerdas.`;

  // Fetch recent messages
  const recentMessages = dbQueries.getUnsummarizedMessages(convId, summary?.up_to_message_id);

  const messagesForOpenAI: any[] = [
    { role: 'system', content: systemPrompt }
  ];

  for (const msg of recentMessages) {
    if (msg.role !== 'system') {
      messagesForOpenAI.push({ role: msg.role, content: msg.content });
    }
  }

  // 4. Get response from OpenAI
  const aiResponse = await openaiService.chat(messagesForOpenAI);

  // 5. Save response
  dbQueries.addMessage(convId, 'assistant', aiResponse);

  // 6. Check if we need to summarize
  if (recentMessages.length >= MAX_UNSUMMARIZED_MESSAGES) {
      // Execute in background
      checkAndSummarize(userId, convId, summary, recentMessages).catch(e => logger.error('Error in checkAndSummarize', e));
  }

  return aiResponse;
};

const checkAndSummarize = async (userId: string, convId: string, currentSummary: any, messagesToSummarize: any[]) => {
    logger.info(`Starting background summarization for conversation ${convId}`);
    
    // 1. Summarize conversation
    const messagesText = messagesToSummarize.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n');
    let prompt = `Tienes el siguiente historial de chat reciente.\n\n${messagesText}\n\n`;
    if (currentSummary) {
        prompt = `El resumen de la interacción previa era:\n${currentSummary.content}\n\nY los nuevos mensajes son:\n${messagesText}\n\n`;
    }
    
    prompt += `Genera un nuevo resumen conciso en español que unifique ambos y capture todo el contexto útil de forma descriptiva o en viñetas.`;

    const newSummaryText = await openaiService.chatStructured([], prompt);
    
    // Extract new persistent memories
    const memoryPrompt = `Analiza la siguiente conversación y extrae SOLO los hechos importantes, preferencias o información clave permanente sobre el usuario que se deba recordar a largo plazo (por ejemplo: nombres, lugar donde vive, gustos, planes a largo plazo, etc.).\n\nConversación:\n${messagesText}\n\nSi no hay nada relevante permanente, responde exactamente con la palabra "NADA". Si hay algo importante, devuélvelo en una lista de viñetas limpia (usando el guion "- " al inicio de línea sin negritas extras).`;
    
    const extraction = await openaiService.chatStructured([], memoryPrompt);
    
    if (extraction && !extraction.includes('NADA') && extraction.trim() !== '') {
        const lines = extraction.split('\n').map(l => l.replace(/^[-*]\s*/, '').trim()).filter(l => l.length > 0);
        for (const line of lines) {
            dbQueries.addUserMemory(userId, line);
            logger.info(`New memory extracted for user ${userId}: ${line}`);
        }
    }

    const lastMessageId = messagesToSummarize[messagesToSummarize.length - 1].id;
    dbQueries.saveSummary(convId, newSummaryText, lastMessageId);
    logger.info(`Summarization complete for conversation ${convId}`);
};
