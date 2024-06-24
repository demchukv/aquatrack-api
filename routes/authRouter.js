import express from 'express';
import {
  logIn,
  logOut,
  register,
  verifyEmail,
  resendVerifyEmail,
  refresh,
  googleAuth,
  googleRedirect,
  sendResetPasswordEmail,
  resetPassword,
} from '../controllers/auth.js';
import {
  loginSchema,
  resetSchema,
  registerSchema,
  userValidateVerifyEmail,
} from '../models/user.js';
import validateBody from '../middlewares/validateBody.js';
import auth from '../middlewares/authenticate.js';

const authRouter = express.Router();

authRouter.post('/register', validateBody(registerSchema), register);
authRouter.post('/login', validateBody(loginSchema), logIn);
authRouter.post('/logout', auth, logOut);
authRouter.get('/verify/:verificationToken', verifyEmail);
authRouter.post('/verify', validateBody(userValidateVerifyEmail), resendVerifyEmail);
authRouter.get('/refresh', refresh);

authRouter.get('/google', googleAuth);
authRouter.get('/google-redirect', googleRedirect);

authRouter.post('/forgot-password', validateBody(userValidateVerifyEmail), sendResetPasswordEmail);
authRouter.post('/reset-password', validateBody(resetSchema), resetPassword);

export default authRouter;
