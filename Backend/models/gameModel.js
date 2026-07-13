import mongoose from "mongoose";

const { Schema, model } = mongoose;

const GameSchema = new Schema({
  gameSessionId: {
    type: String,
    trim: true,
    index: true,
    unique: true,
    sparse: true,
  },
  playerWhite: {
    type: Schema.Types.ObjectId,
    ref: "UserModel",
    required: true,
  },
  playerBlack: {
    type: Schema.Types.ObjectId,
    ref: "UserModel",
    required: true,
  },
  moves: {
    whiteMoves: { type: [String], default: [] },
    blackMoves: { type: [String], default: [] },
  },
  winner: { type: String, enum: ["White", "Black", "Draw"], required: true },
  datePlayed: { type: Date, default: Date.now },
  additionalAttributes: {
    duration: { type: Number },
    rating: { type: Number },
    notes: { type: String },
    reason: { type: String },
  },
});

GameSchema.index({ playerWhite: 1, datePlayed: -1 });
GameSchema.index({ playerBlack: 1, datePlayed: -1 });
GameSchema.index({ datePlayed: -1 });

export default model("Game", GameSchema);
