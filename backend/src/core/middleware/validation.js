const Joi = require('joi');
const { AppError } = require('../errors/AppError');

function validate(schema, property = 'body') {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errorMessage = error.details.map(detail => detail.message).join(', ');
      return next(new AppError(errorMessage, 'VALIDATION_ERROR', 400));
    }

    req[property] = value;
    next();
  };
}

// Schemas de validação comuns
const schemas = {
  auth: {
    login: Joi.object({
      email: Joi.string().trim().email().required().messages({
        'string.email': 'Email inválido',
        'any.required': 'Email é obrigatório',
      }),
      password: Joi.string().trim().min(6).required().messages({
        'string.min': 'Senha deve ter pelo menos 6 caracteres',
        'any.required': 'Senha é obrigatória',
      }),
    }),
    
    refresh: Joi.object({
      refreshToken: Joi.string().optional(),
    }),
  },

  user: {
    create: Joi.object({
      nome: Joi.string().min(3).max(100).required(),
      email: Joi.string().email().required(),
      password: Joi.string().min(6).required(),
      role: Joi.string().valid('admin', 'supervisor', 'operator', 'system').required(),
    }),
    
    update: Joi.object({
      nome: Joi.string().min(3).max(100),
      email: Joi.string().email(),
      role: Joi.string().valid('admin', 'supervisor', 'operator', 'system'),
      ativo: Joi.boolean(),
    }),
  },

  workspace: {
    create: Joi.object({
      slug: Joi.string().pattern(/^[a-z0-9-]+$/).required(),
      nome: Joi.string().min(3).max(100).required(),
      vertical_key: Joi.string().pattern(/^[a-z0-9_-]+$/).max(50).required(),
      timezone: Joi.string().default('America/Sao_Paulo'),
      moeda: Joi.string().length(3).default('BRL'),
    }),
    
    update: Joi.object({
      nome: Joi.string().min(3).max(100),
      vertical_key: Joi.string().pattern(/^[a-z0-9_-]+$/).max(50),
      timezone: Joi.string(),
      moeda: Joi.string().length(3),
      ativo: Joi.boolean(),
    }),
  },

  catalogo: {
    import: Joi.object({
      replace: Joi.boolean().default(false),
    }),
    
    create: Joi.object({
      numero: Joi.number().integer().positive().required(),
      familia: Joi.string().required(),
      variante: Joi.string().required(),
      capacidade: Joi.string().required(),
      preco: Joi.number().positive().precision(2).required(),
    }),
    
    update: Joi.object({
      familia: Joi.string(),
      variante: Joi.string(),
      capacidade: Joi.string(),
      preco: Joi.number().positive().precision(2),
      ativo: Joi.boolean(),
    }),
  },

  cms: {
    create: Joi.object({
      chave: Joi.string().pattern(/^[a-z0-9._-]+$/).required(),
      conteudo: Joi.string().required(),
    }),
    
    update: Joi.object({
      conteudo: Joi.string().required(),
    }),
  },

  fila: {
    assumir: Joi.object({
      lockDuration: Joi.number().integer().min(300).max(3600).default(900), // 15 minutos default
    }),
  },
};

module.exports = {
  validate,
  schemas,
};