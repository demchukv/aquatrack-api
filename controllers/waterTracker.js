import WaterTracker from '../models/waterTracker.js';

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
    res.json(result);
  } catch (error) {
    console.log(error);
    res.status(500);
  }
};

export const getWaterTrackerByMonth = async (req, res, next) => {
  const { id } = req.user;
  const { date } = req.body;

  const startDate = new Date(`${date}-01T00:00:00.000Z`);
  const endDate = new Date(startDate);

  endDate.setUTCMonth(endDate.getMonth() + 1);
  endDate.setUTCDate(0);
  endDate.setUTCHours(23, 59, 59, 999);

  const query = { owner: id, date: { $gte: startDate, $lte: endDate } };

  try {
    const result = await WaterTracker.find(query);
    res.json(result);
  } catch (error) {
    console.log(error);
    res.status(500);
  }
};
