import mongoose from "mongoose";

const { Schema, model } = mongoose;

const BlockSchema = new Schema({
  blocker: { type: Schema.Types.ObjectId, ref: "UserModel", required: true, index: true },
  blocked: { type: Schema.Types.ObjectId, ref: "UserModel", required: true, index: true },
  reason: { type: String, trim: true, maxlength: 500 },
}, { timestamps: true });

BlockSchema.index({ blocker: 1, blocked: 1 }, { unique: true });

export default model("Block", BlockSchema);
