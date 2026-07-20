// Purpose: Manual backend smoke-test script for db behavior.
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const uri = "mongodb+srv://beereddyvenugopalreddy2_db_user:6YmJFnjThPYRCemO@chessdb.revc0ua.mongodb.net/?appName=chessDB";

async function run() {
  await mongoose.connect(uri);
  console.log("Connected to MongoDB");

  const Article = mongoose.connection.collection("articles");
  const Video = mongoose.connection.collection("videos");
  const User = mongoose.connection.collection("usermodels");
  const Coach = mongoose.connection.collection("coachdetails");

  const articles = await Article.find({}).toArray();
  console.log("Articles:", articles.slice(0, 2));

  const videos = await Video.find({}).toArray();
  console.log("Videos:", videos.slice(0, 2));

  const player = await User.findOne({ Role: "player", subscribedCoaches: { $exists: true, $ne: [] } });
  console.log("Sample Player with subscriptions:", player ? { _id: player._id, subscribedCoaches: player.subscribedCoaches } : "None");

  if (articles.length > 0) {
    const coachOfArticle = await Coach.findOne({ _id: articles[0].coach });
    console.log("Does article.coach match a CoachDetails _id?", !!coachOfArticle);

    const userOfArticle = await User.findOne({ _id: articles[0].coach });
    console.log("Does article.coach match a User _id?", !!userOfArticle);
  }

  process.exit(0);
}

run().catch(console.dir);
