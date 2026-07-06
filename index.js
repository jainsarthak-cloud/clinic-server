import 'dotenv/config';
import app from './app.js';
import { connectWithRetry } from './config/db.js';
import { sequelize } from './models/index.js';

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  await connectWithRetry();

  if (process.env.NODE_ENV !== 'production') {
    console.log('⏳ Syncing database models...');
    try {
      await sequelize.sync({ alter: true });
      console.log('✅ Database models synced successfully.');
    } catch (err) {
      console.error('❌ Database sync failed:', err.message);
    }
  }

  const server = app.listen(PORT, () => {
    console.log(`🚀 Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  });

  process.on('unhandledRejection', (err) => {
    console.error('❌ UNHANDLED REJECTION! Shutting down...', err.name, err.message);
    server.close(() => {
      process.exit(1);
    });
  });
};

startServer();

process.on('uncaughtException', (err) => {
  console.error('❌ UNCAUGHT EXCEPTION! Shutting down...', err.name, err.message);
  process.exit(1);
});
