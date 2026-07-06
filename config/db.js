import { Sequelize } from 'sequelize';
import 'dotenv/config';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('❌ FATAL: DATABASE_URL is not defined in environment variables.');
}

const sequelize = new Sequelize(databaseUrl, {
  dialect: 'postgres',
  protocol: 'postgres',
  dialectOptions: {
    ssl: process.env.NODE_ENV === 'production' ? { require: true, rejectUnauthorized: false } : false,
    keepAlive: true,
  },
  pool: { max: 10, min: 2, acquire: 30000, idle: 10000 },
  retry: {
    match: [
      /SequelizeConnectionError/,
      /SequelizeConnectionRefusedError/,
      /SequelizeHostNotFoundError/,
      /SequelizeHostNotReachableError/,
      /SequelizeInvalidConnectionError/,
      /SequelizeConnectionTimedOutError/,
      /TimeoutError/,
    ],
    max: 3,
  },
  logging: process.env.NODE_ENV === 'development' ? (sql) => console.log(`📖 SQL: ${sql}`) : false,
  define: { underscored: true, timestamps: true, paranoid: true },
});

export const connectWithRetry = async () => {
  console.log('⏳ Attempting to connect to the database...');
  while (true) {
    try {
      await sequelize.authenticate();
      console.log('✅ Database connection established successfully.');
      return;
    } catch (err) {
      console.error('❌ Database connection failed. Retrying in 5 seconds...', err.message);
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
};

export default sequelize;
