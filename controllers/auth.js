import { User } from '../models/user.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import HttpError from '../middlewares/HttpError.js';
import { sendEmail } from '../helpers/sendEmail.js';
import * as tokenServices from '../services/token-services.js';
import axios from 'axios';
import queryString from 'query-string';

const { JWT_SECRET } = process.env;

const register = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (user) {
      next(HttpError(409, 'Email in use!'));
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationToken = crypto.randomUUID();

    const newUser = new User({
      email,
      password: hashedPassword,
      verificationToken,
    });
    await newUser.setAvatarURL(email);
    await newUser.save();

    const verifyEmailData = {
      to: email,
      subject: 'Verify email',
      html: `<h1>Please verify your email</h1><p><a target="_blank" href="${process.env.BASE_URI}/api/auth/verify/${verificationToken}">Click verify email</a></p>`,
    };
    await sendEmail(verifyEmailData);

    res.status(201).send({ user: { email: newUser.email } });
  } catch (error) {
    console.log(error);
    next(error);
  }
};

const logIn = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (user === null) {
      next(HttpError(401, 'Email or password is wrong!'));
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      next(HttpError(401, 'Email or password is wrong!'));
    }

    if (user.verify === false) {
      next(HttpError(401, 'Please verify your mail!'));
    }
    const payload = { id: user._id, email: user.email };
    const { token, refreshToken } = await tokenServices.generateToken(payload);
    await tokenServices.saveToken(user._id, refreshToken);

    await User.findByIdAndUpdate(user._id, { token }, { new: true });

    res.cookie('refreshToken', refreshToken, {
      maxAge: 30 * 24 * 60 * 60 * 1000,
      httpOnly: true,
    });

    res.status(200).send({ token, user: { email: user.email } });
  } catch (error) {
    console.log(error);
    next(error);
  }
};

const logOut = async (req, res, next) => {
  const { refreshToken } = req.cookies;
  try {
    await User.findByIdAndUpdate(req.user.id, { token: null }, { new: true });
    await tokenServices.removeToken(refreshToken);
    res.clearCookie('refreshToken');

    res.status(204).end();
  } catch (error) {
    console.log(error);
    next(error);
  }
};

const verifyEmail = async (req, res, next) => {
  const { verificationToken } = req.params;
  const user = await User.findOne({ verificationToken: verificationToken });
  if (!user) {
    return res.status(404).json({
      message: 'User not found',
    });
  }
  try {
    await User.findByIdAndUpdate(user._id, {
      verify: true,
      verificationToken: null,
    });
    res.json({
      message: 'Verification successful',
    });
  } catch (error) {
    console.error(error);
    next(error);
  }
};

const resendVerifyEmail = async (req, res, next) => {
  const { email } = req.body;
  const user = await User.findOne({ email });
  if (!user) {
    return res.status(404).json({
      message: 'User not found',
    });
  }

  if (user.verify) {
    return res.status(400).json({
      message: 'Verification has already been passed',
    });
  }

  const verifyEmailData = {
    to: user.email,
    subject: 'Verify email',
    html: `<h1>Please verify your email</h1><p><a target="_blank" href="${process.env.BASE_URI}/api/auth/verify/${user.verificationToken}">Click verify email</a></p>`,
  };

  await sendEmail(verifyEmailData);

  res.json({ message: 'Verification email sent' });
};

const refresh = async (req, res, next) => {
  const { refreshToken } = req.cookies;

  if (!refreshToken) {
    next(HttpError(401, 'Not authorized'));
  }

  const userData = await tokenServices.refresh(refreshToken);
  res.cookie('refreshToken', userData.refreshToken, {
    maxAge: 30 * 24 * 60 * 60 * 1000,
    httpOnly: true,
  });
  return res
    .status(200)
    .send({ token: userData.token, user: { email: userData.user.email } });
};

const googleAuth = async (req, res, next) => {
  const stringifiedParams = queryString.stringify({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: process.env.BASE_URI + '/api/auth/google-redirect',
    scope: ['profile', 'email'].join(' '),
    response_type: 'code',
    access_type: 'offline',
    prompt: 'consent',
  });

  return res.redirect('https://accounts.google.com/o/oauth2/v2/auth?' + stringifiedParams);
};

const googleRedirect = async (req, res, next) => {
  const fullUrl = req.protocol + '://' + req.get('host') + req.originalUrl;
  const urlObj = new URL(fullUrl);
  const urlParams = queryString.parse(urlObj.search);
  const code = urlParams.code;
console.log("Code: " + code) ;
  const tokenData = await axios({
    url: 'https://oauth2.googleapis.com/token',
    method: 'post',
    data: queryString.stringify({
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: process.env.BASE_URI + '/api/auth/google-redirect',
      grant_type: 'authorization_code',
      code,
    }),
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });
console.log("Token data:");
console.log(tokenData.data);
  const userData = await axios({
    url: 'https://www.googleapis.com/oauth2/v2/userinfo',
    method: 'get',
    headers: {
      Authorization: `Bearer ${tokenData.data.access_token}`,
    },
  });
console.log("User data:");
console.log(userData)
  /**
   * TODO: Add verification
   * save to database et al.
   * send to frontend token, not email!
  */
  return res.redirect(`${process.env.FRONTEND_URL}?email=${userData.data.email}`);
};

export { register, logIn, logOut, verifyEmail, resendVerifyEmail, refresh, googleAuth, googleRedirect };
