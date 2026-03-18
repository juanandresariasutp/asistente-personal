import { startBot } from './services/telegram';
import { initDb } from './db/index';
import { logger } from './utils/logger';

const bootstrap = async () => {
    try {
        initDb();
        startBot();
    } catch (err) {
        logger.error('Failed to start application:', err);
        process.exit(1);
    }
};

bootstrap();
