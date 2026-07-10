const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const APPOINTMENT_TYPES = ['walk_in', 'scheduled', 'follow_up', 'teleconsultation'];
const APPOINTMENT_SOURCES = [
  'android',
  'ios',
  'web_admin',
  'reception',
  'doctor_dashboard',
  'public_web',
  'api'
];
const APPOINTMENT_STATUSES = [
  'booked',
  'checked_in',
  'in_consultation',
  'completed',
  'cancelled',
  'no_show'
];

const validationError = (message) => {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
};

const createValidator = (validateFn) => (req, res, next) => {
  try {
    validateFn(req);
    next();
  } catch (error) {
    next(error);
  }
};

const ensureUuid = (value, fieldName) => {
  if (typeof value !== 'string' || !UUID_REGEX.test(value.trim())) {
    throw validationError(`${fieldName} must be a valid UUID`);
  }
};

const ensureString = (value, fieldName, { min = 1, max = 255 } = {}) => {
  if (
    typeof value !== 'string' ||
    value.trim().length < min ||
    value.trim().length > max
  ) {
    throw validationError(`${fieldName} must be ${min}-${max} characters`);
  }
};

const ensureOptionalString = (value, fieldName, options = {}) => {
  if (value === undefined || value === null) return;
  ensureString(value, fieldName, options);
};

const ensureEnum = (value, fieldName, allowedValues) => {
  if (!allowedValues.includes(value)) {
    throw validationError(
      `${fieldName} must be one of: ${allowedValues.join(', ')}`
    );
  }
};

const ensureDateLike = (value, fieldName) => {
  if (!value || Number.isNaN(Date.parse(value))) {
    throw validationError(`${fieldName} must be a valid date`);
  }
};

const ensureStartBeforeEnd = (startsAt, endsAt) => {
  if (startsAt && endsAt && new Date(startsAt) >= new Date(endsAt)) {
    throw validationError('startsAt must be before endsAt');
  }
};

const ensurePlainObject = (value, fieldName) => {
  if (value === undefined) return;
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw validationError(`${fieldName} must be an object`);
  }
};

const createAppointmentValidator = createValidator((req) => {
  const { body } = req;

  ensureUuid(body.branchId, 'branchId');
  ensureUuid(body.departmentId, 'departmentId');
  ensureUuid(body.doctorId, 'doctorId');
  ensureUuid(body.patientId, 'patientId');
  ensureString(body.appointmentNumber, 'appointmentNumber', { min: 1, max: 80 });
  ensureEnum(body.source || 'reception', 'source', APPOINTMENT_SOURCES);
  ensureEnum(body.type || 'scheduled', 'type', APPOINTMENT_TYPES);
  ensureDateLike(body.scheduledDate, 'scheduledDate');
  ensureDateLike(body.startsAt, 'startsAt');
  ensureDateLike(body.endsAt, 'endsAt');
  ensureStartBeforeEnd(body.startsAt, body.endsAt);

  ensureOptionalString(body.reason, 'reason', { min: 1, max: 1000 });
  ensureOptionalString(body.notes, 'notes', { min: 1, max: 1000 });
  ensurePlainObject(body.metadata, 'metadata');

  if (body.status !== undefined) {
    ensureEnum(body.status, 'status', APPOINTMENT_STATUSES);
  }

  if (body.timeSlotId !== undefined) {
    ensureUuid(body.timeSlotId, 'timeSlotId');
  }
});

const updateAppointmentValidator = createValidator((req) => {
  const { body } = req;

  if (body.branchId !== undefined) ensureUuid(body.branchId, 'branchId');
  if (body.departmentId !== undefined) ensureUuid(body.departmentId, 'departmentId');
  if (body.doctorId !== undefined) ensureUuid(body.doctorId, 'doctorId');
  if (body.patientId !== undefined) ensureUuid(body.patientId, 'patientId');
  if (body.scheduledDate !== undefined) ensureDateLike(body.scheduledDate, 'scheduledDate');
  if (body.startsAt !== undefined) ensureDateLike(body.startsAt, 'startsAt');
  if (body.endsAt !== undefined) ensureDateLike(body.endsAt, 'endsAt');
  if (body.startsAt !== undefined || body.endsAt !== undefined) {
    ensureStartBeforeEnd(body.startsAt, body.endsAt);
  }
  if (body.status !== undefined) ensureEnum(body.status, 'status', APPOINTMENT_STATUSES);

  ensureOptionalString(body.reason, 'reason', { min: 1, max: 1000 });
  ensureOptionalString(body.notes, 'notes', { min: 1, max: 1000 });
  ensurePlainObject(body.metadata, 'metadata');
});

const appointmentStatusValidator = createValidator((req) => {
  if (req.body.status !== undefined) {
    ensureEnum(req.body.status, 'status', APPOINTMENT_STATUSES);
  }
});

const cancelAppointmentValidator = createValidator((req) => {
  ensureOptionalString(req.body.reason, 'reason', { min: 2, max: 500 });
});

export {
  createAppointmentValidator,
  updateAppointmentValidator,
  appointmentStatusValidator,
  cancelAppointmentValidator
};
