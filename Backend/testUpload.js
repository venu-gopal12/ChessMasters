// Purpose: Manual backend smoke-test script for upload behavior.
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const uri = "mongodb+srv://beereddyvenugopalreddy2_db_user:6YmJFnjThPYRCemO@chessdb.revc0ua.mongodb.net/?appName=chessDB";

async function run() {
  await mongoose.connect(uri);
  const Article = mongoose.connection.collection("articles");
  const docs = await Article.find({ filePath: /ai_ml/ }).toArray();
  console.log(JSON.stringify(docs, null, 2));
  process.exit(0);
}

run().catch(console.error);
