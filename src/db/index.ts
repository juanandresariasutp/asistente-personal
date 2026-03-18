import Database from 'better-sqlite3';
import { config } from '../config';
import { logger } from '../utils/logger';
import fs from 'fs';
import path from 'path';

// Asegurar que el directorio data exista
const dbDir = path.dirname(config.db.url);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

export const db = new Database(config.db.url, {
  verbose: config.isDev ? (msg) => logger.debug(msg as string) : undefined,
});

db.pragma('journal_mode = WAL'); // Mejor concurrencia y rendimiento

export const initDb = () => {
  try {
    const schemaPath = path.join(__dirname, 'schema.sql');
    if (!fs.existsSync(schemaPath)) {
        logger.error(`No schema.sql found at ${schemaPath}`);
        return;
    }
    const schema = fs.readFileSync(schemaPath, 'utf8');
    db.exec(schema);
    logger.info('Base de datos inicializada correctamente');
  } catch (err) {
    logger.error('Error inicializando la base de datos', err);
    throw err;
  }
};

process.on('exit', () => db.close());
process.on('SIGHUP', () => process.exit(128 + 1));
process.on('SIGINT', () => process.exit(128 + 2));
process.on('SIGTERM', () => process.exit(128 + 15));
