// Purpose: Mongoose schema and model definition for video records.
import mongoose from "mongoose";

const { Schema, model } = mongoose;

const ViewSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: "UserModel" },
  viewedAt: { type: Date, default: Date.now }
});

const VideoSchema = new Schema({
  coach: { type: Schema.Types.ObjectId, ref: "UserModel", required: true },
  title: { type: String, required: true, trim: true, minlength: 2, maxlength: 160 },
  content: { type: String, required: true, trim: true, maxlength: 10000 }, 
  filePath: { type: String, required: true }, 
  fileOriginalName: { type: String, default: "" },
  fileMimeType: { type: String, default: "" },
  cloudinaryPublicId: { type: String, default: "" },
  cloudinaryResourceType: { type: String, default: "video" },
  thumbnailPath: { type: String, default: "" }, 
  views: [ViewSchema]
}, { timestamps: true });

VideoSchema.index({ coach: 1, createdAt: -1 });

export default model("Video", VideoSchema);
