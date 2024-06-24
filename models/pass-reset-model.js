import { Schema, model } from "mongoose";

const ResetPasswordSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    resetToken: {
        type: String,
        required: true
    }
});

export const ResetPassword = model('ResetPassword', ResetPasswordSchema)