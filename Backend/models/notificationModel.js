// Purpose: Mongoose schema and model definition for notification records.
import mongoose from "mongoose";

const { Schema, model } = mongoose;

const NotificationSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: "UserModel", required: true, index: true },
  type: {
    type: String,
    enum: ["new_article", "new_video", "system", "report_update"],
    required: true
  },
  title: { type: String, required: true, trim: true, maxlength: 160 },
  message: { type: String, trim: true, maxlength: 500 },
  link: { type: String, trim: true, maxlength: 500 },
  readAt: { type: Date, default: null, index: true },
  metadata: { type: Schema.Types.Mixed, default: {} },
}, { timestamps: true });

NotificationSchema.index({ user: 1, createdAt: -1 });

export default model("Notification", NotificationSchema);
