import { Router } from 'express';
import userRoutes from './user.router.js';
import appointmentRoutes from './appointment.router.js';
import timeSlotRoutes from './timeSlot.router.js';

const router = Router();

router.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'hospital-queue-api' });
});

router.use('/users', userRoutes);
router.use('/hospitals/:hospitalId/users', userRoutes);
router.use('/hospitals/:hospitalId/appointments', appointmentRoutes);
router.use('/hospitals/:hospitalId/time-slots', timeSlotRoutes);

export default router;
