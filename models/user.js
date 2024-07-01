import mongoose from 'mongoose';
import Joi from 'joi';
import gravatar from 'gravatar';

export const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  // repeatPassword: Joi.string().min(8).required(),
});

export const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
});

export const resetSchema = Joi.object({
  password: Joi.string().min(8).required(),
  // repeatPassword: Joi.string().min(8).required(),
  resetToken: Joi.string().required(),
});

export const emailSchema = Joi.object({
  email: Joi.string().email().required(),
});

export const userValidateVerifyEmail = Joi.object({
  email: Joi.string().email({ minDomainSegments: 2 }).required(),
});

export const userValidateProfile = Joi.object({
  email: Joi.string().email({ minDomainSegments: 2 }).required(),
  name: Joi.string(),
  gender: Joi.string().valid('male', 'female', ''),
  weight: Joi.number(),
  timeActivity: Joi.string(),
  dailyNorma: Joi.number().required().min(1).max(50000),
});

const userSchema = new mongoose.Schema(
  {
    password: {
      type: String,
      required: [true, 'Password is required'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
    },
    name: {
      type: String,
      default: null,
    },
    gender: {
      type: String,
      enum: ['male', 'female'],
      default: null,
    },
    weight: {
      type: Number,
      default: null,
    },
    timeActivity: {
      type: String,
      default: null,
    },
    dailyNorma: {
      type: Number,
      default: 2000,
    },
    token: {
      type: String,
      default: null,
    },
    avatar: {
      type: String,
      default: null,
    },
    verify: {
      type: Boolean,
      default: false,
    },
    verificationToken: {
      type: String,
      default: null,
      required: [true, 'Verify token is required'],
    },
    googleId: {
      type: String,
      default: null
    },
    displayName: {
      type: String,
      default: null
    }
  },
  {
    versionKey: false,
    timestamps: true,
  }
);

userSchema.methods.setAvatarURL = async function (email) {
  this.avatar = await gravatar.url(email, { s: '100' });
};

export const User = mongoose.model('User', userSchema);
