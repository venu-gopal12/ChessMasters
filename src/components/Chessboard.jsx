// Purpose: React UI component for the Chessboard experience.
import React, { useState, useEffect, useRef } from "react";
import { Chessboard } from "react-chessboard";
import { Chess } from "chess.js";
import MoveHistory from "./MoveHistory";
import { useSelector } from 'react-redux';
import io from "socket.io-client";
import { useNavigate, useSearchParams } from "react-router-dom";
import { chessMastersBackend } from "../../config.js";
import LiveCoachingCall from "./LiveCoachingCall";

// Supports both absolute backend URLs and relative reverse-proxy paths.
const socketEndpoint = () => {
  if (chessMastersBackend.startsWith("/")) {
    return {
      url: window.location.origin,
      path: `${chessMastersBackend.replace(/\/$/, "")}/socket.io`,
    };
  }

  return {
    url: chessMastersBackend,
    path: "/socket.io",
  };
};

const MAX_BOARD_WIDTH = 715;
const MIN_BOARD_WIDTH = 280;

const getFullscreenElement = () => (
  document.fullscreenElement ||
  document.webkitFullscreenElement ||
  document.mozFullScreenElement ||
  document.msFullscreenElement
);

const exitFullscreen = () => {
  if (document.exitFullscreen) return document.exitFullscreen();
  if (document.webkitExitFullscreen) return document.webkitExitFullscreen();
  if (document.mozCancelFullScreen) return document.mozCancelFullScreen();
  if (document.msExitFullscreen) return document.msExitFullscreen();
  return Promise.resolve();
};

const requestFullscreen = (element) => {
  if (!element) return Promise.resolve();
  if (element.requestFullscreen) return element.requestFullscreen();
  if (element.webkitRequestFullscreen) return element.webkitRequestFullscreen();
  if (element.mozRequestFullScreen) return element.mozRequestFullScreen();
  if (element.msRequestFullscreen) return element.msRequestFullscreen();
  return Promise.resolve();
};

