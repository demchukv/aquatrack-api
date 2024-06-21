
import { User } from "../models/user.js";

export const current = async (req, res, next) => {
  const { _id } = req.user;
  try {
    const user = await User.findOne(_id);
    
    res.json({
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      sex: user.sex,
      weight: user.weight,
      timeInSport: user.timeInSport,
      waterPerDay: user.waterPerDay,
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
}