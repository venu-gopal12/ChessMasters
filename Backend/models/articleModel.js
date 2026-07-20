// Purpose: Mongoose schema and model definition for article records.
import mongoose from "mongoose";

const { Schema, model } = mongoose;

const ViewSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: "UserModel" },
  viewedAt: { type: Date, default: Date.now }
});

const ArticleSchema = new Schema({
  coach: { type: Schema.Types.ObjectId, ref: "UserModel", required: true },
  title: { type: String, required: true, trim: true, minlength: 2, maxlength: 160 },
  content: { type: String, required: true, trim: true, maxlength: 10000 },
  filePath: { type: String, required: true },  // New field for file path
  fileOriginalName: { type: String, default: "" },
  fileMimeType: { type: String, default: "" },
  cloudinaryPublicId: { type: String, default: "" },
  cloudinaryResourceType: { type: String, default: "raw" },
  views: [ViewSchema]
}, { timestamps: true });

ArticleSchema.index({ coach: 1, createdAt: -1 });

export default model("Article", ArticleSchema);
