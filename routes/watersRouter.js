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

waterRouter.get(
  '/day',
  validateBody(schemas.getWaterTracker),
  waterController.getWaterTrackerByDay
);

waterRouter.get(
  '/month',
  validateBody(schemas.getWaterTracker),
  waterController.getWaterTrackerByMonth
);

export default waterRouter;
