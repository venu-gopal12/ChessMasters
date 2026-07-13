import Game from "../models/gameModel.js"; 
import mongoose from "mongoose";
import ErrorHandler, { catchAsync } from "../middlewares/errorHandler.js";
import UserModel from "../models/userModel.js";

const updateUserGameStats = async (userId, result) => {
  const user = await UserModel.findById(userId);
  if (!user) return;

  const eloChange = result === "win" ? 100 : result === "loss" ? -100 : 0;
  const nextGameNumber = (user.eloHistory?.length || 0) + 1;
  const update = {
    $inc: {
      gamesWon: result === "win" ? 1 : 0,
      gamesLost: result === "loss" ? 1 : 0,
      gamesDraw: result === "draw" ? 1 : 0,
      elo: eloChange,
    },
    $push: {
      eloHistory: {
        gameNumber: nextGameNumber,
        elo: (user.elo || 1200) + eloChange,
      },
    },
  };

  await UserModel.findByIdAndUpdate(userId, update);
};

const updateStatsForGame = async ({ playerWhite, playerBlack, winner }) => {
  if (winner === "Draw") {
    await Promise.all([
      updateUserGameStats(playerWhite, "draw"),
      updateUserGameStats(playerBlack, "draw"),
    ]);
    return;
  }

  const whiteWon = winner === "White";
  await Promise.all([
    updateUserGameStats(playerWhite, whiteWon ? "win" : "loss"),
    updateUserGameStats(playerBlack, whiteWon ? "loss" : "win"),
  ]);
};

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

  if (gameSessionId) {
    const existingGame = await Game.findOne({ gameSessionId });
    if (existingGame) {
      return res.status(200).json({ message: "Game result already saved", game: existingGame });
    }
  }

  const newGame = new Game({
    gameSessionId,
    playerWhite,
    playerBlack,
    moves,
    winner,
    additionalAttributes: gameAttributes,
    datePlayed: new Date()
  });

  await newGame.save();
  await updateStatsForGame({ playerWhite, playerBlack, winner });

  res.status(201).json({ message: "Game saved successfully", game: newGame });
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


