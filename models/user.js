import mongoose from 'mongoose';
import Joi from 'joi';
import gravatar from 'gravatar';

export const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  repeatPassword: Joi.string().min(8).required(),
});

export const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
});

export const emailSchema = Joi.object({
  email: Joi.string().email().required(),
});

export const userValidateVerifyEmail = Joi.object({
  email: Joi.string().email({ minDomainSegments: 2 }).required(),
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
      type: Number,
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
