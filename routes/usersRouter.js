import express from 'express';
import auth from '../middlewares/authenticate.js';
import * as ctrl from "../controllers/user.js";

const userRouter = express.Router();

userRouter.get("/current", auth, ctrl.current);

export default userRouter;
