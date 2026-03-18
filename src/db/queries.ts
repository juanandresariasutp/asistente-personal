import { db } from './index';
import crypto from 'crypto';

// Types
export interface Conversation {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
}

export interface Summary {
  id: string;
  conversation_id: string;
  content: string;
  up_to_message_id: string;
  created_at: string;
}

export interface UserMemory {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
}

// Queries
export const dbQueries = {
  createConversation: (userId: string): string => {
    const id = crypto.randomUUID();
    const stmt = db.prepare('INSERT INTO conversations (id, user_id) VALUES (?, ?)');
    stmt.run(id, userId);
    return id;
  },

  getConversation: (userId: string): Conversation | undefined => {
    const stmt = db.prepare('SELECT * FROM conversations WHERE user_id = ? ORDER BY created_at DESC LIMIT 1');
    return stmt.get(userId) as Conversation | undefined;
  },

  addMessage: (conversationId: string, role: string, content: string): string => {
    const id = crypto.randomUUID();
    const stmt = db.prepare('INSERT INTO messages (id, conversation_id, role, content) VALUES (?, ?, ?, ?)');
    stmt.run(id, conversationId, role, content);
    
    // Update conversation timestamp
    db.prepare('UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(conversationId);
    
    return id;
  },

  getMessages: (conversationId: string, limit: number = 50): Message[] => {
    const stmt = db.prepare(`
      SELECT * FROM (
        SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at DESC LIMIT ?
      ) ORDER BY created_at ASC
    `);
    return stmt.all(conversationId, limit) as Message[];
  },

  getUnsummarizedMessages: (conversationId: string, sinceMessageId?: string): Message[] => {
    if (!sinceMessageId) {
      return db.prepare('SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC').all(conversationId) as Message[];
    }
    
    const sinceMsg = db.prepare('SELECT created_at FROM messages WHERE id = ?').get(sinceMessageId) as { created_at: string } | undefined;
    if(!sinceMsg) return [];
    
    const stmt = db.prepare('SELECT * FROM messages WHERE conversation_id = ? AND created_at > ? ORDER BY created_at ASC');
    return stmt.all(conversationId, sinceMsg.created_at) as Message[];
  },

  saveSummary: (conversationId: string, content: string, upToMessageId: string) => {
    db.prepare('DELETE FROM summaries WHERE conversation_id = ?').run(conversationId);
    
    const id = crypto.randomUUID();
    const stmt = db.prepare('INSERT INTO summaries (id, conversation_id, content, up_to_message_id) VALUES (?, ?, ?, ?)');
    stmt.run(id, conversationId, content, upToMessageId);
  },

  getLatestSummary: (conversationId: string): Summary | undefined => {
    const stmt = db.prepare('SELECT * FROM summaries WHERE conversation_id = ? ORDER BY created_at DESC LIMIT 1');
    return stmt.get(conversationId) as Summary | undefined;
  },

  addUserMemory: (userId: string, content: string) => {
    const id = crypto.randomUUID();
    const stmt = db.prepare('INSERT INTO user_memories (id, user_id, content) VALUES (?, ?, ?)');
    stmt.run(id, userId, content);
  },

  getUserMemories: (userId: string): UserMemory[] => {
    const stmt = db.prepare('SELECT * FROM user_memories WHERE user_id = ? ORDER BY created_at ASC');
    return stmt.all(userId) as UserMemory[];
  },
  
  clearUserMemories: (userId: string) => {
    db.prepare('DELETE FROM user_memories WHERE user_id = ?').run(userId);
  },
  
  clearConversation: (conversationId: string) => {
    db.prepare('DELETE FROM conversations WHERE id = ?').run(conversationId);
  }
};
