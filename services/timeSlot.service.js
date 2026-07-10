import sequelize from '../config/db.js';
import { TimeSlotRepository } from '../repositories/timeSlot.repository.js';

const timeSlotRepo = new TimeSlotRepository();

class TimeSlotService {
  async createTimeSlot(hospitalId, payload, options = {}) {
    this.ensureTimeRange(payload.startTime, payload.endTime);
    const overlappingSlots = await timeSlotRepo.findOverlappingSlots(
      payload.doctorId,
      hospitalId,
      payload.date,
      payload.startTime,
      payload.endTime,
      null,
      options
    );

    if (overlappingSlots.length > 0) {
      throw new Error('Doctor already has a time slot in this time range');
    }

    const data = {
      hospitalId,
      branchId: payload.branchId,
      departmentId: payload.departmentId,
      doctorId: payload.doctorId,
      date: payload.date,
      startTime: payload.startTime,
      endTime: payload.endTime,
      slotType: payload.slotType || 'consultation',
      maxAppointments: payload.maxAppointments || 1,
      bookedAppointments: payload.bookedAppointments || 0,
      status: payload.status || 'available',
      blockReason: payload.blockReason || null,
      isWalkInAllowed: payload.isWalkInAllowed || false,
      isOnlineBookingAllowed: payload.isOnlineBookingAllowed ?? true,
      metadata: payload.metadata || {}
    };

    if (data.bookedAppointments > data.maxAppointments) {
      throw new Error('bookedAppointments cannot exceed maxAppointments');
    }

    const timeSlot = await timeSlotRepo.create(data, options);
    return this.formatTimeSlotResponse(timeSlot);
  }

  async getTimeSlots(hospitalId, query = {}) {
    const result = await timeSlotRepo.findAllByHospital(hospitalId, query);
    return {
      ...result,
      data: result.data.map((slot) => this.formatTimeSlotResponse(slot))
    };
  }

  async getTimeSlotById(timeSlotId, hospitalId) {
    const timeSlot = await timeSlotRepo.findByIdWithAssociations(timeSlotId, hospitalId);
    if (!timeSlot) throw new Error('Time slot not found');
    return this.formatTimeSlotResponse(timeSlot);
  }

  async getAvailableSlots(hospitalId, query = {}) {
    const slots = await timeSlotRepo.findAvailableSlots(hospitalId, query);
    return slots.map((slot) => this.formatTimeSlotResponse(slot));
  }

  async updateTimeSlot(timeSlotId, hospitalId, payload) {
    const timeSlot = await timeSlotRepo.findById(timeSlotId, hospitalId);
    if (!timeSlot) throw new Error('Time slot not found');
    if (timeSlot.bookedAppointments > 0 && (payload.doctorId || payload.date || payload.startTime || payload.endTime)) {
      throw new Error('Cannot change timing or doctor for a slot with booked appointments');
    }

    const nextStart = payload.startTime || timeSlot.startTime;
    const nextEnd = payload.endTime || timeSlot.endTime;
    this.ensureTimeRange(nextStart, nextEnd);

    if (payload.doctorId || payload.date || payload.startTime || payload.endTime) {
      const overlappingSlots = await timeSlotRepo.findOverlappingSlots(
        payload.doctorId || timeSlot.doctorId,
        hospitalId,
        payload.date || timeSlot.date,
        nextStart,
        nextEnd,
        timeSlotId
      );
      if (overlappingSlots.length > 0) {
        throw new Error('Doctor already has a time slot in this time range');
      }
    }

    const updateData = {};
    if (payload.branchId) updateData.branchId = payload.branchId;
    if (payload.departmentId) updateData.departmentId = payload.departmentId;
    if (payload.doctorId) updateData.doctorId = payload.doctorId;
    if (payload.date) updateData.date = payload.date;
    if (payload.startTime) updateData.startTime = payload.startTime;
    if (payload.endTime) updateData.endTime = payload.endTime;
    if (payload.slotType) updateData.slotType = payload.slotType;
    if (payload.maxAppointments !== undefined) {
      if (payload.maxAppointments < timeSlot.bookedAppointments) {
        throw new Error('maxAppointments cannot be less than bookedAppointments');
      }
      updateData.maxAppointments = payload.maxAppointments;
      if (timeSlot.status === 'full' && payload.maxAppointments > timeSlot.bookedAppointments) {
        updateData.status = 'available';
      }
    }
    if (payload.status) updateData.status = payload.status;
    if (payload.blockReason !== undefined) updateData.blockReason = payload.blockReason;
    if (payload.isWalkInAllowed !== undefined) updateData.isWalkInAllowed = payload.isWalkInAllowed;
    if (payload.isOnlineBookingAllowed !== undefined) updateData.isOnlineBookingAllowed = payload.isOnlineBookingAllowed;
    if (payload.metadata) updateData.metadata = payload.metadata;

    const updated = await timeSlot.update(updateData);
    return this.formatTimeSlotResponse(updated);
  }

