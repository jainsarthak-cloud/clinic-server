import { catchAsync } from '../utils/catchAsync.js';

export const resolveHospitalId = (req) =>
  req.hospitalId || req.tenantId || req.tenant?.hospitalId || req.params.hospitalId;

export class BaseController {
  constructor(service) {
    this.service = service;
  }

  getAll = catchAsync(async (req, res) => {
    const data = await this.service.getAll(resolveHospitalId(req), req.query);
    res.status(200).json({ success: true, results: data.length, data });
  });

  getOne = catchAsync(async (req, res) => {
    const data = await this.service.getOne(req.params.id, resolveHospitalId(req));
    res.status(200).json({ success: true, data });
  });

  create = catchAsync(async (req, res) => {
    const data = await this.service.create({
      ...req.body,
      hospitalId: resolveHospitalId(req)
    });
    res.status(201).json({ success: true, data });
  });
}
