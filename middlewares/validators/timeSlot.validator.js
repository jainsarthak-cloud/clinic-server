const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SLOT_TYPES = ['consultation', 'follow_up', 'emergency', 'teleconsultation'];
const SLOT_STATUSES = ['available', 'full', 'blocked', 'cancelled', 'completed'];
const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;

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

const ensureEnum = (value, fieldName, allowedValues) => {
  if (!allowedValues.includes(value)) {
    throw validationError(
      `${fieldName} must be one of: ${allowedValues.join(', ')}`
    );
  }
};

const ensureDate = (value, fieldName) => {
  if (!value || Number.isNaN(Date.parse(value))) {
    throw validationError(`${fieldName} must be a valid date`);
  }
};

const ensureTime = (value, fieldName) => {
  if (typeof value !== 'string' || !TIME_REGEX.test(value)) {
    throw validationError(`${fieldName} must be a valid time`);
  }
};

const ensureStartBeforeEnd = (startTime, endTime) => {
  if (startTime && endTime && startTime >= endTime) {
    throw validationError('startTime must be before endTime');
  }
};

const ensureInteger = (value, fieldName, { min = 0, max = 1000 } = {}) => {
  if (!Number.isInteger(Number(value)) || Number(value) < min || Number(value) > max) {
    throw validationError(`${fieldName} must be an integer between ${min} and ${max}`);
  }
};

const ensureBoolean = (value, fieldName) => {
  if (value === undefined) return;
  if (typeof value !== 'boolean') {
    throw validationError(`${fieldName} must be a boolean`);
  }
};

const ensurePlainObject = (value, fieldName) => {
  if (value === undefined) return;
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw validationError(`${fieldName} must be an object`);
  }
};

const ensureOptionalString = (value, fieldName, { min = 1, max = 255 } = {}) => {
  if (value === undefined || value === null) return;
  if (
    typeof value !== 'string' ||
    value.trim().length < min ||
    value.trim().length > max
  ) {
    throw validationError(`${fieldName} must be ${min}-${max} characters`);
  }
};

const validateTimeSlotPayload = (body, partial = false) => {
  if (!partial || body.branchId !== undefined) ensureUuid(body.branchId, 'branchId');
  if (!partial || body.departmentId !== undefined) ensureUuid(body.departmentId, 'departmentId');
  if (!partial || body.doctorId !== undefined) ensureUuid(body.doctorId, 'doctorId');
  if (!partial || body.date !== undefined) ensureDate(body.date, 'date');
  if (!partial || body.startTime !== undefined) ensureTime(body.startTime, 'startTime');
  if (!partial || body.endTime !== undefined) ensureTime(body.endTime, 'endTime');
  ensureStartBeforeEnd(body.startTime, body.endTime);

  if (body.slotType !== undefined) ensureEnum(body.slotType, 'slotType', SLOT_TYPES);
  if (body.status !== undefined) ensureEnum(body.status, 'status', SLOT_STATUSES);
  if (body.maxAppointments !== undefined) {
    ensureInteger(body.maxAppointments, 'maxAppointments', { min: 1, max: 500 });
  }
  if (body.bookedAppointments !== undefined) {
    ensureInteger(body.bookedAppointments, 'bookedAppointments', { min: 0, max: 500 });
  }

  ensureBoolean(body.isWalkInAllowed, 'isWalkInAllowed');
  ensureBoolean(body.isOnlineBookingAllowed, 'isOnlineBookingAllowed');
  ensureOptionalString(body.blockReason, 'blockReason', { min: 2, max: 255 });
  ensurePlainObject(body.metadata, 'metadata');
};

const createTimeSlotValidator = createValidator((req) => {
  validateTimeSlotPayload(req.body);
});

const createManyTimeSlotsValidator = createValidator((req) => {
  if (!Array.isArray(req.body.timeSlots) || req.body.timeSlots.length === 0) {
    throw validationError('timeSlots must be a non-empty array');
  }

  for (const slot of req.body.timeSlots) {
    validateTimeSlotPayload(slot);
  }
});

const updateTimeSlotValidator = createValidator((req) => {
  validateTimeSlotPayload(req.body, true);
});

const blockTimeSlotValidator = createValidator((req) => {
  ensureOptionalString(req.body.reason || req.body.blockReason, 'reason', {
    min: 2,
    max: 255
  });
});

export {
  createTimeSlotValidator,
  createManyTimeSlotsValidator,
  updateTimeSlotValidator,
  blockTimeSlotValidator
};