  async blockTimeSlot(timeSlotId, hospitalId, reason) {
    const existing = await timeSlotRepo.findById(timeSlotId, hospitalId);
    if (!existing) throw new Error('Time slot not found');
    if (existing.bookedAppointments > 0) {
      throw new Error('Cannot block a slot with booked appointments');
    }
    const timeSlot = await timeSlotRepo.blockSlot(timeSlotId, hospitalId, reason);
    return this.formatTimeSlotResponse(timeSlot);
  }

  async unblockTimeSlot(timeSlotId, hospitalId) {
    const timeSlot = await timeSlotRepo.unblockSlot(timeSlotId, hospitalId);
    if (!timeSlot) throw new Error('Time slot not found');
    return this.formatTimeSlotResponse(timeSlot);
  }

  async deleteTimeSlot(timeSlotId, hospitalId) {
    const existing = await timeSlotRepo.findById(timeSlotId, hospitalId);
    if (!existing) throw new Error('Time slot not found');
    if (existing.bookedAppointments > 0) {
      throw new Error('Cannot delete a slot with booked appointments');
    }
    await timeSlotRepo.softDelete(timeSlotId, hospitalId);
  }

  async incrementBookedAppointments(timeSlotId, hospitalId, options = {}) {
    const timeSlot = await timeSlotRepo.incrementBookedAppointments(timeSlotId, hospitalId, options);
    if (!timeSlot) throw new Error('Time slot is not available');
    return timeSlot;
  }

  async decrementBookedAppointments(timeSlotId, hospitalId, options = {}) {
    return timeSlotRepo.decrementBookedAppointments(timeSlotId, hospitalId, options);
  }

  async createManyTimeSlots(hospitalId, payloads) {
    const transaction = await sequelize.transaction();
    try {
      const slots = [];
      for (const payload of payloads) {
        const slot = await this.createTimeSlot(hospitalId, payload, { transaction });
        slots.push(slot);
      }
      await transaction.commit();
      return slots;
    } catch (error) {
      if (!transaction.finished) await transaction.rollback();
      throw error;
    }
  }

  ensureTimeRange(startTime, endTime) {
    if (startTime >= endTime) throw new Error('startTime must be before endTime');
  }

  formatTimeSlotResponse(timeSlot) {
    return {
      id: timeSlot.id,
      hospitalId: timeSlot.hospitalId,
      branchId: timeSlot.branchId,
      departmentId: timeSlot.departmentId,
      doctorId: timeSlot.doctorId,
      date: timeSlot.date,
      startTime: timeSlot.startTime,
      endTime: timeSlot.endTime,
      slotType: timeSlot.slotType,
      maxAppointments: timeSlot.maxAppointments,
      bookedAppointments: timeSlot.bookedAppointments,
      status: timeSlot.status,
      blockReason: timeSlot.blockReason,
      isWalkInAllowed: timeSlot.isWalkInAllowed,
      isOnlineBookingAllowed: timeSlot.isOnlineBookingAllowed,
      metadata: timeSlot.metadata,
      createdAt: timeSlot.createdAt,
      updatedAt: timeSlot.updatedAt
    };
  }
}

export { TimeSlotService };
