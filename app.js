import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import config from './config/env.js';
import userRouter from './router/user.router.js';
import appointmentRouter from './router/appointment.router.js';
import timeSlotRouter from './router/timeSlot.router.js';
import { globalErrorHandler } from './middlewares/error/error.middleware.js';

const app = express();

app.use(helmet());
app.use(cors({
  origin(origin, callback) {
    if (!origin || config.corsOrigins.length === 0 || config.corsOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Origin is not allowed by CORS'));
  },
  credentials: true
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(config.env === 'production' ? 'combined' : 'dev'));

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'UP',
    timestamp: new Date().toISOString()
  });
});

app.use('/api/v1/users', userRouter);
app.use('/api/v1/hospitals/:hospitalId/users', userRouter);
app.use('/api/v1/hospitals/:hospitalId/appointments', appointmentRouter);
app.use('/api/v1/hospitals/:hospitalId/time-slots', timeSlotRouter);

app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

app.use(globalErrorHandler);

export default app;
