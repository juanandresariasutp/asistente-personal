import { config } from '../config';

const levels: Record<string, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

const currentLevel = levels[config.logLevel] ?? levels.info;

export const logger = {
  error: (msg: string, ...args: any[]) => {
    if (currentLevel >= levels.error) console.error(`[ERROR] ${msg}`, ...args);
  },
  warn: (msg: string, ...args: any[]) => {
    if (currentLevel >= levels.warn) console.warn(`[WARN] ${msg}`, ...args);
  },
  info: (msg: string, ...args: any[]) => {
    if (currentLevel >= levels.info) console.info(`[INFO] ${msg}`, ...args);
  },
  debug: (msg: string, ...args: any[]) => {
    if (currentLevel >= levels.debug) console.debug(`[DEBUG] ${msg}`, ...args);
  },
};
