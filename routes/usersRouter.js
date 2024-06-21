import express from 'express';
import auth from '../middlewares/authenticate.js';
import * as ctrl from "../controllers/user.js";
import { upload } from "../helpers/upload.js";

const userRouter = express.Router();

userRouter.get("/count-users", ctrl.countUsers);
userRouter.get("/current", auth, ctrl.current);
userRouter.patch("/avatar", auth, upload.single("avatar"), ctrl.updateAvatar);

export default userRouter;
