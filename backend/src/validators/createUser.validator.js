import Joi from 'joi';

const createUserValidator = Joi.object({
    username: Joi.string().alphanum().min(3).max(16).required()
        .messages({
            'string.base': 'Username must be a string.',
            'string.alphanum': 'Username must only contain alphanumeric characters.',
            'string.min': 'Username must be at least 3 characters long.',
            'string.max': 'Username must be at most 16 characters long.',
            'any.required': 'Username is required.',
        }),
    password: Joi.string().min(8).max(64).required()
        .messages({
            'string.base': 'Password must be a string.',
            'string.min': 'Password must be at least 8 characters long.',
            'string.max': 'Password must be at most 64 characters long.',
            'any.required': 'Password is required.',
        })
});

export default createUserValidator