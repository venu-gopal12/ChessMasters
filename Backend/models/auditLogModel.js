import mongoose from "mongoose";

const { Schema, model } = mongoose;

const AuditLogSchema = new Schema({
  actor: { type: Schema.Types.ObjectId, refPath: "actorModel" },
  actorModel: { type: String, enum: ["AdminModel", "UserModel"] },
  actorRole: { type: String, trim: true },
  action: { type: String, required: true, trim: true, index: true },
  targetType: { type: String, required: true, trim: true, index: true },
  targetId: { type: Schema.Types.ObjectId },
  metadata: { type: Schema.Types.Mixed, default: {} },
  ip: { type: String, trim: true },
  userAgent: { type: String, trim: true },
}, { timestamps: true });

AuditLogSchema.index({ createdAt: -1 });

export default model("AuditLog", AuditLogSchema);
