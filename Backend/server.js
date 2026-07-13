import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import cookieParser from "cookie-parser";
import http from 'http';
import { Server } from 'socket.io';
import morgan from 'morgan'
import swaggerJsDoc from 'swagger-jsdoc'; // Add this import
import swaggerUI from 'swagger-ui-express'; // Add this import
import path from 'path';
import { fileURLToPath } from 'url';
import { startSubscriptionCleanupJob } from './jobs/subscriptionJobs.js';
import ErrorHandler, { errorMiddleware } from './middlewares/errorHandler.js';
import { port, frontendUrl, mongodbUri, chessMastersBackend } from './config.js';
import { internalOnly } from './middlewares/internalOnly.js';
import { closeRedis, connectRedis } from './redis.js';
import {
  initializeGameSessions,
  restoreGameSessions,
  setGameSessionRedisEnabled,
} from './services/gameSessionService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// import { chessMastersBackend }  from "../config.js";
// Import routes
import authRoutes from "./routes/authRoutes.js";
import playerRoutes from './routes/playerRoutes.js';
import coachRoutes from './routes/coachRoutes.js';
import gameRoutes from './routes/gameRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import videoRoutes from "./routes/videoRoutes.js";
import articleRoutes from "./routes/articleRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import socialRoutes from "./routes/socialRoutes.js";

import UserModel from "./models/userModel.js";

// import { connectRedis } from './redis.js';

const app = express();
// const PORT = process.env.PORT || 3000;

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Chess Masters API',
      version: '1.0.0',
      description: 'API documentation for Chess Masters platform',
      contact: {
        name: 'Chess Masters Team'
      }
    },
    servers: [{
      url: chessMastersBackend,
      description: 'Production Server'
    }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        }
      }
    },
    security: [{
      bearerAuth: []
    }]
  },
  apis: ['./routes/*.js'] // Path to the API docs
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);

// Create a function to modify Swagger paths
function removeApiPrefixFromPaths(swaggerDocument) {
  const modifiedSwagger = JSON.parse(JSON.stringify(swaggerDocument));
  
  if (modifiedSwagger.paths) {
    const newPaths = {};
    
    // Replace all /api/ prefixes in paths
    Object.keys(modifiedSwagger.paths).forEach(path => {
      const newPath = path.replace(/^\/api\//, '/');
      newPaths[newPath] = modifiedSwagger.paths[path];
    });
    
    modifiedSwagger.paths = newPaths;
  }
  
  return modifiedSwagger;
}

// First serve the Swagger UI static files, then set up with the modified docs
app.use('/api-docs', swaggerUI.serve);
app.get('/api-docs', (req, res) => {
  const modifiedDocs = removeApiPrefixFromPaths(swaggerDocs);
  const swaggerHtml = swaggerUI.generateHTML(modifiedDocs);
  res.send(swaggerHtml);
});

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


//------------------------------------------------------
// Origins allowed for both Socket and Backend

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:4173',
  'https://chess-masters.vercel.app',
  'https://chess-masters-gray.vercel.app', // Your actual Vercel deployment
  'http://localhost:80',
  'http://localhost',
  frontendUrl // From environment variable
];


//================== For CORS =============

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
//app.use(cors());

//===========================================

app.use(morgan("dev")); //morgan used here
app.use(express.urlencoded({ extended: true })); // Parses URL-encoded payloads

app.get("/", (req, res) => {
  res.status(200).json({ message: "Welcome to the Chess App API" });
},);

// Routes
app.use("/auth", authRoutes);
app.use("/player", playerRoutes);
app.use("/coach", coachRoutes);
app.use("/game", gameRoutes);
app.use("/admin", adminRoutes);
app.use("/video", videoRoutes);
app.use("/article", articleRoutes);
app.use("/notifications", notificationRoutes);
app.use("/social", socialRoutes);

// connectRedis().then(() => {
//   console.log('Connected to Redis successfully');
// }).catch((err) => {
//   console.error('Redis connection error', err);
// });

// Game stats update endpoint
app.post("/updateGameStats", internalOnly, async (req, res, next) => {
  try {
    const { userId, result, eloChange } = req.body;

    if (!userId || !["win", "loss", "draw"].includes(result)) {
      return res.status(400).json({ error: "Invalid data provided" });
    }

    // Fetch the user's current data
    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Calculate ELO change and determine the next game number
    let actualEloChange;

    if (result === "draw") {
      // For draws, use the provided eloChange
      actualEloChange = eloChange || 0;
    } else {
      // For wins and losses, use the standard calculation
      actualEloChange = result === "win" ? 100 : -100;
    }

    const nextGameNumber = (user.eloHistory?.length || 0) + 1;

    // Prepare the update object
    let update;

    if (result === "win") {
      update = {
        $inc: { gamesWon: 1, elo: actualEloChange },
        $push: { eloHistory: { gameNumber: nextGameNumber, elo: user.elo + actualEloChange } },
      };
    } else if (result === "loss") {
      update = {
        $inc: { gamesLost: 1, elo: actualEloChange },
        $push: { eloHistory: { gameNumber: nextGameNumber, elo: user.elo + actualEloChange } },
      };
    } else { // draw
      update = {
        $inc: { gamesDraw: 1, elo: actualEloChange },
        $push: { eloHistory: { gameNumber: nextGameNumber, elo: user.elo + actualEloChange } },
      };
    }

    // Apply the update
    const updatedUser = await UserModel.findByIdAndUpdate(userId, update, { new: true });

    res.status(200).json({ message: "Game stats updated successfully", user: updatedUser });
  } catch (error) {
    next(error); // Pass error to error handling middleware
  }
});

// 404 Route for handling undefined routes
app.all('*', (req, res, next) => {
  next(new ErrorHandler(`Cannot find ${req.originalUrl} on this server!`, 404));
});

// Error handling middleware - must be last
app.use(errorMiddleware);


//========================== Setting up socket IO =================

// Create an HTTP server
const server = http.createServer(app);


// Initialize Socket.IO with dynamic CORS handling
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    // methods: ['GET', 'POST'],
    credentials: true,
  }, // <== ADD THIS LINE IF NOT PRESENT
});


//==========================================================

initializeGameSessions(io);

// const MONGODB_URI = process.env.MONGODB_URI || "mongodb://0.0.0.0:27017/chessApp";

const startServer = async () => {
  try {
    await mongoose.connect(mongodbUri);
    console.log("Connected to MongoDB database");
    console.log(`Using database: ${mongoose.connection.name}`);
    startSubscriptionCleanupJob();
    const redisEnabled = await connectRedis(io);
    setGameSessionRedisEnabled(redisEnabled);
    if (redisEnabled) await restoreGameSessions();

    server.listen(port, () => {
      console.log(`Server running on port ${port}`);
      console.log(`Frontend URL: ${frontendUrl}`);
    });
  } catch (error) {
    console.error("Server startup error:", error);
    process.exit(1);
  }
};

const shutdown = async () => {
  await closeRedis();
  await mongoose.disconnect();
  server.close(() => process.exit(0));
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

startServer();
