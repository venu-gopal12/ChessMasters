import axios from "axios";
import { Chess } from "chess.js";
import jwt from "jsonwebtoken";
import { chessMastersBackend, jwtSecretKey } from "../config.js";
import { internalApiKey } from "../middlewares/internalOnly.js";
import Block from "../models/blockModel.js";
import CoachDetails from "../models/CoachModel.js";
import UserModel from "../models/userModel.js";
import { loadActiveGames, saveActiveGames, withRedisLock } from "../redis.js";

let games = {};
let redisEnabled = false;
const disconnectTimers = new Map();

const internalApi = axios.create({
  headers: { "x-internal-api-key": internalApiKey },
});

const sameId = (left, right) => left?.toString() === right?.toString();

const usersBlockedEachOther = async (leftUserId, rightUserId) => Boolean(await Block.exists({
  $or: [
    { blocker: leftUserId, blocked: rightUserId },
    { blocker: rightUserId, blocked: leftUserId },
  ],
}));

const getMoveHistory = (game) => {
  const history = game.history();
  return {
    whiteMoves: history.filter((_, idx) => idx % 2 === 0),
    blackMoves: history.filter((_, idx) => idx % 2 !== 0),
  };
};

const publicPlayers = (players = []) => players.map((player) => ({
  userId: player.userId,
  color: player.color,
  username: player.username,
  elo: player.elo,
  participantRole: player.participantRole,
}));

const serializeGames = () => Object.fromEntries(
  Object.entries(games).map(([roomId, room]) => [
    roomId,
    {
      mode: room.mode,
      coachId: room.coachId,
      studentId: room.studentId,
      players: room.players,
      pgn: room.game.pgn(),
      isGameOver: room.isGameOver,
      startedAt: room.startedAt,
    },
  ])
);

const persistGames = () => {
  saveActiveGames(serializeGames()).catch((error) => {
    console.error("Unable to persist active games:", error.message);
  });
};

export const setGameSessionRedisEnabled = (enabled) => {
  redisEnabled = Boolean(enabled);
};

export const restoreGameSessions = async () => {
  const savedGames = await loadActiveGames();
  if (!savedGames) return;

  games = Object.fromEntries(
    Object.entries(savedGames).map(([roomId, room]) => {
      const game = new Chess();
      if (room.pgn) game.loadPgn(room.pgn);
      const isCoachingRoom = room.mode === "coaching" || roomId.startsWith("coaching-");
      const [, restoredCoachId, restoredStudentId] = roomId.match(/^coaching-(.+)-(.+)$/) || [];

      return [roomId, {
        ...room,
        mode: isCoachingRoom ? "coaching" : room.mode,
        coachId: room.coachId || restoredCoachId,
        studentId: room.studentId || restoredStudentId,
        game,
      }];
    })
  );
};

const authenticateSocket = (socket) => {
  const cookieHeader = socket.handshake.headers.cookie || "";
  const authCookie = cookieHeader
    .split(";")
    .map((value) => value.trim())
    .find((value) => value.startsWith("authorization="));
  const suppliedToken = socket.handshake.auth?.token || authCookie?.slice("authorization=".length);
  const decoded = jwt.verify(suppliedToken, jwtSecretKey);
  const userId = decoded.userId || decoded.id;

  if (!userId || decoded.role === "admin") {
    throw new Error("Invalid player identity");
  }

  return userId;
};

const userCanJoinCoachingGame = async ({ userId, coachId, studentId }) => {
  const [user, coachProfile] = await Promise.all([
    UserModel.findById(userId),
    CoachDetails.findOne({ user: coachId, "subscribers.user": studentId }),
  ]);

  if (!user || user.Status !== "Active" || !coachProfile) return null;
  if (await usersBlockedEachOther(coachId, studentId)) return null;

  const isCoach = user.Role === "coach" && sameId(user._id, coachId);
  const isStudent = user.Role === "player" && sameId(user._id, studentId);
  if (!isCoach && !isStudent) return null;

  return { user, color: isStudent ? "w" : "b", participantRole: isStudent ? "student" : "coach" };
};

const saveGameResult = async (roomId, gameRoom, winner, reason) => {
  const whitePlayer = gameRoom.players.find((player) => player.color === "w");
  const blackPlayer = gameRoom.players.find((player) => player.color === "b");
  if (!whitePlayer || !blackPlayer) return;

  await internalApi.post(`${chessMastersBackend}/game/saveGameResult`, {
    gameSessionId: roomId,
    playerWhite: whitePlayer.userId,
    playerBlack: blackPlayer.userId,
    moves: getMoveHistory(gameRoom.game),
    winner,
    additionalAttributes: {
      duration: Math.floor((Date.now() - gameRoom.startedAt) / 1000),
      reason,
    },
  });
};