function ChessBoard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const userId = useSelector((state) => state.user.userId); // Using Redux for userId
  const role = useSelector((state) => state.user.role);
  const isCoachingMode = searchParams.get("mode") === "coaching";
  const coachingCoachId = searchParams.get("coachId");
  const coachingStudentId = searchParams.get("studentId");
  const [game, setGame] = useState(new Chess());
  const [history, setHistory] = useState([]);
  const [winner, setWinner] = useState(null);
  const [gameOver, setGameOver] = useState(false);
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [legalMoves, setLegalMoves] = useState([]);
  const [color, setColor] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [room, setRoom] = useState(null);
  const [boardWidth, setBoardWidth] = useState(650);
  const [players, setPlayers] = useState({
    white: { username: "Opponent", userId: null, elo: 1200 },
    black: { username: "Opponent", userId: null, elo: 1200 },
  });
  const [showResignConfirm, setShowResignConfirm] = useState(false);
  const [showDrawConfirm, setShowDrawConfirm] = useState(false);
  const [drawRequested, setDrawRequested] = useState(false);
  const [drawRequestFrom, setDrawRequestFrom] = useState(null);
  const [gameEndReason, setGameEndReason] = useState(null);
  const [eloChange, setEloChange] = useState(0);
  const [showEloAnimation, setShowEloAnimation] = useState(false);
  const [showRefreshConfirm, setShowRefreshConfirm] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState("Connecting to game server...");
  const [disconnectCountdown, setDisconnectCountdown] = useState(null);
  const [isGameSaved, setIsGameSaved] = useState(false);
  const socket = useRef(null);
  const containerRef = useRef(null);
  const fullscreenContainerRef = useRef(null);
  // Tracks optimistic local moves until the server confirms or rejects them.
  const pendingMoveRef = useRef(null);

  const getMoveKey = (move) => `${move.from}-${move.to}-${move.promotion || ""}`;

  // Resize board logic keeps the square board within both viewport dimensions
  // and the adjacent move-history panel.
  useEffect(() => {
    const updateBoardWidth = () => {
      const isDesktopLayout = window.innerWidth >= 1024;
      const pagePadding = isDesktopLayout ? 48 : 24;
      const layoutGap = isDesktopLayout ? 32 : 24;
      const sidePanelWidth = isDesktopLayout ? Math.min(384, Math.max(320, window.innerWidth * 0.25)) : 0;
      const playerBarsHeight = 112;
      const boardRoomByWidth = window.innerWidth - pagePadding - sidePanelWidth - layoutGap;
      const boardRoomByHeight = window.innerHeight - pagePadding - playerBarsHeight;
      const nextWidth = Math.max(
        MIN_BOARD_WIDTH,
        Math.min(MAX_BOARD_WIDTH, boardRoomByWidth, boardRoomByHeight)
      );

      setBoardWidth(Math.floor(nextWidth));
    };

    window.addEventListener("resize", updateBoardWidth);
    document.addEventListener("fullscreenchange", updateBoardWidth);
    updateBoardWidth();

    return () => {
      window.removeEventListener("resize", updateBoardWidth);
      document.removeEventListener("fullscreenchange", updateBoardWidth);
    };
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(getFullscreenElement()));
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    document.addEventListener("mozfullscreenchange", handleFullscreenChange);
    document.addEventListener("MSFullscreenChange", handleFullscreenChange);
    handleFullscreenChange();

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
      document.removeEventListener("mozfullscreenchange", handleFullscreenChange);
      document.removeEventListener("MSFullscreenChange", handleFullscreenChange);
    };
  }, []);

  // Safe game mutation function clones Chess.js state so React sees a new object.
  function safeGameMutate(modify) {
    setGame((g) => {
      const update = new Chess(g.fen());
      modify(update);
      return update;
    });
  }

  const applyPlayerDetails = (players = []) => {
    const whitePlayer = players.find((p) => p.color === "w");
    const blackPlayer = players.find((p) => p.color === "b");

    setPlayers({
      white: {
        username: whitePlayer?.username || "Waiting",
        userId: whitePlayer?.userId || null,
        elo: whitePlayer?.elo || 1200,
      },
      black: {
        username: blackPlayer?.username || "Waiting",
        userId: blackPlayer?.userId || null,
        elo: blackPlayer?.elo || 1200,
      },
    });
  };

  // Socket connection and game setup
  useEffect(() => {
    if (!userId) {
      console.error('User ID not found. Please log in.');
      return;
    }

    const endpoint = socketEndpoint();
    setConnectionStatus("Connecting to game server...");
    setIsGameSaved(false);
    socket.current = io(endpoint.url, {
      transports: ['websocket'],
      path: endpoint.path,
      withCredentials: true,
      query: { userId }, // Send userId through query using Redux
      // upgrade: false,
      // forceNew: true,
      // path: "/socket.io",
    });

    if (isCoachingMode) {
      setConnectionStatus("Joining coaching board...");
      socket.current.emit("joinCoachingGame", {
        coachId: coachingCoachId,
        studentId: coachingStudentId || userId,
      });
    } else {
      setConnectionStatus("Checking for an active game...");
      socket.current.emit("checkReconnection", userId );
    }

    socket.current.on("reconnected", ({ room, color, fen, players }) => {
      setRoom(room);
      setColor(color);
      setIsConnected(players.length === 2);
      setConnectionStatus("Reconnected to your game.");
      setDisconnectCountdown(null);
      setGame(new Chess(fen));

      applyPlayerDetails(players);
    });

    socket.current.on("notReconnected", () => {
      setConnectionStatus("Finding an opponent...");
      socket.current.emit("joinGame", userId );
    });

    socket.current.on("coachingGameError", (message) => {
      console.error(message);
      alert(message);
      navigate(role === "coach" ? `/coach/${userId}/CoachDashboard` : `/player/${userId}/profile`);
    });

    // IMPORTANT CHANGE: Replace the beforeunload event with a custom handler
    // that shows a confirmation dialog instead of immediately counting as resignation
    const handleBeforeUnload = (e) => {
      if (isConnected && !gameOver) {
        // This displays the browser's default confirmation dialog
        e.preventDefault();
        e.returnValue = "Refreshing will count as resignation. Are you sure?";
        return e.returnValue;
      }
    };
    
    window.addEventListener("beforeunload", handleBeforeUnload);

    socket.current.on("assignColor", (assignedColor) => {
      setColor(assignedColor);
      setConnectionStatus("Waiting for another player...");
    });

    socket.current.on("roomAssigned", (assignedRoom) => {
      setRoom(assignedRoom);
    });

    socket.current.on("startGame", ({ fen, players }) => {
      pendingMoveRef.current = null;
      setIsConnected(true);
      setConnectionStatus("Game in progress");
      setDisconnectCountdown(null);
      setIsGameSaved(false);
      setGame(new Chess(fen));
      // Reset history when game starts to ensure clean state
      setHistory([]);

      // Set player usernames and ELO
      applyPlayerDetails(players);
    });

    socket.current.on("move", ({ move, san }) => {
      setDisconnectCountdown(null);
      const incomingMoveKey = getMoveKey(move);
      if (pendingMoveRef.current?.key === incomingMoveKey) {
        clearTimeout(pendingMoveRef.current.rollbackTimer);
        pendingMoveRef.current = null;
      } else {
        safeGameMutate((gameInstance) => {
          gameInstance.move(move);
        });
      }
      
      // Only update history when receiving moves from server
      // This ensures both clients have the same history
      setHistory((prevHistory) => [...prevHistory, san]);
    });

    socket.current.on("playerResigned", ({ winner }) => {
      handleGameOver(winner, "Resignation");
    });

    socket.current.on("gameOver", ({ winner, reason }) => {
      handleGameOver(winner, reason);
    });

    socket.current.on("playerDisconnected", ({ winner }) => {
      setDisconnectCountdown(null);
      handleGameOver(winner, "Disconnection");
    });

    socket.current.on("opponentDisconnectPending", ({ graceSeconds }) => {
      setDisconnectCountdown(graceSeconds || 10);
      setConnectionStatus("Opponent disconnected. Waiting for reconnection...");
    });

    socket.current.on("gameSaved", () => {
      setIsGameSaved(true);
    });

    // Handle draw request
    socket.current.on("drawRequested", ({ from }) => {
      setDrawRequestFrom(from);
      setShowDrawConfirm(true);
    });

    // Handle draw accepted
    socket.current.on("drawAccepted", ({ reason }) => {
      handleGameOver("Draw", reason);
    });

    // Handle draw declined
    socket.current.on("drawDeclined", () => {
      setDrawRequested(false);
      // Show a notification that the draw was declined
      const notification = document.createElement('div');
      notification.className = 'fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg z-50';
      notification.textContent = 'Draw offer declined';
      document.body.appendChild(notification);
      
      // Remove notification after 3 seconds
      setTimeout(() => {
        notification.remove();
      }, 3000);
    });

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      socket.current.disconnect();
    };
  }, [userId, isCoachingMode, coachingCoachId, coachingStudentId, navigate, role]);

  useEffect(() => {
    if (disconnectCountdown === null || disconnectCountdown <= 0) return undefined;

    const timer = setTimeout(() => {
      setDisconnectCountdown((current) => (
        current === null ? null : Math.max(0, current - 1)
      ));
    }, 1000);

    return () => clearTimeout(timer);
  }, [disconnectCountdown]);

  // Function to check for game ending conditions
  function checkGameEndingConditions() {
    // Don't check if game is already over
    if (gameOver) return;
    
    // Get current move history in the correct format
    const moveHistory = game.history({verbose: false});
    const whiteMoves = moveHistory.filter((_, idx) => idx % 2 === 0);
    const blackMoves = moveHistory.filter((_, idx) => idx % 2 !== 0);
    
    // Check for checkmate
    if (game.in_checkmate()) {
      const winnerColor = game.turn() === "w" ? "Black" : "White";
      
      console.log("Checkmate detected with move history:", whiteMoves, blackMoves);
      
      // We'll only emit the event to server and let the server handle saving
      socket.current.emit("gameOver", { 
        winner: winnerColor, 
        room, 
        reason: "Checkmate",
        moves: {
          whiteMoves,
          blackMoves
        }
      });
      
      // We're just setting state locally, without saving to DB
      handleGameOver(winnerColor, "Checkmate", true);
      return;
    }
    
    // Check for stalemate
    if (game.in_stalemate()) {
      console.log("Stalemate detected with move history:", whiteMoves, blackMoves);
      
      socket.current.emit("gameOver", { 
        winner: "Draw", 
        room, 
        reason: "Stalemate",
        moves: {
          whiteMoves,
          blackMoves
        }
      });
      
      handleGameOver("Draw", "Stalemate", true);
      return;
    }
    
    // Check for threefold repetition
    if (game.in_threefold_repetition()) {
      console.log("Threefold repetition detected with move history:", whiteMoves, blackMoves);
      
      socket.current.emit("gameOver", { 
        winner: "Draw", 
        room, 
        reason: "Threefold Repetition",
        moves: {
          whiteMoves,
          blackMoves
        }
      });
      
      handleGameOver("Draw", "Threefold Repetition", true);
      return;
    }
    
    // Check for insufficient material
    if (game.insufficient_material()) {
      console.log("Insufficient material detected with move history:", whiteMoves, blackMoves);
      
      socket.current.emit("gameOver", { 
        winner: "Draw", 
        room, 
        reason: "Insufficient Material",
        moves: {
          whiteMoves,
          blackMoves
        }
      });
      
      handleGameOver("Draw", "Insufficient Material", true);
      return;
    }
  }

  // Handle game over UI state. The server is the only source that saves results.
  function handleGameOver(winnerColor, reason) {
    // Set UI state
    setWinner(winnerColor);
    setGameEndReason(reason);
    setGameOver(true);
    setIsConnected(false);
    setConnectionStatus("Game over");
    
    // Calculate ELO change for display purposes
    if (winnerColor === "Draw") {
      setEloChange(0);
    } else {
      const playerWon = (color === "w" && winnerColor === "White") || 
                        (color === "b" && winnerColor === "Black");
      const eloChangeValue = playerWon ? 100 : -100;
      setEloChange(eloChangeValue);
    }
    
    // Show ELO animation
    setShowEloAnimation(true);
  }

  function handleResign() {
    if (gameOver) return;
    
    const winnerColor = color === "w" ? "Black" : "White";
    
    // Ensure we get the move history in the correct format
    const moveHistory = game.history({verbose: false});
    const whiteMoves = moveHistory.filter((_, idx) => idx % 2 === 0);
    const blackMoves = moveHistory.filter((_, idx) => idx % 2 !== 0);
    
    console.log("Resigning with move history:", whiteMoves, blackMoves);
    
    // Include the move history when emitting the resignation
    socket.current.emit("playerResigned", { 
      winner: winnerColor, 
      room,
      moves: {
        whiteMoves,
        blackMoves
      }
    });
    
    // Server will save the game result
    handleGameOver(winnerColor, "Resignation", true);
  }

  function handleDrawRequest() {
    if (gameOver || drawRequested) return;
    
    setDrawRequested(true);
    // Get current move history in the correct format
    const moveHistory = game.history({verbose: false});
    const whiteMoves = moveHistory.filter((_, idx) => idx % 2 === 0);
    const blackMoves = moveHistory.filter((_, idx) => idx % 2 !== 0);
    
    socket.current.emit("drawRequest", { 
      room,
      from: {
        color,
        userId: color === "w" ? players.white.userId : players.black.userId,
        elo: color === "w" ? players.white.elo : players.black.elo
      },
      moves: {
        whiteMoves,
        blackMoves
      }
    });
  }

  function handleDrawResponse(accept) {
    setShowDrawConfirm(false);
    
    if (accept) {
      // Ensure we get the proper move history
      const moveHistory = game.history({verbose: false});
      const whiteMoves = moveHistory.filter((_, idx) => idx % 2 === 0);
      const blackMoves = moveHistory.filter((_, idx) => idx % 2 !== 0);
      
      console.log("Accepting draw with move history:", whiteMoves, blackMoves);
      
      socket.current.emit("drawResponse", { 
        room, 
        accepted: true,
        requesterElo: drawRequestFrom.elo,
        responderElo: color === "w" ? players.white.elo : players.black.elo,
        requesterColor: drawRequestFrom.color,
        responderColor: color,
        moves: {
          whiteMoves,
          blackMoves
        }
      });
      
      // Server will save the game result
      handleGameOver("Draw", "Draw Accepted", true);
    } else {
      socket.current.emit("drawResponse", { 
        room, 
        accepted: false,
        requesterColor: drawRequestFrom.color,
        responderColor: color
      });
    }
    
    setDrawRequestFrom(null);
  }

  // Move handling functions
  function onDrop(sourceSquare, targetSquare) {
    return makeMove(sourceSquare, targetSquare);
  }

  function onSquareClick(square) {
    console.log('square', square)
    if (selectedSquare === square) {
      setSelectedSquare(null);
      setLegalMoves([]);
      return;
    }

    const piece = game.get(square);
    console.log('piece', piece)

    if (piece && piece.color === game.turn() && piece.color === color) {
      console.log('first')
      setSelectedSquare(square);
      const moves = game.moves({ square, verbose: true });
      const newLegalMoves = moves.map((move) => move.to);
      setLegalMoves(newLegalMoves);
    } else if (selectedSquare && legalMoves.includes(square)) {
      console.log('second')
      makeMove(selectedSquare, square);
      setSelectedSquare(null);
      setLegalMoves([]);
    } else {
      console.log('third')
      setSelectedSquare(null);
      setLegalMoves([]);
    }
  }

  function makeMove(sourceSquare, targetSquare) {
    console.log('sourceSquare', sourceSquare)
    console.log('targetSquare', targetSquare)
    console.log('game color', game.turn())
    if (game.turn() !== color) return false;
    if (gameOver) return false;

    const move = {
      from: sourceSquare,
      to: targetSquare,
      promotion: "q",
    };

    // Optimistically preview the move, then roll back if the server rejects it
    // or no acknowledgement arrives in time.
    const previousFen = game.fen();
    const preview = new Chess(game.fen());
    const result = preview.move(move);
    console.log('result', result)
    if (result === null) return false;

    const moveKey = getMoveKey(move);
    const rollbackMove = (message = "Move was not accepted by the server.") => {
      if (pendingMoveRef.current?.key !== moveKey) return;
      clearTimeout(pendingMoveRef.current.rollbackTimer);
      pendingMoveRef.current = null;
      setGame(new Chess(previousFen));
      console.error(message);
    };

    pendingMoveRef.current = {
      key: moveKey,
      rollbackTimer: setTimeout(() => rollbackMove("Move confirmation timed out."), 3000),
    };
    setGame(preview);
    socket.current.timeout(2500).emit("move", { move, room }, (error, response) => {
      if (error) {
        rollbackMove("Move request timed out.");
        return;
      }

      if (!response?.ok) {
        rollbackMove(response?.message || "Move was rejected by the server.");
      }
    });
    return true;
  }

  // Custom square styling
  const customSquareStyles = {};
  if (selectedSquare) {
    customSquareStyles[selectedSquare] = {
      backgroundColor: "rgba(255, 255, 0, 0.4)",
    };
    legalMoves.forEach((sq) => {
      customSquareStyles[sq] = {
        backgroundColor: "rgba(0, 255, 0, 0.4)",
      };
    });
  }

  // Restart game function to reuse in both button click and keyboard handler
  const restartGame = () => {
    setGame(new Chess());
    pendingMoveRef.current = null;
    setHistory([]);
    setWinner(null);
    setGameOver(false);
    setIsConnected(false);
    setDrawRequested(false);
    setDrawRequestFrom(null);
    setSelectedSquare(null);
    setLegalMoves([]);
    setGameEndReason(null);
    setEloChange(0);
    setShowEloAnimation(false);
    socket.current.emit("joinGame", userId);
  };

  // Restart game on Enter key
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Enter" && gameOver) {
        restartGame();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [gameOver]);

  // Modify the keyboard event handler to truly prevent default browser behavior
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Detect F5 key or Ctrl+R or Cmd+R (common refresh shortcuts)
      if ((e.key === 'F5' || 
          (e.ctrlKey && e.key === 'r') || 
          (e.metaKey && e.key === 'r')) && 
          isConnected && !gameOver) {
        e.preventDefault();
        e.stopPropagation();
        setShowRefreshConfirm(true);
        return false; // Try to prevent the default in all possible ways
      }
    };
    
    // Capture the event in the capture phase, before it bubbles
    window.addEventListener('keydown', handleKeyDown, { capture: true });
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
    };
  }, [isConnected, gameOver]);

  // Replace the beforeunload handler with a more aggressive approach
  useEffect(() => {
    // This function runs when the user tries to refresh or close the page
    const handleBeforeUnload = (e) => {
      if (isConnected && !gameOver) {
        e.preventDefault();
        e.returnValue = '';
        
        // Show our custom dialog
        setShowRefreshConfirm(true);
        
        return e.returnValue;
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload, { capture: true });
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload, { capture: true });
    };
  }, [isConnected, gameOver]);

  // Add a function to exit fullscreen when game is over
  useEffect(() => {
    if (gameOver && getFullscreenElement()) {
      exitFullscreen().catch((error) => console.error("Could not exit fullscreen:", error));
    }
  }, [gameOver]);

  // Loading state
  if (!color || (!isConnected && !gameOver)) {
    return (
      <div ref={fullscreenContainerRef} className="flex items-center justify-center min-h-screen bg-gradient-to-br from-brand-page via-brand-pageAlt to-black p-4">
        <div className="bg-brand-surface/95 backdrop-blur-sm rounded-xl shadow-2xl p-8 text-center">
          <div className="animate-spin mb-6 mx-auto w-12 h-12 border-4 border-brand-accent border-t-transparent rounded-full"></div>
          <div className="text-xl md:text-2xl font-bold text-brand-ink">
            {connectionStatus}
          </div>
          {disconnectCountdown !== null && (
            <p className="mt-3 text-sm text-brand-muted">
              Resolving in {disconnectCountdown}s
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div ref={fullscreenContainerRef} className="flex flex-col lg:flex-row items-start justify-center min-h-screen bg-gradient-to-br from-brand-page via-brand-pageAlt to-black p-3 sm:p-6 gap-6 lg:gap-8 overflow-auto">
      <div className="w-full lg:w-auto flex flex-col items-center">
        <div 
          ref={containerRef}
          className="w-full lg:w-auto bg-brand-surface/95 backdrop-blur-sm rounded-xl shadow-2xl overflow-hidden transition-all duration-300 ease-in-out"
          style={{ maxWidth: `${boardWidth}px` }}
        >
          <div className="flex justify-between items-center px-4 py-3 bg-brand-surfaceAlt text-white">
            <div className="text-base sm:text-lg font-medium">
              {color === "w" ? players.black.username : players.white.username}
              <span className="ml-2 text-sm bg-brand-action px-2 py-0.5 rounded-full">
                ELO: {color === "w" ? players.black.elo : players.white.elo}
              </span>
            </div>
          </div>
          
          <div className="relative">
            {disconnectCountdown !== null && !gameOver && (
              <div className="absolute left-1/2 top-3 z-40 -translate-x-1/2 rounded-md bg-amber-500 px-4 py-2 text-sm font-semibold text-black shadow-lg">
                Opponent disconnected. Waiting {disconnectCountdown}s...
              </div>
            )}
            <Chessboard
              position={game.fen()}
              onPieceDrop={onDrop}
              onSquareClick={onSquareClick}
              customSquareStyles={customSquareStyles}
              boardOrientation={color === "b" ? "black" : "white"}
              boardWidth={boardWidth}
            />
            {gameOver && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm text-white z-50">
                <div className="text-center space-y-4 p-8 bg-gradient-to-br from-brand-surfaceAlt to-brand-surface rounded-xl backdrop-blur-sm animate-fade-in-down max-w-sm mx-auto shadow-2xl border border-brand-accent/30">
                  <div className="text-3xl sm:text-4xl font-bold text-white mb-2">
                    Game Over
                  </div>
                  <div className="text-xl text-brand-muted font-medium">
                    {winner === "Draw" ? "Result: Draw" : 
                      (winner === (color === "w" ? "White" : "Black") ? 
                        "Result: You Won" : 
                        "Result: You Lost")}
                  </div>
                  <div className="text-lg text-brand-accent font-medium">
                    {gameEndReason && `By ${gameEndReason}`}
                  </div>
                  <div className={`text-sm font-medium ${isGameSaved ? "text-green-300" : "text-brand-muted"}`}>
                    {isGameSaved ? "Game saved" : "Saving game..."}
                  </div>
                  
                  {/* Enhanced ELO Change Animation */}
                  <div className="mt-4 flex justify-center items-center">
                    <div className="text-xl font-bold relative p-4">
                      <div className="animate-fadeIn">
                        {color === "w" ? players.white.elo : players.black.elo}
                      </div>
                      {showEloAnimation && (
                        <span 
                          className={`ml-2 inline-flex items-center ${
                            winner === (color === "w" ? "White" : "Black") ? 'text-green-400' : 
                            winner !== "Draw" ? 'text-red-400' : 
                            'text-yellow-400'
                          } ${winner !== "Draw" ? 'animate-customPulse' : ''} animate-glowEffect`}
                        >
                          {winner === (color === "w" ? "White" : "Black") ? '+100' : 
                           winner !== "Draw" ? '-100' : '0'}
                        </span>
                      )}
                      {showEloAnimation && (
                        <div 
                          className="mt-2 text-white text-2xl font-bold animate-slideUp"
                        >
                          = {(color === "w" ? players.white.elo : players.black.elo) + 
                             (winner === (color === "w" ? "White" : "Black") ? 100 : 
                              winner !== "Draw" ? -100 : 0)}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
                    <button
                      onClick={restartGame}
                      className="px-5 py-2.5 bg-indigo-500 hover:bg-brand-surfaceAlt rounded-lg transition-all text-white font-medium shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                    >
                      <svg xmlns="www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                      </svg>
                      Play Again
                    </button>
                    <button
                      onClick={() => {
                        // const role = localStorage.getItem("role");
                        console.log("User role from redux:", role);
                        
                        // Default to player route if role is missing or not recognized
                        if (role === "coach") {
                          console.log("Navigating to /Index?role=coach");
                          navigate("/Index?role=coach");
                        } else if (role === "player") {
                          console.log("Navigating to /Index?role=player");
                          navigate("/Index?role=player");
                        } else {
                          console.log("Error navigating, found no proper role");                          
                        }
                      }}
                      className="px-5 py-2.5 bg-brand-success hover:bg-green-600 rounded-lg transition-all text-white font-medium shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                    >
                      <svg xmlns="www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z" clipRule="evenodd" />
                      </svg>
                      Back to Home
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            {/* Resignation confirmation modal */}
            {showResignConfirm && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-50">
                <div className="bg-gradient-to-br from-brand-surface to-brand-surfaceAlt rounded-xl p-6 max-w-xs w-full shadow-2xl border border-brand-accent/30 animate-fade-in">
                  <div className="flex items-center mb-4 text-red-500">
                    <svg xmlns="www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <h3 className="text-xl font-bold text-brand-ink">Confirm Resignation</h3>
                  </div>
                  <p className="text-brand-muted mb-6">Are you sure you want to resign? This will count as a loss.</p>
                  <div className="flex justify-end space-x-3">
                    <button 
                      onClick={() => setShowResignConfirm(false)}
                      className="px-4 py-2 bg-brand-surfaceAlt hover:bg-brand-accentSoft rounded-lg text-brand-ink transition-colors shadow-sm hover:shadow"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={() => {
                        setShowResignConfirm(false);
                        handleResign();
                      }}
                      className="px-4 py-2 bg-red-500 hover:bg-red-600 rounded-lg text-white transition-colors shadow-sm hover:shadow"
                    >
                      Resign
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            {/* Draw confirmation modal */}
            {showDrawConfirm && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-50">
                <div className="bg-gradient-to-br from-brand-surface to-brand-surfaceAlt rounded-xl p-6 max-w-xs w-full shadow-2xl border border-brand-accent/30 animate-fade-in">
                  <div className="flex items-center mb-4 text-brand-accent">
                    <svg xmlns="www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <h3 className="text-xl font-bold text-brand-ink">Draw Offer</h3>
                  </div>
                  <p className="text-brand-muted mb-6">Your opponent has offered a draw. Do you accept?</p>
                  <div className="flex justify-end space-x-3">
                    <button 
                      onClick={() => handleDrawResponse(false)}
                      className="px-4 py-2 bg-brand-surfaceAlt hover:bg-brand-accentSoft rounded-lg text-brand-ink transition-colors shadow-sm hover:shadow"
                    >
                      Decline
                    </button>
                    <button 
                      onClick={() => handleDrawResponse(true)}
                      className="px-4 py-2 bg-brand-action hover:bg-brand-actionHover rounded-lg text-white transition-colors shadow-sm hover:shadow"
                    >
                      Accept
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            {/* Draw requested indicator */}
            {drawRequested && !showDrawConfirm && !gameOver && (
              <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-brand-action to-brand-accentHover text-white px-4 py-2 rounded-full text-sm shadow-lg animate-pulse z-40 flex items-center">
                <svg xmlns="www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Draw offered - waiting for response
              </div>
            )}
          </div>
          
          <div className="flex justify-between items-center px-4 py-3 bg-brand-surfaceAlt text-white">
            <div className="text-base sm:text-lg font-medium">
              {color === "w" ? players.white.username : players.black.username} (You)
              <span className="ml-2 text-sm bg-brand-action px-2 py-0.5 rounded-full">
                ELO: {color === "w" ? players.white.elo : players.black.elo}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Loading state overlay */}
      {(!color || (!isConnected && !gameOver)) && (
        <div className="fixed inset-0 flex items-center justify-center bg-brand-pageAlt/90 backdrop-blur-sm z-50">
          <div className="bg-brand-surface rounded-xl shadow-2xl p-8 text-center max-w-md mx-auto animate-fade-in">
            <div className="animate-spin mb-6 mx-auto w-16 h-16 border-4 border-brand-accent border-t-transparent rounded-full"></div>
            <div className="text-2xl md:text-3xl font-bold text-brand-ink mb-2">
              {connectionStatus}
            </div>
            <p className="text-brand-muted">
              {disconnectCountdown !== null
                ? `Opponent has ${disconnectCountdown}s to reconnect`
                : "Please wait while we prepare the board"}
            </p>
          </div>
        </div>
      )}

      <div className="w-full lg:w-80 xl:w-96">
        <LiveCoachingCall
          socket={socket.current}
          room={room}
          enabled={Boolean(room) && !gameOver}
          isInitiator={role === "coach" || (!isCoachingMode && color === "w")}
        />
        <div className="bg-brand-surface/95 backdrop-blur-sm rounded-xl shadow-2xl p-5 h-full max-h-[calc(100vh-3rem)] overflow-y-auto">
          <h2 className="text-xl font-bold text-brand-ink mb-4 border-b border-brand-accent/30 pb-2">Move History</h2>
          <MoveHistory 
            history={history} 
            onResign={() => setShowResignConfirm(true)}
            onDrawRequest={handleDrawRequest}
            gameOver={gameOver} 
          />
        </div>
      </div>

      {/* Refresh confirmation modal */}
      {showRefreshConfirm && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-50">
          <div className="bg-gradient-to-br from-brand-surface to-brand-surfaceAlt rounded-xl p-6 max-w-xs w-full shadow-2xl border border-red-100 animate-fade-in">
            <div className="flex items-center mb-4 text-red-500">
              <svg xmlns="www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <h3 className="text-xl font-bold text-brand-ink">Page Refresh Warning</h3>
            </div>
            <p className="text-brand-muted mb-6">Refreshing the page will count as resignation and you will lose the game. Do you want to resign?</p>
            <div className="flex justify-end space-x-3">
              <button 
                onClick={() => setShowRefreshConfirm(false)}
                className="px-4 py-2 bg-brand-surfaceAlt hover:bg-brand-accentSoft rounded-lg text-brand-ink transition-colors shadow-sm hover:shadow"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  setShowRefreshConfirm(false);
                  handleResign();
                }}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 rounded-lg text-white transition-colors shadow-sm hover:shadow"
              >
                Resign
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add a fullscreen button for additional control */}
      <button 
        onClick={() => {
          const action = getFullscreenElement()
            ? exitFullscreen()
            : requestFullscreen(fullscreenContainerRef.current);

          action.catch((error) => console.error("Could not toggle fullscreen:", error));
        }}
        className="fixed bottom-4 right-4 bg-brand-surfaceAlt text-white p-2 rounded-full shadow-lg z-10 hover:bg-indigo-700 transition-colors"
        title={isFullscreen ? "Exit fullscreen mode" : "Enter fullscreen mode"}
      >
        {isFullscreen ? (
          <svg xmlns="www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9H5V5m0 0 5 5m5-5h4v4m0-4-5 5M9 15H5v4m0 0 5-5m5 5h4v-4m0 4-5-5" />
          </svg>
        ) : (
          <svg xmlns="www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
          </svg>
        )}
      </button>
    </div>
  );
}

export default ChessBoard;





