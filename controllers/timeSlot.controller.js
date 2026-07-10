import { TimeSlotService } from '../services/timeSlot.service.js';
import { catchAsync } from '../utils/catchAsync.js';
import { resolveHospitalId } from './base.controller.js';

const timeSlotService = new TimeSlotService();

class TimeSlotController {
  create = catchAsync(async (req, res) => {
    const data = await timeSlotService.createTimeSlot(
      resolveHospitalId(req),
      req.body
    );
    res.status(201).json({ success: true, data });
  });

  createMany = catchAsync(async (req, res) => {
    const data = await timeSlotService.createManyTimeSlots(
      resolveHospitalId(req),
      req.body.timeSlots || []
    );
    res.status(201).json({ success: true, results: data.length, data });
  });

  getAll = catchAsync(async (req, res) => {
    const data = await timeSlotService.getTimeSlots(
      resolveHospitalId(req),
      req.query
    );
    res.status(200).json({ success: true, ...data });
  });

  getAvailable = catchAsync(async (req, res) => {
    const data = await timeSlotService.getAvailableSlots(
      resolveHospitalId(req),
      req.query
    );
    res.status(200).json({ success: true, results: data.length, data });
  });

  getById = catchAsync(async (req, res) => {
    const data = await timeSlotService.getTimeSlotById(
      req.params.id,
      resolveHospitalId(req)
    );
    res.status(200).json({ success: true, data });
  });

  update = catchAsync(async (req, res) => {
    const data = await timeSlotService.updateTimeSlot(
      req.params.id,
      resolveHospitalId(req),
      req.body
    );
    res.status(200).json({ success: true, data });
  });

  block = catchAsync(async (req, res) => {
    const data = await timeSlotService.blockTimeSlot(
      req.params.id,
      resolveHospitalId(req),
      req.body.reason || req.body.blockReason || null
    );
    res.status(200).json({ success: true, data });
  });

  unblock = catchAsync(async (req, res) => {
    const data = await timeSlotService.unblockTimeSlot(
      req.params.id,
      resolveHospitalId(req)
    );
    res.status(200).json({ success: true, data });
  });

  delete = catchAsync(async (req, res) => {
    await timeSlotService.deleteTimeSlot(req.params.id, resolveHospitalId(req));
    res.status(200).json({
      success: true,
      message: 'Time slot deleted successfully'
    });
  });
}

export { TimeSlotController };
