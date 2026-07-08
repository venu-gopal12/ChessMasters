import mongoose from "mongoose";

const { Schema, model } = mongoose;

const ViewSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: "User" },
  viewedAt: { type: Date, default: Date.now }
});

const ArticleSchema = new Schema({
  coach: { type: Schema.Types.ObjectId, ref: "UserModel", required: true },
  title: { type: String, required: true },
  content: { type: String, required: true },
  filePath: { type: String, required: true },  // New field for file path
  fileOriginalName: { type: String, default: "" },
  fileMimeType: { type: String, default: "" },
  cloudinaryPublicId: { type: String, default: "" },
  cloudinaryResourceType: { type: String, default: "raw" },
  createdAt: { type: Date, default: Date.now },
  views: [ViewSchema]
});

ArticleSchema.index({ coach: 1, createdAt: -1 });

export default model("Article", ArticleSchema);
