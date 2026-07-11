import sequelize from '../config/db.js';
import { AppointmentRepository } from '../repositories/appointment.repository.js';
import { TimeSlotRepository } from '../repositories/timeSlot.repository.js';
import { Doctor, Patient, HospitalBranch, Department } from '../models/index.js';

const appointmentRepo = new AppointmentRepository();
const timeSlotRepo = new TimeSlotRepository();
const ACTIVE_STATUSES = ['booked', 'checked_in', 'in_consultation'];
const STATUS_TRANSITIONS = {
  booked: ['checked_in', 'cancelled', 'no_show'],
  checked_in: ['in_consultation', 'cancelled', 'no_show'],
  in_consultation: ['completed'],
  completed: [],
  cancelled: [],
  no_show: []
};

class AppointmentService {
  async createAppointment(hospitalId, payload, options = {}) {
    this.ensureDateRange(payload.startsAt, payload.endsAt);
    let transaction = options.transaction;
    let localTransaction = false;
    if (!transaction) {
      transaction = await sequelize.transaction();
      localTransaction = true;
    }

    try {
      await this.validateReferences(hospitalId, payload, { transaction });
      await this.ensureDoctorIsFree(
        payload.doctorId,
        hospitalId,
        payload.startsAt,
        payload.endsAt,
        null,
        { transaction }
      );

      if (payload.timeSlotId) {
        const timeSlot = await timeSlotRepo.findById(payload.timeSlotId, hospitalId, { transaction });
        if (!timeSlot) throw new Error('Time slot not found');
        if (timeSlot.doctorId !== payload.doctorId) throw new Error('Time slot doctor does not match appointment doctor');
        if (timeSlot.date !== payload.scheduledDate) throw new Error('Time slot date does not match appointment date');
        const updatedSlot = await timeSlotRepo.incrementBookedAppointments(payload.timeSlotId, hospitalId, { transaction });
        if (!updatedSlot) throw new Error('Time slot is not available');
      }

      const appointment = await appointmentRepo.create(
        {
          hospitalId,
          branchId: payload.branchId,
          departmentId: payload.departmentId,
          doctorId: payload.doctorId,
          patientId: payload.patientId,
          timeSlotId: payload.timeSlotId || null,
          appointmentNumber: payload.appointmentNumber,
          source: payload.source || 'reception',
          type: payload.type || 'scheduled',
          scheduledDate: payload.scheduledDate,
          startsAt: payload.startsAt,
          endsAt: payload.endsAt,
          reason: payload.reason || null,
          notes: payload.notes || null,
          status: payload.status || 'booked',
          metadata: payload.metadata || {}
        },
        { transaction }
      );

      if (localTransaction) await transaction.commit();
      const created = await appointmentRepo.findByIdWithAssociations(appointment.id, hospitalId);
      return this.formatAppointmentResponse(created);
    } catch (error) {
      if (localTransaction && !transaction.finished) await transaction.rollback();
      throw error;
    }
  }

  async getAppointments(hospitalId, query = {}) {
    const result = await appointmentRepo.findAllByHospital(hospitalId, query);
    return {
      ...result,
      data: result.data.map((appointment) => this.formatAppointmentResponse(appointment))
    };
  }

  async getAppointmentById(appointmentId, hospitalId) {
    const appointment = await appointmentRepo.findByIdWithAssociations(appointmentId, hospitalId);
    if (!appointment) throw new Error('Appointment not found');
    return this.formatAppointmentResponse(appointment);
  }

  async getDoctorAppointments(doctorId, hospitalId, query = {}) {
    const result = await appointmentRepo.findByDoctor(doctorId, hospitalId, query);
    return { ...result, data: result.data.map((appointment) => this.formatAppointmentResponse(appointment)) };
  }

  async getPatientAppointments(patientId, hospitalId, query = {}) {
    const result = await appointmentRepo.findByPatient(patientId, hospitalId, query);
    return { ...result, data: result.data.map((appointment) => this.formatAppointmentResponse(appointment)) };
  }

