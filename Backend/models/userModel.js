import mongoose from "mongoose";
import bcrypt from "bcrypt";

const { Schema, model } = mongoose; // Destructure Schema and model from mongoose

const UserModelSchema = new Schema({
  UserName: { type: String, required: true, unique: true, trim: true, minlength: 3, maxlength: 40 },
  Email: { type: String, required: true, unique: true, trim: true, lowercase: true },
  Password: { type: String, required: true },
  Status: { type: String, default: "Active", enum: ["Active", "Banned"] },
  emailVerified: { type: Boolean, default: false },
  emailVerifiedAt: { type: Date },
  banReason: { type: String, trim: true, maxlength: 500 },
  bannedAt: { type: Date },
  bannedBy: { type: Schema.Types.ObjectId, ref: "AdminModel" },
  Role: { type: String, required: true, enum: ["player", "coach"] },
  subscribedCoaches: [{ type: Schema.Types.ObjectId, ref: "CoachDetails" }],
  gamesWon: { type: Number, default: 0 },
  gamesLost: { type: Number, default: 0 },
  gamesDraw: { type: Number, default: 0 },
  elo: { type: Number, default: 1200 }, // Added ELO field
  eloHistory: [
    {
      gameNumber: { type: Number, required: true },
      elo: { type: Number, required: true },
    },
  ], // Added ELO history field
}, { timestamps: true });

UserModelSchema.set("toJSON", {
  transform: (_document, result) => {
    delete result.Password;
    return result;
  },
});

UserModelSchema.pre("save", async function (next) {
  if (this.isModified("Password")) {
    const salt = await bcrypt.genSalt(10);
    this.Password = await bcrypt.hash(this.Password, salt);
  }
  next();
});

export default model("UserModel", UserModelSchema);
