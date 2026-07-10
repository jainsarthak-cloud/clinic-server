import { AppointmentService } from '../services/appointment.service.js';
import { catchAsync } from '../utils/catchAsync.js';
import { resolveHospitalId } from './base.controller.js';

const appointmentService = new AppointmentService();

class AppointmentController {
  create = catchAsync(async (req, res) => {
    const data = await appointmentService.createAppointment(
      resolveHospitalId(req),
      req.body
    );
    res.status(201).json({ success: true, data });
  });

  getAll = catchAsync(async (req, res) => {
    const data = await appointmentService.getAppointments(
      resolveHospitalId(req),
      req.query
    );
    res.status(200).json({ success: true, ...data });
  });

  getById = catchAsync(async (req, res) => {
    const data = await appointmentService.getAppointmentById(
      req.params.id,
      resolveHospitalId(req)
    );
    res.status(200).json({ success: true, data });
  });

  getByDoctor = catchAsync(async (req, res) => {
    const data = await appointmentService.getDoctorAppointments(
      req.params.doctorId,
      resolveHospitalId(req),
      req.query
    );
    res.status(200).json({ success: true, ...data });
  });

  getByPatient = catchAsync(async (req, res) => {
    const data = await appointmentService.getPatientAppointments(
      req.params.patientId,
      resolveHospitalId(req),
      req.query
    );
    res.status(200).json({ success: true, ...data });
  });

  reschedule = catchAsync(async (req, res) => {
    const data = await appointmentService.rescheduleAppointment(
      req.params.id,
      resolveHospitalId(req),
      req.body
    );
    res.status(200).json({ success: true, data });
  });

  cancel = catchAsync(async (req, res) => {
    const data = await appointmentService.cancelAppointment(
      req.params.id,
      resolveHospitalId(req),
      req.body
    );
    res.status(200).json({ success: true, data });
  });

  checkIn = catchAsync(async (req, res) => {
    const data = await appointmentService.checkInAppointment(
      req.params.id,
      resolveHospitalId(req)
    );
    res.status(200).json({ success: true, data });
  });

  startConsultation = catchAsync(async (req, res) => {
    const data = await appointmentService.startConsultation(
      req.params.id,
      resolveHospitalId(req)
    );
    res.status(200).json({ success: true, data });
  });

  complete = catchAsync(async (req, res) => {
    const data = await appointmentService.completeAppointment(
      req.params.id,
      resolveHospitalId(req)
    );
    res.status(200).json({ success: true, data });
  });

  markNoShow = catchAsync(async (req, res) => {
    const data = await appointmentService.markNoShow(
      req.params.id,
      resolveHospitalId(req)
    );
    res.status(200).json({ success: true, data });
  });

  delete = catchAsync(async (req, res) => {
    await appointmentService.deleteAppointment(
      req.params.id,
      resolveHospitalId(req)
    );
    res.status(200).json({
      success: true,
      message: 'Appointment deleted successfully'
    });
  });

  getStatusCounts = catchAsync(async (req, res) => {
    const data = await appointmentService.getAppointmentStatusCounts(
      resolveHospitalId(req),
      req.query
    );
    res.status(200).json({ success: true, data });
  });
}

export { AppointmentController };
