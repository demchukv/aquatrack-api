import express from 'express';

import * as waterController from '../controllers/waterTracker.js';
import validateBody from '../middlewares/validateBody.js';
import validateObjectId from '../middlewares/validateObjectId.js';
import * as schemas from '../schemas/waterTrackerSchemas.js';

const waterRouter = express.Router();

waterRouter.post(
  '/',
  validateBody(schemas.waterTrackerSchema),
  waterController.createWaterTracker
);

waterRouter.put(
  '/:id',
  validateObjectId,
  validateBody(schemas.waterTrackerSchema),
  waterController.updateWaterTracker
);

waterRouter.delete(
  '/:id',
  validateObjectId,
  waterController.deleteWaterTracker
);

waterRouter.post(
  '/day',
  validateBody(schemas.getPerDayWaterTracker),
  waterController.getWaterTrackerByDay
);

waterRouter.post(
  '/month',
  validateBody(schemas.getPerMonthWaterTracker),
  waterController.getWaterTrackerByMonth
);

export default waterRouter;