  async rescheduleAppointment(appointmentId, hospitalId, payload) {
    const transaction = await sequelize.transaction();
    try {
      const appointment = await appointmentRepo.findById(appointmentId, hospitalId, { transaction });
      if (!appointment) throw new Error('Appointment not found');
      if (!ACTIVE_STATUSES.includes(appointment.status)) {
        throw new Error('Only active appointments can be rescheduled');
      }

      const next = {
        branchId: payload.branchId || appointment.branchId,
        departmentId: payload.departmentId || appointment.departmentId,
        doctorId: payload.doctorId || appointment.doctorId,
        patientId: appointment.patientId,
        timeSlotId: payload.timeSlotId !== undefined ? payload.timeSlotId : appointment.timeSlotId,
        scheduledDate: payload.scheduledDate || appointment.scheduledDate,
        startsAt: payload.startsAt || appointment.startsAt,
        endsAt: payload.endsAt || appointment.endsAt
      };
      if (next.timeSlotId) {
  const timeSlot = await timeSlotRepo.findById(next.timeSlotId, hospitalId, { transaction });
  if (!timeSlot) throw new Error('Time slot not found');
  if (timeSlot.doctorId !== next.doctorId) throw new Error('Time slot doctor does not match appointment doctor');
  if (timeSlot.date !== next.scheduledDate) throw new Error('Time slot date does not match appointment date');
}
this.ensureDateRange(next.startsAt, next.endsAt);
      await this.validateReferences(hospitalId, next, { transaction });
      await this.ensureDoctorIsFree(next.doctorId, hospitalId, next.startsAt, next.endsAt, appointmentId, { transaction });

      if (appointment.timeSlotId && appointment.timeSlotId !== next.timeSlotId) {
        await timeSlotRepo.decrementBookedAppointments(appointment.timeSlotId, hospitalId, { transaction });
      }
      if (next.timeSlotId && appointment.timeSlotId !== next.timeSlotId) {
        const updatedSlot = await timeSlotRepo.incrementBookedAppointments(next.timeSlotId, hospitalId, { transaction });
        if (!updatedSlot) throw new Error('Time slot is not available');
      }

      const updated = await appointmentRepo.updateAppointment(
        appointmentId,
        hospitalId,
        {
          doctorId: next.doctorId,
          branchId: next.branchId,
          departmentId: next.departmentId,
          timeSlotId: next.timeSlotId,
          scheduledDate: next.scheduledDate,
          startsAt: next.startsAt,
          endsAt: next.endsAt,
          status: 'booked',
          metadata: {
            ...(appointment.metadata || {}),
            rescheduledAt: new Date().toISOString(),
            rescheduleReason: payload.reason || null
          }
        },
        { transaction }
      );

      await transaction.commit();
      return this.formatAppointmentResponse(updated);
    } catch (error) {
      if (!transaction.finished) await transaction.rollback();
      throw error;
    }
  }

  async cancelAppointment(appointmentId, hospitalId, payload = {}) {
    const transaction = await sequelize.transaction();
    try {
      const existing = await appointmentRepo.findById(appointmentId, hospitalId, { transaction });
      if (!existing) throw new Error('Appointment not found');
      if (['cancelled', 'completed', 'no_show'].includes(existing.status)) {
        throw new Error('Appointment cannot be cancelled from its current status');
      }

      const appointment = await appointmentRepo.updateStatus(
        appointmentId,
        hospitalId,
        'cancelled',
        {
          cancelledAt: new Date(),
          cancellationReason: payload.reason || null
        },
        { transaction }
      );

      if (existing.timeSlotId) {
        await timeSlotRepo.decrementBookedAppointments(existing.timeSlotId, hospitalId, { transaction });
      }

      await transaction.commit();
      return this.formatAppointmentResponse(appointment);
    } catch (error) {
      if (!transaction.finished) await transaction.rollback();
      throw error;
    }
  }

  async checkInAppointment(appointmentId, hospitalId) {
    return this.updateAppointmentStatus(appointmentId, hospitalId, 'checked_in');
  }

