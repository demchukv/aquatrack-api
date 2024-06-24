import path from 'path';
import fs from 'fs/promises';
import Jimp from 'jimp';

import { User } from '../models/user.js';
import CloudinaryUploadImage from '../helpers/cloudinary.js';

const storeAvatar = path.join(process.cwd(), 'public', 'avatars');

export const current = async (req, res, next) => {
  const { id } = req.user;
  try {
    const user = await User.findOne(id);

    res.json({
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      gender: user.gender,
      weight: user.weight,
      timeActivity: user.timeActivity,
      dailyNorma: user.dailyNorma,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  } catch (error) {
    console.error(error);
    next(error);
  }
};

export const countUsers = async (req, res, next) => {
  try {
    const count = await User.countDocuments();
    res.json({ totalUsers: count });
  } catch (error) {
    console.error(error);
    next(error);
  }
};

export const updateAvatar = async (req, res, next) => {
  const { path: tempUpload, originalname } = req.file;
  const { id } = req.user;
  const extension = path.extname(originalname);
  const filename = `${id}${extension}`;
  const resultUpload = path.join('tmp', filename);

  await fs.rename(tempUpload, resultUpload);

  await Jimp.read(resultUpload)
    .then(image => {
      image.cover(100, 100).quality(75).write(resultUpload);
    })
    .catch(err => {
      console.error(err);
      next(err);
    });

  const avatarUrl = await CloudinaryUploadImage(resultUpload);

  try {
    const data = await User.findByIdAndUpdate(id, {
      avatar: avatarUrl,
    });
    if (!data) {
      await fs.rm(resultUpload);
      return res.status(404).json({
        message: 'Not found',
      });
    }
    await fs.rm(resultUpload);
    return res.json({ avatar: avatarUrl });
  } catch (error) {
    await fs.rm(resultUpload);
    console.error(error);
    next(error);
  }
};


export const updateProfile = async (req, res, next) => {
  const { id } = req.user;
  const { email, name = null, gender = null, weight = null, timeActivity = null, dailyNorma } = req.body;

  if (!email || !dailyNorma) {
    return res.status(400).json({
      message: 'missing fields',
    });
  }

  const user = await User.findOne({ email });
  if (!user) {
    return res.status(404).json({
      message: 'User not found',
    });
  }

  try {
    const updatedUser = await User.findByIdAndUpdate(id, { email, name, gender, weight, timeActivity, dailyNorma }, {
      new: true,
    }
    );
    res.json({
      email: updatedUser.email,
      name: updatedUser.name,
      avatar: updatedUser.avatar,
      gender: updatedUser.gender,
      weight: updatedUser.weight,
      timeActivity: updatedUser.timeActivity,
      dailyNorma: updatedUser.dailyNorma,
      createdAt: updatedUser.createdAt,
      updatedAt: updatedUser.updatedAt,
    });

  } catch (error) {
    console.log(error);
    next(error);
  } 
}
