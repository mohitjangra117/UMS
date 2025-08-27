const Joi = require('joi');

const userValidation = {
    create: Joi.object({
        username: Joi.string().alphanum().min(3).max(30).required(),
        email: Joi.string().email().required(),
        password: Joi.string().min(6).required(),
        role_id: Joi.number().integer().positive().required()
    }),
    
    update: Joi.object({
        username: Joi.string().alphanum().min(3).max(30),
        email: Joi.string().email(),
        password: Joi.string().min(6),
        role_id: Joi.number().integer().positive()
    }),
    
    login: Joi.object({
        username: Joi.string().required(),
        password: Joi.string().required()
    })
};

const roleValidation = {
    create: Joi.object({
        name: Joi.string().min(3).max(50).required(),
        description: Joi.string().max(255),
        permissions: Joi.array().items(Joi.number().integer().positive()).default([])
    }),
    
    update: Joi.object({
        name: Joi.string().min(3).max(50),
        description: Joi.string().max(255),
        permissions: Joi.array().items(Joi.number().integer().positive())
    })
};

module.exports = {
    userValidation,
    roleValidation
};
