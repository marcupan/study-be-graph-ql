import pino from 'pino';

import { config } from './config.js';

export const logger = pino({
  level: config.env === 'development' ? 'debug' : 'info',
  ...(config.env === 'development' && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
      },
    },
  }),
});
