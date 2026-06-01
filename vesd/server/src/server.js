import { app } from './app.js';
import { connectDb } from './config/db.js';
import { env } from './config/env.js';
import { createServer } from 'node:http';
import { createSocketServer } from './realtime/socket.js';

connectDb()
  .then(() => {
    const httpServer = createServer(app);
    createSocketServer(httpServer);
    httpServer.listen(env.port, () => console.log(`VESD API running on port ${env.port}`));
  })
  .catch((error) => {
    console.error('Failed to start server', error);
    process.exit(1);
  });
