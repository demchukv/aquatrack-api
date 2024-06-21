import Joi from 'joi';

export const waterTrackerSchema = Joi.object({
  date: Joi.date().iso().required(),
  amount: Joi.number().integer().min(1).max(5000).required(),
});

export const getWaterTracker = Joi.object({
  date: Joi.date().required(),
});
