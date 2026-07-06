import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import sequelize from './config/db.js';

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Health Check Endpoint
app.get('/health', async (req, res) => {
  try {
    await sequelize.authenticate();
    res.status(200).json({
      status: 'success',
      message: 'Server is healthy and database is connected.',
      timestamp: new Date(),
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Server is running but database connection failed.',
      error: error.message,
      timestamp: new Date(),
    });
  }
});

// 404 Handler
app.use((req, res, _next) => {
  res.status(404).json({ message: `Route ${req.originalUrl} not found` });
});

// Error Handler
app.use((err, req, res, _next) => {
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
});

export default app;
