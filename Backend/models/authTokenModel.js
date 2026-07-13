import mongoose from "mongoose";

const { Schema, model } = mongoose;

const AuthTokenSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: "UserModel", required: true, index: true },
  type: {
    type: String,
    enum: ["email-verification", "password-reset"],
    required: true,
    index: true
  },
  tokenHash: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true },
  usedAt: { type: Date, default: null },
}, { timestamps: true });

AuthTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default model("AuthToken", AuthTokenSchema);
