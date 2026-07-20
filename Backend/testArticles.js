// Purpose: Manual backend smoke-test script for articles behavior.
import mongoose from "mongoose";
import dotenv from "dotenv";
import { getSubscribedCoachArticles } from "./controllers/playerControllers.js";

dotenv.config();

const uri = "mongodb+srv://beereddyvenugopalreddy2_db_user:6YmJFnjThPYRCemO@chessdb.revc0ua.mongodb.net/?appName=chessDB";

async function run() {
  await mongoose.connect(uri);
  console.log("Connected to MongoDB");

  const req = {
    userId: "69833f41d3c3ffd9026016b5" // The player _id from earlier
  };
  
  const res = {
    status: function(code) {
      console.log("Status:", code);
      return this;
    },
    json: function(data) {
      console.log("Response JSON:", JSON.stringify(data, null, 2));
      return this;
    }
  };

  await getSubscribedCoachArticles(req, res);

  process.exit(0);
}

run().catch(console.dir);
