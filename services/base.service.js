const toPositiveInteger = (value, fallback) => {
  const number = Number.parseInt(value, 10);
  return Number.isInteger(number) && number > 0 ? number : fallback;
};

class BaseService {
  constructor(repository) {
    this.repository = repository;
  }

  async getAll(hospitalId, query) {
    return this.repository.findAll(hospitalId, query);
  }

  async getOne(id, hospitalId) {
    const record = await this.repository.findById(id, hospitalId);
    if (!record) throw new Error('Record not found');
    return record;
  }

  async search(hospitalId, query = {}, searchableFields = [], options = {}) {
    const queryObject = query && typeof query === 'object' ? query : { q: query };
    const searchTerm = String(queryObject.q ?? queryObject.search ?? queryObject.keyword ?? '').trim();
    const fields = Array.isArray(searchableFields) ? searchableFields.filter(Boolean) : [];
    const {
      filterableFields = [],
      filters = {},
      formatter,
      minSearchLength = 2,
      ...repositoryOptions
    } = options;

    if (!fields.length) throw new Error('Search fields are required');
    if (searchTerm.length < minSearchLength) {
      throw new Error(`Search term must be at least ${minSearchLength} characters`);
    }

    const queryFilters = {};
    for (const field of filterableFields) {
      if (queryObject[field] !== undefined && queryObject[field] !== '') {
        queryFilters[field] = queryObject[field];
      }
    }

    const result = await this.repository.search(hospitalId, searchTerm, fields, {
      ...repositoryOptions,
      filters: { ...filters, ...queryFilters },
      page: toPositiveInteger(queryObject.page ?? repositoryOptions.page, 1),
      limit: toPositiveInteger(queryObject.limit ?? repositoryOptions.limit, 10)
    });

    return {
      ...result,
      data: typeof formatter === 'function' ? result.data.map((record) => formatter(record)) : result.data
    };
  }

  async create(data) {
    return this.repository.create(data);
  }

  async update(id, hospitalId, data) {
    return this.repository.update(id, hospitalId, data);
  }
}

export { BaseService };