const finishGameRoom = async (io, roomId, winner, reason, eventName = "gameOver") => {
  const gameRoom = games[roomId];
  if (!gameRoom || gameRoom.isGameOver) return;

  gameRoom.isGameOver = true;
  persistGames();

  saveGameResult(roomId, gameRoom, winner, reason).catch((error) => {
    console.error("Unable to save game result:", error.response?.data || error.message);
  }).then(() => {
    io.to(roomId).emit("gameSaved", { room: roomId });
  });

  io.to(roomId).emit(eventName, { winner, reason });
};

const findPlayerInRoom = (gameRoom, socket, authenticatedUserId) => gameRoom.players.find(
  (player) => player.socketId === socket.id && sameId(player.userId, authenticatedUserId)
);

const handleMove = async (io, socket, authenticatedUserId, { move, room }, ack) => {
  await withRedisLock(`game:${room}`, async () => {
    if (redisEnabled) await restoreGameSessions();
    const gameRoom = games[room];
    if (!gameRoom || gameRoom.isGameOver) {
      ack?.({ ok: false, message: "Game room is not active." });
      return;
    }

    const player = findPlayerInRoom(gameRoom, socket, authenticatedUserId);
    if (!player || player.color !== gameRoom.game.turn()) {
      ack?.({ ok: false, message: "It is not your turn." });
      return;
    }

    const result = gameRoom.game.move(move);
    if (!result) {
      ack?.({ ok: false, message: "Invalid move." });
      return;
    }

    const confirmedMove = { from: result.from, to: result.to, promotion: move.promotion };
    io.to(room).emit("move", { move: confirmedMove, san: result.san });
    ack?.({ ok: true, move: confirmedMove, san: result.san });

    if (gameRoom.game.isCheckmate()) {
      await finishGameRoom(io, room, gameRoom.game.turn() === "w" ? "Black" : "White", "Checkmate");
    } else if (gameRoom.game.isStalemate()) {
      await finishGameRoom(io, room, "Draw", "Stalemate");
    } else if (gameRoom.game.isThreefoldRepetition()) {
      await finishGameRoom(io, room, "Draw", "Threefold Repetition");
    } else if (gameRoom.game.isInsufficientMaterial()) {
      await finishGameRoom(io, room, "Draw", "Insufficient Material");
    } else if (redisEnabled) {
      await saveActiveGames(serializeGames());
    }
  });
};

const joinGame = async (io, socket, authenticatedUserId) => {
  const user = await UserModel.findById(authenticatedUserId);
  if (!user || user.Role === "admin" || user.Status !== "Active") {
    socket.emit("error", "User not found");
    return;
  }

  const assignment = await withRedisLock("matchmaking", async () => {
    if (redisEnabled) await restoreGameSessions();

    let selectedRoom;
    for (const roomId of Object.keys(games)) {
      const gameRoom = games[roomId];
      const waitingPlayerId = gameRoom?.players?.[0]?.userId;
      if (gameRoom
        && gameRoom.mode !== "coaching"
        && !gameRoom.isGameOver
        && gameRoom.players.length === 1
        && !sameId(waitingPlayerId, authenticatedUserId)
        && !(await usersBlockedEachOther(waitingPlayerId, authenticatedUserId))) {
        selectedRoom = roomId;
        break;
      }
    }

    if (!selectedRoom) {
      selectedRoom = `room-${authenticatedUserId}-${Date.now()}`;
      games[selectedRoom] = {
        mode: "standard",
        players: [],
        game: new Chess(),
        isGameOver: false,
        startedAt: Date.now(),
      };
    }

    const gameRoom = games[selectedRoom];
    const existingIndex = gameRoom.players.findIndex((player) => sameId(player.userId, authenticatedUserId));
    const assignedColor = existingIndex >= 0
      ? gameRoom.players[existingIndex].color
      : (gameRoom.players.some((player) => player.color === "w") ? "b" : "w");
    const participant = {
      socketId: socket.id,
      userId: authenticatedUserId,
      color: assignedColor,
      username: user.UserName,
      elo: user.elo || 1200,
    };

    if (existingIndex >= 0) gameRoom.players[existingIndex] = participant;
    else gameRoom.players.push(participant);

    if (redisEnabled) await saveActiveGames(serializeGames());
    return { room: selectedRoom, color: assignedColor };
  });

  const { room, color } = assignment;
  socket.join(room);
  socket.emit("roomAssigned", room);
  socket.emit("assignColor", color);

  if (games[room].players.length === 2) {
    io.to(room).emit("startGame", {
      fen: games[room].game.fen(),
      players: publicPlayers(games[room].players),
    });
  }
};

