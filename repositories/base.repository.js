import { Op } from 'sequelize';

export const toPositiveInteger = (value, fallback, max = 100) => {
  const number = Number.parseInt(value, 10);
  return Number.isInteger(number) && number > 0 ? Math.min(number, max) : fallback;
};

export class BaseRepository {
  constructor(model, tenantKey = 'hospitalId') {
    this.model = model;
    this.tenantKey = tenantKey;
  }

  normalizeOptions(options = {}) {
    return Array.isArray(options) ? { include: options } : options;
  }

  tenantWhere(hospitalId, filter = {}) {
    const where = { ...filter };
    if (hospitalId !== undefined && hospitalId !== null) {
      where[this.tenantKey] = hospitalId;
    }
    return where;
  }

  async findById(id, hospitalId, options = {}) {
    const queryOptions = this.normalizeOptions(options);
    return this.model.findOne({
      where: this.tenantWhere(hospitalId, { id }),
      ...queryOptions
    });
  }

  async findAll(hospitalId, filter = {}, options = {}) {
    const queryOptions = this.normalizeOptions(options);
    return this.model.findAll({
      where: this.tenantWhere(hospitalId, filter),
      ...queryOptions
    });
  }

  async findOne(hospitalId, filter = {}, options = {}) {
    const queryOptions = this.normalizeOptions(options);
    return this.model.findOne({
      where: this.tenantWhere(hospitalId, filter),
      ...queryOptions
    });
  }

  async search(hospitalId, searchTerm, searchableFields = [], options = {}) {
    const {
      filters = {},
      page = 1,
      limit = 10,
      order = [['createdAt', 'DESC']],
      include,
      distinct,
      ...queryOptions
    } = this.normalizeOptions(options);

    const normalizedTerm = String(searchTerm ?? '').trim();
    const fields = Array.isArray(searchableFields)
      ? searchableFields.filter(Boolean)
      : [];
    const safePage = toPositiveInteger(page, 1);
    const safeLimit = toPositiveInteger(limit, 10);
    const offset = (safePage - 1) * safeLimit;

    if (!fields.length) {
      return { total: 0, page: safePage, limit: safeLimit, pages: 0, data: [] };
    }

    const whereClauses = [];
    if (hospitalId !== undefined && hospitalId !== null) {
      whereClauses.push({ [this.tenantKey]: hospitalId });
    }
    if (filters && Reflect.ownKeys(filters).length) whereClauses.push(filters);
    if (normalizedTerm) {
      whereClauses.push({
        [Op.or]: fields.map((field) => ({
          [field]: { [Op.iLike]: `%${normalizedTerm}%` }
        }))
      });
    }

    const where = whereClauses.length ? { [Op.and]: whereClauses } : {};
    const { count, rows } = await this.model.findAndCountAll({
      where,
      offset,
      limit: safeLimit,
      order,
      include,
      distinct: distinct ?? Boolean(include),
      ...queryOptions
    });

    const total = Array.isArray(count) ? count.length : count;
    return {
      total,
      page: safePage,
      limit: safeLimit,
      pages: Math.ceil(total / safeLimit),
      data: rows
    };
  }

  async create(data, options = {}) {
    return this.model.create(data, options);
  }

  async bulkCreate(data, options = {}) {
    return this.model.bulkCreate(data, options);
  }

  async update(id, hospitalId, data, options = {}) {
    const record = await this.findById(id, hospitalId, options);
    if (!record) return null;
    return record.update(data, options);
  }

  async delete(id, hospitalId, options = {}) {
    const record = await this.findById(id, hospitalId, options);
    if (!record) return 0;
    return record.destroy(options);
  }

  async restore(id, hospitalId, options = {}) {
    const queryOptions = this.normalizeOptions(options);
    const record = await this.model.findOne({
      where: this.tenantWhere(hospitalId, { id }),
      paranoid: false,
      ...queryOptions
    });

    if (!record) return null;
    return record.restore(options);
  }
}
