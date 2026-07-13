import mongoose from "mongoose";

const { Schema, model } = mongoose;

// This schema references the UserModel
const CoachDetailsSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: "UserModel", required: true },
  Fide_id: { type: String, trim: true, sparse: true, unique: true },
  quote: { type: String, default: "", trim: true, maxlength: 240 },
  location: { type: String, default: "", trim: true, maxlength: 120 },
  languages: { type: [String], default: [] },
  rating: { type: Number, default: null, min: 0, max: 4000 },
  playingExperience: { type: String, default: "", trim: true, maxlength: 120 },
  teachingExperience: { type: String, default: "", trim: true, maxlength: 120 },
  hourlyRate: { type: Number, default: null, min: 0 },
  aboutMe: { type: String, default: "", trim: true, maxlength: 2000 },
  teachingMethodology: { type: String, default: "", trim: true, maxlength: 2000 },
  revenue: { type: Number, default: 0, min: 0 },
  subscribers: [
    {
      user: { type: Schema.Types.ObjectId, ref: "UserModel" },
      subscribedAt: { type: Date, default: Date.now }, // Store subscription date here
    },
  ],
}, { timestamps: true });

CoachDetailsSchema.index({ user: 1 }, { unique: true });
CoachDetailsSchema.index({ "subscribers.user": 1 });

export default model("CoachDetails", CoachDetailsSchema);