  async startConsultation(appointmentId, hospitalId) {
    return this.updateAppointmentStatus(appointmentId, hospitalId, 'in_consultation');
  }

  async completeAppointment(appointmentId, hospitalId) {
    return this.updateAppointmentStatus(appointmentId, hospitalId, 'completed');
  }

  async markNoShow(appointmentId, hospitalId) {
    return this.updateAppointmentStatus(appointmentId, hospitalId, 'no_show');
  }

  async updateAppointmentStatus(appointmentId, hospitalId, status) {
    const appointment = await appointmentRepo.findById(appointmentId, hospitalId);
    if (!appointment) throw new Error('Appointment not found');
    if (!STATUS_TRANSITIONS[appointment.status]?.includes(status)) {
      throw new Error(`Cannot change appointment status from ${appointment.status} to ${status}`);
    }
    const updated = await appointmentRepo.updateStatus(appointmentId, hospitalId, status);
    return this.formatAppointmentResponse(updated);
  }

  async deleteAppointment(appointmentId, hospitalId) {
    const appointment = await appointmentRepo.findById(appointmentId, hospitalId);
    if (!appointment) throw new Error('Appointment not found');
    if (!['cancelled', 'no_show'].includes(appointment.status)) {
      throw new Error('Only cancelled or no-show appointments can be deleted');
    }
    await appointmentRepo.softDelete(appointmentId, hospitalId);
  }

  async getAppointmentStatusCounts(hospitalId, filters = {}) {
    return appointmentRepo.countByStatus(hospitalId, filters);
  }

  async ensureDoctorIsFree(doctorId, hospitalId, startsAt, endsAt, excludeAppointmentId = null, options = {}) {
    const overlappingAppointments = await appointmentRepo.findOverlappingDoctorAppointments(
      doctorId,
      hospitalId,
      startsAt,
      endsAt,
      excludeAppointmentId,
      options
    );
    if (overlappingAppointments.length > 0) {
      throw new Error('Doctor already has an appointment in this time range');
    }
  }

  async validateReferences(hospitalId, payload, options = {}) {
    const [doctor, patient, branch, department] = await Promise.all([
      Doctor.findOne({ where: { id: payload.doctorId, hospitalId }, ...options }),
      Patient.findOne({ where: { id: payload.patientId, hospitalId }, ...options }),
      HospitalBranch.findOne({ where: { id: payload.branchId, hospitalId }, ...options }),
      Department.findOne({ where: { id: payload.departmentId, hospitalId }, ...options })
    ]);
    if (!doctor) throw new Error('Doctor not found for hospital');
    if (!patient) throw new Error('Patient not found for hospital');
    if (!branch) throw new Error('Branch not found for hospital');
    if (!department) throw new Error('Department not found for hospital');
  }

  ensureDateRange(startsAt, endsAt) {
    if (new Date(startsAt) >= new Date(endsAt)) {
      throw new Error('startsAt must be before endsAt');
    }
  }

  formatAppointmentResponse(appointment) {
    return {
      id: appointment.id,
      hospitalId: appointment.hospitalId,
      branchId: appointment.branchId,
      departmentId: appointment.departmentId,
      doctorId: appointment.doctorId,
      patientId: appointment.patientId,
      timeSlotId: appointment.timeSlotId,
      appointmentNumber: appointment.appointmentNumber,
      source: appointment.source,
      type: appointment.type,
      scheduledDate: appointment.scheduledDate,
      startsAt: appointment.startsAt,
      endsAt: appointment.endsAt,
      reason: appointment.reason,
      notes: appointment.notes,
      status: appointment.status,
      cancelledAt: appointment.cancelledAt,
      cancellationReason: appointment.cancellationReason,
      metadata: appointment.metadata,
      createdAt: appointment.createdAt,
      updatedAt: appointment.updatedAt,
      patient: appointment.patient || null,
      doctor: appointment.doctor || null,
      department: appointment.department || null,
      branch: appointment.branch || null,
      timeSlot: appointment.timeSlot || null,
      queueTicket: appointment.queueTicket || null
    };
  }
}

export { AppointmentService };
