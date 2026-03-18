import Groq from 'groq-sdk';
import { config } from '../config';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import util from 'util';

const execPromise = util.promisify(exec);

const groq = new Groq({
  apiKey: config.groq.apiKey,
});

const gogTool = {
  type: "function",
  function: {
    name: "run_gog_command",
    description: "Use 'gog' CLI tool to interact with Google Workspace (Gmail, Calendar, Drive, Contacts, Docs, Sheets) for the user. Provide the command arguments to append to the 'gog' invocation. ALWAYS respect user privacy and confirm destructive actions in the conversation before execution.",
    parameters: {
      type: "object",
      properties: {
        command: {
          type: "string",
          description: "Arguments to pass to the gog CLI. E.g. `gmail search 'newer_than:7d' --max 5` or `calendar events primary --from 2026-03-17T00:00:00Z --to 2026-03-18T00:00:00Z`."
        }
      },
      required: ["command"]
    }
  }
};

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
      const completion = await groq.chat.completions.create({
        model: config.groq.chatModel,
        messages,
        tools: [gogTool as any],
        tool_choice: "auto",
      });
      
      const message = completion.choices[0]?.message;

      if (message?.tool_calls && message.tool_calls.length > 0) {
        messages.push(message);

        for (const toolCall of message.tool_calls) {
          if (toolCall.function.name === 'run_gog_command') {
            const args = JSON.parse(toolCall.function.arguments);
            let toolOutput = "";
            try {
              const gogPath = path.join(process.cwd(), 'gog.exe');
              console.log(`Executing gog tool: ${gogPath} ${args.command}`);
              const { stdout, stderr } = await execPromise(`"${gogPath}" ${args.command}`);
              toolOutput = stdout || stderr || "Success (no output).";
            } catch (err: any) {
              toolOutput = `Error executing tool: ${err.message}\nStdOut: ${err.stdout}\nStdErr: ${err.stderr}`;
            }

            messages.push({
              tool_call_id: toolCall.id,
              role: "tool",
              name: toolCall.function.name,
              content: toolOutput.substring(0, 4000) // limit output length
            });
          }
        }

        const followUp = await groq.chat.completions.create({
          model: config.groq.chatModel,
          messages,
        });

        return followUp.choices[0]?.message?.content || '';
      }

      return message?.content || '';
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
