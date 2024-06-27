import WaterTracker from '../models/waterTracker.js';
import { User } from '../models/user.js';

export const createWaterTracker = async (req, res, next) => {
  const { amount, date } = req.body;
  const { id } = req.user;

  try {
    const newWaterTracker = await WaterTracker.create({
      owner: id,
      amount,
      date,
    });
    res.status(201).json(newWaterTracker);
  } catch (error) {
    console.log(error);
    res.status(500);
  }
};

export const updateWaterTracker = async (req, res, next) => {
  const { amount, date } = req.body;
  const { id } = req.params;
  const { id: owner } = req.user;

  try {
    const updatedWaterTracker = await WaterTracker.findByIdAndUpdate(
      { _id: id, owner },
      { amount, date },
      { new: true }
    );

    if (!updatedWaterTracker) {
      res.status(404).end();
    }

    res.json(updatedWaterTracker);
  } catch (error) {
    console.log(error);
    res.status(500);
  }
};

export const deleteWaterTracker = async (req, res, next) => {
  const { id } = req.params;
  const { id: owner } = req.user;

  try {
    await WaterTracker.findByIdAndDelete({ _id: id, owner });

    if (!WaterTracker) {
      res.status(404);
    }

    res.status(204).end();
  } catch (error) {
    console.log(error);
    res.status(500);
  }
};

export const getWaterTrackerByDay = async (req, res, next) => {
  const { id } = req.user;
  const { date } = req.body;

  const startDate = new Date(date);
  const endDate = new Date(date);
  endDate.setUTCHours(23, 59, 59, 999);

  const query = { owner: id, date: { $gte: startDate, $lte: endDate } };

  try {
    const result = await WaterTracker.find(query);

    if (!result) {
      res.status(404).end();
    }

    res.json(result);
  } catch (error) {
    console.log(error);
    res.status(500);
  }
};

export const getWaterTrackerByMonth = async (req, res, next) => {
  const { id } = req.user;
  const { startDate, endDate } = req.body;

  const periodStart = new Date(startDate);
  const periodEnd = new Date(endDate);

  periodEnd.setUTCHours(23, 59, 59, 999);

  try {
    const { dailyNorma } = await User.findById(id);

    const result = await WaterTracker.aggregate([
      {
        $match: {
          owner: id,
          date: {
            $gte: new Date(periodStart),
            $lte: new Date(periodEnd),
          },
        },
      },
      {
        $group: {
          _id: {
            day: { $dayOfMonth: '$date' },
            month: { $month: '$date' },
            year: { $year: '$date' },
          },
          totalAmount: { $sum: '$amount' },
        },
      },
      {
        $addFields: {
          percentageOfNorma: {
            $multiply: [{ $divide: ['$totalAmount', dailyNorma] }, 100],
          },
        },
      },
      {
        $project: {
          _id: 0,
          date: {
            $dateFromParts: {
              year: '$_id.year',
              month: '$_id.month',
              day: '$_id.day',
            },
          },
          totalAmount: 1,
          percentageOfNorma: 1,
        },
      },
      {
        $sort: { date: 1 },
      },
    ]);

    if (!result) {
      res.status(404).end();
    }

    res.json(result);
  } catch (error) {
    console.log(error);
    res.status(500);
  }
};
