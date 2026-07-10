import { Op } from 'sequelize';
const {
  Appointment,
  Doctor,
  Patient,
  Department,
  HospitalBranch,
  QueueTicket,
  User
} = await import('../models/index.js');
import { BaseRepository, toPositiveInteger } from './base.repository.js';

class AppointmentRepository extends BaseRepository {
  constructor() {
    super(Appointment);
  }

  async findById(id, hospitalId, options = {}) {
    const appointment = await this.model.findOne({
      where: { id, hospitalId },
      ...options
    });

    return appointment;
  }

  async findByAppointmentNumber(appointmentNumber, hospitalId, options = {}) {
    return this.model.findOne({
      where: { appointmentNumber, hospitalId },
      ...options
    });
  }

  async findByIdWithAssociations(id, hospitalId, include = [], options = {}) {
    const defaultInclude = [
      { association: 'branch' },
      { association: 'department' },
      { association: 'doctor', include: ['user'] },
      { association: 'patient', include: ['user'] },
      { association: 'timeSlot' },
      { association: 'queueTicket' }
    ];

    const appointment = await this.model.findOne({
      where: { id, hospitalId },
      include: include.length > 0 ? include : defaultInclude,
      ...options
    });

    return appointment;
  }

  async findAllByHospital(hospitalId, filters = {}, include = [], options = {}) {
    const page = toPositiveInteger(filters.page, 1);
    const limit = toPositiveInteger(filters.limit, 20);
    const offset = (page - 1) * limit;
    const where = this.buildAppointmentWhere(hospitalId, filters);
    const userWhere = this.buildUserSearchWhere(filters.search);

    const defaultInclude = [
      { model: HospitalBranch, as: 'branch' },
      { model: Department, as: 'department' },
      { model: Doctor, as: 'doctor', include: ['user'] },
      {
        model: Patient,
        as: 'patient',
        include: [
          {
            model: User,
            as: 'user',
            where: userWhere,
            required: Boolean(filters.search),
            attributes: { exclude: ['passwordHash'] }
          }
        ],
        required: Boolean(filters.search)
      }
    ];

    const result = await this.model.findAndCountAll({
      where,
      include: include.length > 0 ? include : defaultInclude,
      limit,
      offset,
      distinct: true,
      order: [['startsAt', 'ASC']],
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

  async findByPatient(patientId, hospitalId, filters = {}, options = {}) {
    return this.findAllByHospital(
      hospitalId,
      {
        ...filters,
        patientId
      },
      [],
      options
    );
  }

  async findTodayByDoctor(doctorId, hospitalId, today, options = {}) {
    return this.model.findAll({
      where: {
        hospitalId,
        doctorId,
        scheduledDate: today,
        status: {
          [Op.notIn]: ['cancelled', 'no_show']
        }
      },
      include: [
        { association: 'patient' },
        { association: 'department' },
        { association: 'timeSlot' },
        { association: 'queueTicket' }
      ],
      order: [['startsAt', 'ASC']],
      ...options
    });
  }

  async findOverlappingDoctorAppointments(
    doctorId,
    hospitalId,
    startsAt,
    endsAt,
    excludeAppointmentId = null,
    options = {}
  ) {
    const where = {
      hospitalId,
      doctorId,
      status: { [Op.notIn]: ['cancelled', 'no_show'] },
      startsAt: { [Op.lt]: endsAt },
      endsAt: { [Op.gt]: startsAt }
    };

    if (excludeAppointmentId) {
      where.id = { [Op.ne]: excludeAppointmentId };
    }

    return this.model.findAll({
      where,
      order: [['startsAt', 'ASC']],
      ...options
    });
  }

  async findPatientAppointmentsOnDate(patientId, hospitalId, scheduledDate, options = {}) {
    return this.model.findAll({
      where: {
        hospitalId,
        patientId,
        scheduledDate,
        status: { [Op.notIn]: ['cancelled', 'no_show'] }
      },
      order: [['startsAt', 'ASC']],
      ...options
    });
  }

  async updateAppointment(id, hospitalId, changes, options = {}) {
    const appointment = await this.findById(id, hospitalId, options);
    if (!appointment) return null;
    return appointment.update(changes, options);
  }

  async updateStatus(id, hospitalId, status, extraChanges = {}, options = {}) {
    const appointment = await this.findById(id, hospitalId, options);
    if (!appointment) return null;
    return appointment.update({ status, ...extraChanges }, options);
  }

  async softDelete(id, hospitalId, options = {}) {
    const appointment = await this.findById(id, hospitalId, options);
    if (!appointment) return 0;
    return appointment.destroy(options);
  }

  async restore(id, hospitalId, options = {}) {
    const appointment = await this.model.findOne({
      where: { id, hospitalId },
      paranoid: false,
      ...options
    });

    if (!appointment) return null;
    return appointment.restore(options);
  }

  async countByStatus(hospitalId, filters = {}, options = {}) {
    const where = this.buildAppointmentWhere(hospitalId, filters);

    return this.model.findAll({
      where,
      attributes: [
        'status',
        [this.model.sequelize.fn('COUNT', this.model.sequelize.col('id')), 'count']
      ],
      group: ['status'],
      raw: true,
      ...options
    });
  }

  async findQueueTicket(appointmentId, hospitalId, options = {}) {
    return QueueTicket.findOne({
      where: { appointmentId, hospitalId },
      ...options
    });
  }

  buildAppointmentWhere(hospitalId, filters = {}) {
    const where = { hospitalId };

    if (filters.branchId) where.branchId = filters.branchId;
    if (filters.departmentId) where.departmentId = filters.departmentId;
    if (filters.doctorId) where.doctorId = filters.doctorId;
    if (filters.patientId) where.patientId = filters.patientId;
    if (filters.type) where.type = filters.type;
    if (filters.source) where.source = filters.source;
    if (filters.status) {
      where.status = Array.isArray(filters.status)
        ? { [Op.in]: filters.status }
        : filters.status;
    }

    if (filters.scheduledDate) {
      where.scheduledDate = filters.scheduledDate;
    } else if (filters.fromDate || filters.toDate) {
      where.scheduledDate = {
        ...(filters.fromDate ? { [Op.gte]: filters.fromDate } : {}),
        ...(filters.toDate ? { [Op.lte]: filters.toDate } : {})
      };
    }

    return where;
  }

  buildUserSearchWhere(search) {
    if (!search) return {};

    return {
      [Op.or]: [
        { displayName: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
        { phoneNumber: { [Op.iLike]: `%${search}%` } }
      ]
    };
  }
}

const appointmentRepository = new AppointmentRepository();

export {
  AppointmentRepository,
  appointmentRepository
};
