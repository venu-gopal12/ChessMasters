// Purpose: Persist completed games and keep user game statistics in sync.
import Game from "../models/gameModel.js";
import UserModel from "../models/userModel.js";

const STARTING_ELO = 1200;
const ELO_STEP = 100;

export const calculateUserGameStats = async (userId) => {
  const games = await Game.find({
    $or: [{ playerWhite: userId }, { playerBlack: userId }],
  }).sort({ datePlayed: 1 }).select("playerWhite playerBlack winner").lean();

  let gamesWon = 0;
  let gamesLost = 0;
  let gamesDraw = 0;
  let elo = STARTING_ELO;
  const eloHistory = [];

  games.forEach((game, index) => {
    if (game.winner === "Draw") {
      gamesDraw += 1;
    } else {
      const playedWhite = game.playerWhite?.toString() === userId.toString();
      const won = (playedWhite && game.winner === "White") || (!playedWhite && game.winner === "Black");

      if (won) {
        gamesWon += 1;
        elo += ELO_STEP;
      } else {
        gamesLost += 1;
        elo -= ELO_STEP;
      }
    }

    eloHistory.push({ gameNumber: index + 1, elo });
  });

  return {
    totalGamesPlayed: gamesWon + gamesLost + gamesDraw,
    gamesWon,
    gamesLost,
    gamesDraw,
    elo,
    eloHistory,
  };
};

export const refreshUserGameStats = async (userId) => {
  const stats = await calculateUserGameStats(userId);

  await UserModel.findByIdAndUpdate(userId, {
    $set: {
      gamesWon: stats.gamesWon,
      gamesLost: stats.gamesLost,
      gamesDraw: stats.gamesDraw,
      elo: stats.elo,
      eloHistory: stats.eloHistory,
    },
  });

  return stats;
};

export const recordGameResult = async ({
  gameSessionId,
  playerWhite,
  playerBlack,
  moves,
  winner,
  additionalAttributes,
}) => {
  if (gameSessionId) {
    const existingGame = await Game.findOne({ gameSessionId });
    if (existingGame) {
      return { created: false, game: existingGame };
    }
  }

  const newGame = new Game({
    gameSessionId,
    playerWhite,
    playerBlack,
    moves,
    winner,
    additionalAttributes: additionalAttributes || {},
    datePlayed: new Date(),
  });

  try {
    await newGame.save();
  } catch (error) {
    if (error.code === 11000 && gameSessionId) {
      const existingGame = await Game.findOne({ gameSessionId });
      if (existingGame) {
        return { created: false, game: existingGame };
      }
    }

    throw error;
  }

  await Promise.all([
    refreshUserGameStats(playerWhite),
    refreshUserGameStats(playerBlack),
  ]);

  return { created: true, game: newGame };
};
