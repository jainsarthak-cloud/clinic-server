import express from 'express';
import { AppointmentController } from '../controllers/appointment.controller.js';
const {
  createAppointmentValidator,
  updateAppointmentValidator,
  cancelAppointmentValidator
} = await import('../middlewares/validators/appointment.validator.js');
const {
  identifyUser,
  checkPermission
} = await import('../middlewares/security/index.js');

const router = express.Router({ mergeParams: true });
const ctrl = new AppointmentController();

router.use(identifyUser);

router
  .route('/')
  .get(checkPermission('read:appointment'), ctrl.getAll)
  .post(
    checkPermission('create:appointment'),
    createAppointmentValidator,
    ctrl.create
  );

router
  .route('/status-counts')
  .get(checkPermission('read:appointment'), ctrl.getStatusCounts);

router
  .route('/doctor/:doctorId')
  .get(checkPermission('read:appointment'), ctrl.getByDoctor);

router
  .route('/patient/:patientId')
  .get(checkPermission('read:appointment'), ctrl.getByPatient);

router
  .route('/:id')
  .get(checkPermission('read:appointment'), ctrl.getById)
  .delete(checkPermission('delete:appointment'), ctrl.delete);

router
  .route('/:id/reschedule')
  .patch(
    checkPermission('update:appointment'),
    updateAppointmentValidator,
    ctrl.reschedule
  );

router
  .route('/:id/cancel')
  .patch(
    checkPermission('update:appointment'),
    cancelAppointmentValidator,
    ctrl.cancel
  );

router
  .route('/:id/check-in')
  .patch(checkPermission('update:appointment'), ctrl.checkIn);

router
  .route('/:id/start-consultation')
  .patch(checkPermission('update:appointment'), ctrl.startConsultation);

router
  .route('/:id/complete')
  .patch(checkPermission('update:appointment'), ctrl.complete);

router
  .route('/:id/no-show')
  .patch(checkPermission('update:appointment'), ctrl.markNoShow);

export default router;
