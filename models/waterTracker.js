import mongoose from 'mongoose';

const waterTrackerSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'user',
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
  },
  {
    versionKey: false,
    timestamps: true,
  }
);

const WaterTracker = mongoose.model('WaterTracker', waterTrackerSchema);

export default WaterTracker;
