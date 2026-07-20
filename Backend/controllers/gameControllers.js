// Purpose: Express controller handlers for game API behavior.
import Game from "../models/gameModel.js"; 
import mongoose from "mongoose";
import ErrorHandler, { catchAsync } from "../middlewares/errorHandler.js";
import { recordGameResult } from "../services/gameResultService.js";

export const saveGameResult = catchAsync(async (req, res, next) => {
  const { gameSessionId, playerWhite, playerBlack, moves, winner, additionalAttributes } = req.body;

  // Validate incoming data
  if (!playerWhite || !playerBlack || !winner) {
    return next(new ErrorHandler("Missing required fields", 400));
  }

  // Ensure we have a structured additionalAttributes object
  const gameAttributes = additionalAttributes || {};
  
  // Log what we're saving for debugging
  console.log("Saving game with attributes:", {
    winner,
    reason: gameAttributes.reason || "Not specified",
    moves: moves ? `White: ${moves.whiteMoves?.length || 0}, Black: ${moves.blackMoves?.length || 0}` : "None"
  });

  const result = await recordGameResult({
    gameSessionId,
    playerWhite,
    playerBlack,
    moves,
    winner,
    additionalAttributes: gameAttributes,
  });

  if (!result.created) {
    return res.status(200).json({ message: "Game result already saved", game: result.game });
  }

  res.status(201).json({ message: "Game saved successfully", game: result.game });
});

export const getGameDetails = catchAsync(async (req, res, next) => {
  const { gameId } = req.params;

  const game = await Game.findById(gameId).populate("playerWhite playerBlack", "UserName");
  
  if (!game) {
    return next(new ErrorHandler("Game not found", 404));
  }
  const requestingUser = req.user.id?.toString();
  const isParticipant = [game.playerWhite?._id, game.playerBlack?._id]
    .some(id => id?.toString() === requestingUser);
  if (req.user.role !== "admin" && !isParticipant) {
    return next(new ErrorHandler("You cannot view this game", 403));
  }

  res.status(200).json({ game });
});

export const getAllGames = catchAsync(async (req, res, next) => {
  if (req.user.role !== "admin") {
    return next(new ErrorHandler("Admin access required", 403));
  }
  const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 500);
  const page = Math.max(Number(req.query.page) || 1, 1);
  const games = await Game.find().sort({ datePlayed: -1 }).skip((page - 1) * limit).limit(limit).lean();
  const total = await Game.countDocuments();
  res.status(200).json({ games, page, limit, total });
});

export const getMyGames = catchAsync(async (req, res) => {
  console.log("🔹 Received request to fetch user games");

  const userId = new mongoose.Types.ObjectId(req.user.id); // Convert to ObjectId

  // Fetch games where the user is either playerWhite or playerBlack with populated player data
  const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200);
  const games = await Game.find({
    $or: [{ playerWhite: userId }, { playerBlack: userId }]
  }).sort({ datePlayed: -1 }).limit(limit).populate('playerWhite playerBlack', 'UserName');

  console.log("✅ Games fetched successfully:", games);
  res.status(200).json({ games });
});


