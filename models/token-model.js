import { Schema, model } from "mongoose";

const TokenSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    refreshToken: {
        type: String,
        required: true
    }
})


export const RefreshToken = model('RefreshToken', TokenSchema)