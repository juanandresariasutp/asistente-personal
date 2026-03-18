import Groq from 'groq-sdk';
import { config } from '../config';
import fs from 'fs';

const groq = new Groq({
  apiKey: config.groq.apiKey,
});

export const openaiService = {
  transcribeAudio: async (filePath: string): Promise<string> => {
    try {
      const transcription = await groq.audio.transcriptions.create({
        file: fs.createReadStream(filePath),
        model: config.groq.transcriptionModel,
      });
      return transcription.text;
    } catch (error) {
      console.error('Error transcribiendo audio con Groq:', error);
      throw new Error('Error en transcripción');
    }
  },

  chat: async (messages: any[]): Promise<string> => {
    try {
      const response = await groq.chat.completions.create({
        model: config.groq.chatModel,
        messages,
      });
      return response.choices[0]?.message?.content || '';
    } catch (error) {
      console.error('Error en generación de respuesta (Groq Chat):', error);
      throw new Error('Error generando respuesta');
    }
  },
  
  chatStructured: async (messages: any[], systemPrompt: string): Promise<string> => {
    try {
      const fullMessages: any[] = [
        { role: 'system', content: systemPrompt },
        ...messages
      ];
      
      const response = await groq.chat.completions.create({
        model: config.groq.chatModel,
        messages: fullMessages,
      });
      return response.choices[0]?.message?.content || '';
    } catch (error) {
      console.error('Error en structured chat (Groq):', error);
      return '';
    }
  }
};
