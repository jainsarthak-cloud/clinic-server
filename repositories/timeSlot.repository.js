import { Op, literal } from 'sequelize';
const {
  TimeSlot,
  Doctor,
  Department,
  HospitalBranch
} = await import('../models/index.js');
import { BaseRepository, toPositiveInteger } from './base.repository.js';

class TimeSlotRepository extends BaseRepository {
  constructor() {
    super(TimeSlot);
  }

  async findById(id, hospitalId, options = {}) {
    return this.model.findOne({
      where: { id, hospitalId },
      ...options
    });
  }

  async findByIdWithAssociations(id, hospitalId, include = [], options = {}) {
    const defaultInclude = [
      { model: HospitalBranch, as: 'branch' },
      { model: Department, as: 'department' },
      { model: Doctor, as: 'doctor', include: ['user'] }
    ];

    return this.model.findOne({
      where: { id, hospitalId },
      include: include.length > 0 ? include : defaultInclude,
      ...options
    });
  }

  async findAllByHospital(hospitalId, filters = {}, include = [], options = {}) {
    const page = toPositiveInteger(filters.page, 1);
    const limit = toPositiveInteger(filters.limit, 20);
    const offset = (page - 1) * limit;
    const where = this.buildTimeSlotWhere(hospitalId, filters);

    const defaultInclude = [
      { model: HospitalBranch, as: 'branch' },
      { model: Department, as: 'department' },
      { model: Doctor, as: 'doctor', include: ['user'] }
    ];

    const result = await this.model.findAndCountAll({
      where,
      include: include.length > 0 ? include : defaultInclude,
      limit,
      offset,
      distinct: true,
      order: [
        ['date', 'ASC'],
        ['startTime', 'ASC']
      ],
      ...options
    });

    return {
      data: result.rows,
      meta: {
        page,
        limit,
        total: result.count,
        totalPages: result.count ? Math.ceil(result.count / limit) : 0
      }
    };
  }

  async findAvailableSlots(hospitalId, filters = {}, options = {}) {
    return this.model.findAll({
      where: {
        ...this.buildTimeSlotWhere(hospitalId, filters),
        status: 'available',
        isOnlineBookingAllowed: filters.isOnlineBookingAllowed ?? true
      },
      order: [
        ['date', 'ASC'],
        ['startTime', 'ASC']
      ],
      ...options
    });
  }

  async findByDoctor(doctorId, hospitalId, filters = {}, options = {}) {
    return this.findAllByHospital(
      hospitalId,
      {
        ...filters,
        doctorId
      },
      [],
      options
    );
  }

  async findByDepartment(departmentId, hospitalId, filters = {}, options = {}) {
    return this.findAllByHospital(
      hospitalId,
      {
        ...filters,
        departmentId
      },
      [],
      options
    );
  }

  async findOverlappingSlots(
    doctorId,
    hospitalId,
    date,
    startTime,
    endTime,
    excludeTimeSlotId = null,
    options = {}
  ) {
    const where = {
      hospitalId,
      doctorId,
      date,
      startTime: { [Op.lt]: endTime },
      endTime: { [Op.gt]: startTime },
      status: { [Op.notIn]: ['cancelled'] }
    };

    if (excludeTimeSlotId) {
      where.id = { [Op.ne]: excludeTimeSlotId };
    }

    return this.model.findAll({
      where,
      order: [['startTime', 'ASC']],
      ...options
    });
  }

  async incrementBookedAppointments(id, hospitalId, options = {}) {
    const [affectedRows] = await this.model.update(
      {
        bookedAppointments: literal('booked_appointments + 1'),
        status: literal(
          "CASE WHEN booked_appointments + 1 >= max_appointments THEN 'full' ELSE status END"
        )
      },
      {
        where: {
          id,
          hospitalId,
          status: 'available',
          bookedAppointments: { [Op.lt]: literal('max_appointments') }
        },
        ...options
      }
    );

    if (affectedRows === 0) return null;
    return this.findById(id, hospitalId, options);
  }

  async releaseBookedAppointment(id, hospitalId, options = {}) {
    const [affectedRows] = await this.model.update(
      {
        bookedAppointments: literal('GREATEST(booked_appointments - 1, 0)'),
        status: literal(
          "CASE WHEN status = 'full' THEN 'available' ELSE status END"
        )
      },
      {
        where: { id, hospitalId, bookedAppointments: { [Op.gt]: 0 } },
        ...options
      }
    );

    if (affectedRows === 0) return null;
    return this.findById(id, hospitalId, options);
  }

  async decrementBookedAppointments(id, hospitalId, options = {}) {
    return this.releaseBookedAppointment(id, hospitalId, options);
  }

  async canMutateSlot(id, hospitalId, options = {}) {
    return this.model.findOne({
      where: { id, hospitalId },
      ...options
    });
  }

  async updateStatus(id, hospitalId, status, extraChanges = {}, options = {}) {
    const slot = await this.findById(id, hospitalId, options);
    if (!slot) return null;

    return slot.update({ status, ...extraChanges }, options);
  }

  async blockSlot(id, hospitalId, blockReason = null, options = {}) {
    return this.updateStatus(
      id,
      hospitalId,
      'blocked',
      { blockReason },
      options
    );
  }

  async unblockSlot(id, hospitalId, options = {}) {
    return this.updateStatus(
      id,
      hospitalId,
      'available',
      { blockReason: null },
      options
    );
  }

  async softDelete(id, hospitalId, options = {}) {
    const slot = await this.findById(id, hospitalId, options);
    if (!slot) return 0;
    return slot.destroy(options);
  }

  async restore(id, hospitalId, options = {}) {
    const slot = await this.model.findOne({
      where: { id, hospitalId },
      paranoid: false,
      ...options
    });

    if (!slot) return null;
    return slot.restore(options);
  }

  buildTimeSlotWhere(hospitalId, filters = {}) {
    const where = { hospitalId };

    if (filters.branchId) where.branchId = filters.branchId;
    if (filters.departmentId) where.departmentId = filters.departmentId;
    if (filters.doctorId) where.doctorId = filters.doctorId;
    if (filters.status) {
      where.status = Array.isArray(filters.status)
        ? { [Op.in]: filters.status }
        : filters.status;
    }
    if (filters.slotType) where.slotType = filters.slotType;
    if (filters.isWalkInAllowed !== undefined) {
      where.isWalkInAllowed = filters.isWalkInAllowed;
    }
    if (filters.isOnlineBookingAllowed !== undefined) {
      where.isOnlineBookingAllowed = filters.isOnlineBookingAllowed;
    }

    if (filters.date) {
      where.date = filters.date;
    } else if (filters.fromDate || filters.toDate) {
      where.date = {
        ...(filters.fromDate ? { [Op.gte]: filters.fromDate } : {}),
        ...(filters.toDate ? { [Op.lte]: filters.toDate } : {})
      };
    }

    return where;
  }
}

const timeSlotRepository = new TimeSlotRepository();

export {
  TimeSlotRepository,
  timeSlotRepository
};