const joinCoachingGame = async (io, socket, authenticatedUserId, { coachId, studentId }) => {
  if (redisEnabled) await restoreGameSessions();
  const access = await userCanJoinCoachingGame({ userId: authenticatedUserId, coachId, studentId });
  if (!access) {
    socket.emit("coachingGameError", "Only a coach and their subscribed student can join this live session.");
    return;
  }

  const room = `coaching-${coachId}-${studentId}`;
  await withRedisLock(`coaching:${room}`, async () => {
    if (redisEnabled) await restoreGameSessions();
    if (!games[room]) {
      games[room] = {
        mode: "coaching",
        coachId,
        studentId,
        players: [],
        game: new Chess(),
        isGameOver: false,
        startedAt: Date.now(),
      };
    }

    const existingIndex = games[room].players.findIndex((player) => sameId(player.userId, authenticatedUserId));
    const participant = {
      socketId: socket.id,
      userId: authenticatedUserId,
      color: access.color,
      username: access.user.UserName,
      elo: access.user.elo || 1200,
      participantRole: access.participantRole,
    };

    if (existingIndex === -1) games[room].players.push(participant);
    else games[room].players[existingIndex] = participant;

    if (redisEnabled) await saveActiveGames(serializeGames());
  });

  socket.join(room);
  socket.emit("roomAssigned", room);
  socket.emit("assignColor", access.color);
  socket.emit("coachingGameJoined", { room, role: access.participantRole });

  const players = publicPlayers(games[room].players);
  if (games[room].players.length === 2) {
    io.to(room).emit("startGame", { fen: games[room].game.fen(), players });
  } else {
    socket.emit("coachingWaiting", { room, players });
  }
};

const handleDisconnect = (io, socket, authenticatedUserId) => {
  for (const roomId in games) {
    const gameRoom = games[roomId];
    if (gameRoom?.mode === "coaching" && gameRoom.players.some((player) => player.socketId === socket.id)) {
      socket.to(roomId).emit("coachCallEnded");
    }

    if (gameRoom && !gameRoom.isGameOver) {
      const disconnectedPlayer = gameRoom.players.find((player) => player.socketId === socket.id);
      if (disconnectedPlayer && gameRoom.players.length === 2) {
        socket.to(roomId).emit("opponentDisconnectPending", {
          disconnectedUserId: disconnectedPlayer.userId,
          graceSeconds: 10,
        });
      }
    }
  }

  const timerKey = authenticatedUserId.toString();
  const timer = setTimeout(async () => {
    if (redisEnabled) await restoreGameSessions();
    disconnectTimers.delete(timerKey);

    for (const roomId in games) {
      const gameRoom = games[roomId];
      if (!gameRoom || gameRoom.isGameOver) continue;

      const disconnectedPlayerIndex = gameRoom.players.findIndex((player) => player.socketId === socket.id);
      if (disconnectedPlayerIndex === -1) continue;

      const disconnectedPlayer = gameRoom.players[disconnectedPlayerIndex];
      const remainingPlayer = gameRoom.players.find((_, index) => index !== disconnectedPlayerIndex);

      if (!remainingPlayer || gameRoom.players.length < 2) {
        gameRoom.players.splice(disconnectedPlayerIndex, 1);
        if (gameRoom.players.length === 0) delete games[roomId];
        persistGames();
        continue;
      }

      const winner = remainingPlayer.color === "w" ? "White" : "Black";
      await finishGameRoom(io, roomId, winner, "Disconnection", "playerDisconnected");
      io.to(roomId).emit("playerDisconnected", {
        winner,
        winnerId: remainingPlayer.userId,
        loserId: disconnectedPlayer.userId,
        message: "Opponent disconnected or refreshed the page",
      });
    }
  }, 10000);

  disconnectTimers.set(timerKey, timer);
};

