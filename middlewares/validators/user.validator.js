const UUID_REGEX =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USER_STATUSES = ['invited', 'active', 'locked', 'disabled'];
const HOSPITAL_ROLES = [
    'owner',
    'admin',
    'receptionist',
    'doctor',
    'nurse',
    'billing',
    'viewer'
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

const ensureEmail = (value, fieldName) => {
    if (typeof value !== 'string' || !EMAIL_REGEX.test(value.trim())) {
        throw validationError(`${fieldName} must be a valid email address`);
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

const ensureArray = (value, fieldName) => {
    if (value === undefined) return;
    if (!Array.isArray(value)) {
        throw validationError(`${fieldName} must be an array`);
    }
};

const createUserValidator = createValidator((req) => {
    const { body } = req;

    ensureString(body.fullName, 'fullName', { min: 2, max: 160 });
    ensureEmail(body.email, 'email');
    ensureString(body.password, 'password', { min: 8, max: 255 });

    ensureOptionalString(body.phone, 'phone', { min: 7, max: 32 });
    ensureOptionalString(body.avatarUrl, 'avatarUrl', { min: 5, max: 500 });

    if (body.status !== undefined) {
        ensureEnum(body.status, 'status', USER_STATUSES);
    }

    if (body.role !== undefined) {
        ensureEnum(body.role, 'role', HOSPITAL_ROLES);
    }

    if (body.hospitalId !== undefined) {
        ensureUuid(body.hospitalId, 'hospitalId');
    }

    ensureArray(body.permissions, 'permissions');
});

const updateUserValidator = createValidator((req) => {
    const { body } = req;

    if (body.fullName !== undefined) {
        ensureString(body.fullName, 'fullName', { min: 2, max: 160 });
    }

    if (body.email !== undefined) {
        ensureEmail(body.email, 'email');
    }

    if (body.phone !== undefined) {
        ensureOptionalString(body.phone, 'phone', { min: 7, max: 32 });
    }

    if (body.avatarUrl !== undefined) {
        ensureOptionalString(body.avatarUrl, 'avatarUrl', { min: 5, max: 500 });
    }

    if (body.status !== undefined) {
        ensureEnum(body.status, 'status', USER_STATUSES);
    }
});

const updateUserStatusValidator = createValidator((req) => {
    if (req.body.status === undefined) {
        throw validationError('status is required');
    }

    ensureEnum(req.body.status, 'status', USER_STATUSES);
});

const updateMembershipValidator = createValidator((req) => {
    const { body } = req;

    if (body.role !== undefined) {
        ensureEnum(body.role, 'role', HOSPITAL_ROLES);
    }

    if (body.status !== undefined) {
        ensureEnum(body.status, 'status', ['invited', 'active', 'disabled']);
    }

    ensureArray(body.permissions, 'permissions');
});

const loginValidator = createValidator((req) => {
    const { body } = req;

    if (body.email === undefined) {
        throw validationError('email is required');
    }

    if (body.password === undefined) {
        throw validationError('password is required');
    }

    ensureEmail(body.email, 'email');
    ensureString(body.password, 'password', { min: 1, max: 255 });
});

export {
    createUserValidator,
    updateUserValidator,
    updateUserStatusValidator,
    updateMembershipValidator,
    loginValidator
};
