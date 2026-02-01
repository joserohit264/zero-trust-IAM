/**
 * Validation Middleware
 * Request validation using Joi schemas
 */
const Joi = require('joi');
const { HTTP_STATUS } = require('../config/constants');

// Validation schemas
const schemas = {
    // Auth schemas
    login: Joi.object({
        username: Joi.string().alphanum().min(3).max(50).required(),
        password: Joi.string().min(8).max(128).required()
    }),

    mfaVerify: Joi.object({
        token: Joi.string().length(6).pattern(/^[0-9]+$/).required()
    }),

    // User schemas
    createUser: Joi.object({
        username: Joi.string().alphanum().min(3).max(50).required(),
        email: Joi.string().email().required(),
        password: Joi.string()
            .min(8)
            .max(128)
            .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
            .required()
            .messages({
                'string.pattern.base': 'Password must contain at least one uppercase, one lowercase, one number, and one special character'
            }),
        firstName: Joi.string().max(100),
        lastName: Joi.string().max(100),
        roleId: Joi.string().uuid()
    }),

    updateUser: Joi.object({
        email: Joi.string().email(),
        firstName: Joi.string().max(100),
        lastName: Joi.string().max(100),
        is_active: Joi.boolean()
    }),

    changePassword: Joi.object({
        currentPassword: Joi.string().required(),
        newPassword: Joi.string()
            .min(8)
            .max(128)
            .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
            .required()
    }),

    // Role schemas
    assignRole: Joi.object({
        roleId: Joi.string().uuid().required()
    }),

    // Log filter schemas
    logFilters: Joi.object({
        page: Joi.number().integer().min(1).default(1),
        limit: Joi.number().integer().min(1).max(100).default(50),
        userId: Joi.string().uuid(),
        actionType: Joi.string(),
        startDate: Joi.date().iso(),
        endDate: Joi.date().iso().greater(Joi.ref('startDate')),
        success: Joi.boolean(),
        search: Joi.string().max(100)
    }),

    // UUID param
    uuidParam: Joi.object({
        id: Joi.string().uuid().required()
    })
};

/**
 * Validate request body
 */
const validateBody = (schemaName) => {
    return (req, res, next) => {
        const schema = schemas[schemaName];
        if (!schema) {
            return next(new Error(`Schema '${schemaName}' not found`));
        }

        const { error, value } = schema.validate(req.body, { abortEarly: false });

        if (error) {
            const errors = error.details.map(d => ({
                field: d.path.join('.'),
                message: d.message
            }));

            return res.status(HTTP_STATUS.BAD_REQUEST).json({
                success: false,
                message: 'Validation failed',
                errors
            });
        }

        req.validatedBody = value;
        next();
    };
};

/**
 * Validate query parameters
 */
const validateQuery = (schemaName) => {
    return (req, res, next) => {
        const schema = schemas[schemaName];
        if (!schema) {
            return next(new Error(`Schema '${schemaName}' not found`));
        }

        const { error, value } = schema.validate(req.query, { abortEarly: false });

        if (error) {
            const errors = error.details.map(d => ({
                field: d.path.join('.'),
                message: d.message
            }));

            return res.status(HTTP_STATUS.BAD_REQUEST).json({
                success: false,
                message: 'Validation failed',
                errors
            });
        }

        req.validatedQuery = value;
        next();
    };
};

/**
 * Validate URL parameters
 */
const validateParams = (schemaName) => {
    return (req, res, next) => {
        const schema = schemas[schemaName];
        if (!schema) {
            return next(new Error(`Schema '${schemaName}' not found`));
        }

        const { error, value } = schema.validate(req.params, { abortEarly: false });

        if (error) {
            const errors = error.details.map(d => ({
                field: d.path.join('.'),
                message: d.message
            }));

            return res.status(HTTP_STATUS.BAD_REQUEST).json({
                success: false,
                message: 'Validation failed',
                errors
            });
        }

        req.validatedParams = value;
        next();
    };
};

module.exports = {
    schemas,
    validateBody,
    validateQuery,
    validateParams
};