export const initializeGameSessions = (io) => {
  io.on("connection", (socket) => {
    let authenticatedUserId;

    try {
      authenticatedUserId = authenticateSocket(socket);
    } catch {
      socket.emit("error", "Authentication required");
      socket.disconnect(true);
      return;
    }

    socket.on("checkReconnection", async () => {
      if (redisEnabled) await restoreGameSessions();

      for (const roomId in games) {
        const gameRoom = games[roomId];
        const playerIndex = gameRoom.players.findIndex((player) => sameId(player.userId, authenticatedUserId));
        if (playerIndex !== -1 && gameRoom.mode !== "coaching" && !gameRoom.isGameOver) {
          const pendingDisconnect = disconnectTimers.get(authenticatedUserId.toString());
          if (pendingDisconnect) {
            clearTimeout(pendingDisconnect);
            disconnectTimers.delete(authenticatedUserId.toString());
          }

          gameRoom.players[playerIndex].socketId = socket.id;
          socket.join(roomId);
          persistGames();

          socket.emit("reconnected", {
            room: roomId,
            color: gameRoom.players[playerIndex].color,
            fen: gameRoom.game.fen(),
            players: publicPlayers(gameRoom.players),
          });
          return;
        }
      }

      socket.emit("notReconnected");
    });

    socket.on("joinGame", () => {
      joinGame(io, socket, authenticatedUserId).catch((error) => {
        console.error("Game joining error:", error);
        socket.emit("error", "Failed to join game");
      });
    });

    socket.on("joinCoachingGame", (payload) => {
      joinCoachingGame(io, socket, authenticatedUserId, payload).catch((error) => {
        console.error("Coaching game join error:", error);
        socket.emit("coachingGameError", "Failed to join coaching game.");
      });
    });

    socket.on("move", (payload, ack) => {
      handleMove(io, socket, authenticatedUserId, payload, ack).catch((error) => {
        console.error("Move handling error:", error);
        ack?.({ ok: false, message: "Move failed." });
      });
    });

    socket.on("playerResigned", async ({ room }) => {
      if (redisEnabled) await restoreGameSessions();
      const gameRoom = games[room];
      if (!gameRoom || gameRoom.isGameOver) return;
      const resigningPlayer = findPlayerInRoom(gameRoom, socket, authenticatedUserId);
      if (!resigningPlayer) return;
      const winnerPlayer = gameRoom.players.find((player) => player.socketId !== socket.id);
      if (!winnerPlayer) return;
      const winner = winnerPlayer.color === "w" ? "White" : "Black";
      await finishGameRoom(io, room, winner, "Resignation", "playerResigned");
      io.to(room).emit("playerResigned", { winner, winnerId: winnerPlayer.userId });
    });

    socket.on("drawRequest", async ({ room }) => {
      if (redisEnabled) await restoreGameSessions();
      const gameRoom = games[room];
      if (!gameRoom || gameRoom.isGameOver) return;
      const requestingPlayer = findPlayerInRoom(gameRoom, socket, authenticatedUserId);
      const opponent = gameRoom.players.find((player) => player.socketId !== socket.id);
      if (requestingPlayer && opponent) {
        io.to(opponent.socketId).emit("drawRequested", {
          from: { color: requestingPlayer.color, username: requestingPlayer.username },
        });
      }
    });

    socket.on("drawResponse", async ({ room, accepted }) => {
      if (redisEnabled) await restoreGameSessions();
      const gameRoom = games[room];
      if (!gameRoom || gameRoom.isGameOver) return;
      const respondingPlayer = findPlayerInRoom(gameRoom, socket, authenticatedUserId);
      if (!respondingPlayer) return;

      if (accepted) {
        await finishGameRoom(io, room, "Draw", "Agreement", "drawAccepted");
        io.to(room).emit("drawAccepted", { reason: "Agreement" });
      } else {
        const requester = gameRoom.players.find((player) => player.socketId !== socket.id);
        if (requester) io.to(requester.socketId).emit("drawDeclined");
      }
    });

    socket.on("gameOver", async ({ room, reason }) => {
      if (redisEnabled) await restoreGameSessions();
      const gameRoom = games[room];
      if (!gameRoom || gameRoom.isGameOver || !findPlayerInRoom(gameRoom, socket, authenticatedUserId)) return;
      if (!gameRoom.game.isGameOver()) return;
      const winner = gameRoom.game.isCheckmate()
        ? (gameRoom.game.turn() === "w" ? "Black" : "White")
        : "Draw";
      await finishGameRoom(io, room, winner, reason || (winner === "Draw" ? "Draw" : "Checkmate"));
    });

    ["coachCallReady", "coachCallOffer", "coachCallAnswer", "coachIceCandidate", "coachCallStatus", "coachCallEnded"]
      .forEach((eventName) => {
        socket.on(eventName, ({ room, ...payload }) => {
          if (room && socket.rooms.has(room)) {
            socket.to(room).emit(eventName === "coachCallReady" ? "coachCallPeerReady" : eventName, payload);
          }
        });
      });

    socket.on("disconnect", () => handleDisconnect(io, socket, authenticatedUserId));
  });
};
