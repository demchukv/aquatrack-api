import Joi from 'joi';

export const waterTrackerSchema = Joi.object({
  date: Joi.date().iso().required(),
  amount: Joi.number().integer().min(1).max(5000).required(),
});

export const getPerDayWaterTracker = Joi.object({
  date: Joi.date().iso().required(),
});

export const getPerMonthWaterTracker = Joi.object({
  startDate: Joi.date().required(),
  endDate: Joi.date().required(),
});
