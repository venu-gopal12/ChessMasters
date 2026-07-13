import mongoose from "mongoose";

const { Schema, model } = mongoose;

const ReportSchema = new Schema({
  reporter: { type: Schema.Types.ObjectId, ref: "UserModel", required: true, index: true },
  targetUser: { type: Schema.Types.ObjectId, ref: "UserModel", required: true, index: true },
  targetRole: { type: String, enum: ["player", "coach"], required: true },
  reason: {
    type: String,
    enum: ["abuse", "spam", "cheating", "inappropriate_content", "other"],
    required: true
  },
  details: { type: String, trim: true, maxlength: 2000 },
  status: { type: String, enum: ["open", "reviewed", "dismissed", "resolved"], default: "open", index: true },
  reviewedBy: { type: Schema.Types.ObjectId, ref: "AdminModel" },
  reviewedAt: { type: Date },
}, { timestamps: true });

ReportSchema.index({ reporter: 1, targetUser: 1, createdAt: -1 });

export default model("Report", ReportSchema);
