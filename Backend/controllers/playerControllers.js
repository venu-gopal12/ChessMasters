import UserModel  from "../models/userModel.js"; 
import CoachDetails from "../models/CoachModel.js";
import Article from "../models/articleModel.js";
import Video from "../models/videoModel.js";
import AdminRevenueModel from "../models/adminRevenueModel.js";
import bcrypt from "bcrypt";

export const getPlayerDetails = async (req, res) => {
  try {
    const userId = req.userId;  // Assuming req.user has the user ID
    const player = await UserModel.findById(userId);

    if (!player) {
      return res.status(404).json({ message: "Player not found" });
    }
    res.status(200).json(player);
  } catch (error) {
    console.error("Error fetching players:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getPlayerDetailsById = async (req, res) => {
  try {
    const playerId = req.params.playerId || req.params.id;
    const player = await UserModel.findById(
      playerId,
      "UserName Role elo gamesWon gamesLost gamesDraw createdAt"
    ).lean();

    if (!player) {
      return res.status(404).json({ message: "Player not found" });
    }
    res.status(200).json({
      _id: player._id,
      UserName: player.UserName,
      Role: player.Role,
      elo: player.elo,
      gamesWon: player.gamesWon,
      gamesLost: player.gamesLost,
      gamesDraw: player.gamesDraw,
      createdAt: player.createdAt,
    });
  } catch (error) {
    console.error("Error fetching player details by ID:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const subscribeToCoach = async (req, res) => {
  try {
    console.log("Request body:", req.body);
    console.log("User ID from token:", req.userId);

    const { coachId, plan } = req.body;
    const playerId = req.userId;
    const plans = {
      Standard: { coachRevenue: 5.04, adminRevenue: 4.95 }
    };
    const selectedPlan = plans[plan];
    if (!selectedPlan) {
      return res.status(400).json({ message: "Invalid subscription plan" });
    }

    const player = await UserModel.findById(playerId);
    if (!player) {
      return res.status(404).json({ message: "Player not found" });
    }
    const coach = await CoachDetails.findOneAndUpdate(
      { _id: coachId, "subscribers.user": { $ne: playerId } },
      {
        $push: { subscribers: { user: playerId, subscribedAt: new Date() } },
        $inc: { revenue: selectedPlan.coachRevenue }
      },
      { new: true }
    );
    if (!coach) {
      if (await CoachDetails.exists({ _id: coachId })) {
        return res.status(409).json({ message: "You are already subscribed to this coach" });
      }
      return res.status(404).json({ message: "Coach not found" });
    }
    try {
      await UserModel.updateOne(
        { _id: playerId },
        { $addToSet: { subscribedCoaches: coach.user } }
      );
      await AdminRevenueModel.findOneAndUpdate(
        {},
        {
          $inc: { totalRevenue: selectedPlan.adminRevenue },
          $set: { lastUpdated: new Date() },
          $push: {
            transactionHistory: {
              amount: selectedPlan.adminRevenue,
              description: `${plan} subscription`,
              date: new Date()
            }
          }
        },
        { upsert: true }
      );
    } catch (error) {
      await CoachDetails.updateOne(
        { _id: coachId },
        {
          $pull: { subscribers: { user: playerId } },
          $inc: { revenue: -selectedPlan.coachRevenue }
        }
      );
      throw error;
    }

    res.status(200).json({ message: "Successfully subscribed to coach", coachId });
  } catch (error) {
    console.error("Error subscribing to coach:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getSubscribedCoaches = async (req, res) => {
  try {
    const playerId = req.userId;

    // Find the player by ID
    const player = await UserModel.findById(playerId);

    if (!player) {
      return res.status(404).json({ message: "Player not found" });
    }

    // Find all coach details where the user ID is in the player's subscribedCoaches array
    const coaches = await CoachDetails.find({
      user: { $in: player.subscribedCoaches }
    }).populate({
      path: 'user',
      select: 'UserName Email'
    });

    // Map the coaches to include both coach details, user details, and subscription dates
    const coachesWithUserDetails = await Promise.all(coaches.map(async (coach) => {
      // Find the subscription entry for this player
      const subscriptionEntry = coach.subscribers.find(
        subscriber => subscriber.user.toString() === playerId
      );
      
      return {
        _id: coach._id,
        user: coach.user,
        UserName: coach.user.UserName,
        Email: coach.user.Email,
        rating: coach.rating,
        hourlyRate: coach.hourlyRate,
        location: coach.location,
        languages: coach.languages,
        Fide_id: coach.Fide_id,
        quote: coach.quote,
        subscribedAt: subscriptionEntry ? subscriptionEntry.subscribedAt : null
      };
    }));

    res.status(200).json(coachesWithUserDetails);
  } catch (error) {
    console.error("Error fetching subscribed coaches for player ID:", req.params.playerId, error);
    res.status(500).json({ message: "Internal server error" });
  }
};


export const subscriptionStatus = async (req,res) => {
  const { coachId } = req.params;
  const playerId = req.userId;
  try {
    const coach = await CoachDetails.findById(coachId);
    if (!coach) return res.status(404).json({ message: "Coach not found" });
    const isSubscribed = coach.subscribers.some(
      subscription => subscription.user.toString() === playerId
    );

    res.status(200).json({ isSubscribed });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to check subscription status." });
  }
}

export const getUsernameById = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await UserModel.findById(userId, 'UserName');
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    res.status(200).json({ username: user.UserName });
  } catch (error) {
    console.error("Error fetching username:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getPlayerGameStats = async (req, res) => {
  try {
    const { playerId } = req.params; // Extract playerId from route parameters
    const requesterId = req.user?.id?.toString();
    const requesterRole = req.user?.role;

    if (requesterRole !== "admin" && requesterId !== playerId.toString()) {
      return res.status(403).json({ message: "You cannot view this player's private stats" });
    }

    const player = await UserModel.findById(
      playerId,
      "gamesWon gamesLost gamesDraw elo eloHistory"
    ).lean();

    if (!player) {
      return res.status(404).json({ message: "Player not found" });
    }

    const gamesWon = player.gamesWon || 0;
    const gamesLost = player.gamesLost || 0;
    const gamesDraw = player.gamesDraw || 0;
    const totalGamesPlayed = gamesWon + gamesLost + gamesDraw;

    // Return the game stats
    res.status(200).json({
      totalGamesPlayed,
      gamesWon,
      gamesLost,
      gamesDraw,
      elo: player.elo || 1200,
      eloHistory: player.eloHistory || [],
    });
  } catch (error) {
    console.error("Error fetching player game stats:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getSubscribedCoachArticles = async (req, res) => {
  try {
    const playerId = req.userId || req.params.playerId; // Get player ID from token or params

    // Find the player and get their subscribed coaches
    const player = await UserModel.findById(playerId);

    if (!player) {
      return res.status(404).json({ message: "Player not found" });
    }

    // Find all articles where the coach is in the player's subscribedCoaches array
    const articles = await Article.find({
      coach: { $in: player.subscribedCoaches }
    })
    .sort({ createdAt: -1 }) // Sort by newest first
    .populate('coach', 'UserName');

    res.status(200).json(articles);
  } catch (error) {
    console.error("Error fetching subscribed coach articles:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getSubscribedCoachVideos = async (req, res) => {
  try {
    const playerId = req.userId || req.params.playerId; // Get player ID from token or params

    // Find the player and get their subscribed coaches
    const player = await UserModel.findById(playerId);

    if (!player) {
      return res.status(404).json({ message: "Player not found" });
    }

    // Find all videos where the coach is in the player's subscribedCoaches array
    const videos = await Video.find({
      coach: { $in: player.subscribedCoaches }
    })
    .sort({ createdAt: -1 }) // Sort by newest first
    .populate('coach', 'UserName');

    res.status(200).json(videos);
  } catch (error) {
    console.error("Error fetching subscribed coach videos:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const unsubscribeFromCoach = async (req, res) => {
  try {
    const { coachId } = req.body; // This is the coach's user ID
    const playerId = req.userId;
    
    console.log("Unsubscribe request received:");
    console.log("Player ID:", playerId);
    console.log("Coach User ID:", coachId);

    // Find the coach by user ID first to verify it exists
    const coach = await CoachDetails.findOne({ user: coachId });
    if (!coach) {
      return res.status(404).json({ message: "Coach not found" });
    }

    // Find the player to verify it exists
    const player = await UserModel.findById(playerId);
    if (!player) {
      return res.status(404).json({ message: "Player not found" });
    }

    // Use updateOne to directly pull the player from the coach's subscribers array
    const coachUpdateResult = await CoachDetails.updateOne(
      { user: coachId },
      { $pull: { subscribers: { user: playerId } } }
    );
    
    console.log("Coach update result:", coachUpdateResult);

    // Use updateOne to directly pull the coach from the player's subscribedCoaches array
    const playerUpdateResult = await UserModel.updateOne(
      { _id: playerId },
      { $pull: { subscribedCoaches: coachId } }
    );
    
    console.log("Player update result:", playerUpdateResult);

    // Verify that the updates were successful
    if (coachUpdateResult.modifiedCount === 0 && playerUpdateResult.modifiedCount === 0) {
      return res.status(400).json({ message: "No subscription found to remove" });
    }

    res.status(200).json({ 
      message: "Successfully unsubscribed from coach",
      coachUpdateResult,
      playerUpdateResult
    });
  } catch (error) {
    console.error("Error unsubscribing from coach:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const updatePlayerProfile = async (req, res) => {
  try {
    const userId = req.userId;
    const { UserName, Email } = req.body;
    
    // Find the player by ID
    const player = await UserModel.findById(userId);
    
    if (!player) {
      return res.status(404).json({ message: "Player not found" });
    }
    
    // Update fields if provided
    if (UserName) player.UserName = UserName;
    if (Email) player.Email = Email;
    
    await player.save();
    
    // Return updated player without password
    const updatedPlayer = await UserModel.findById(userId).select('-Password');
    res.status(200).json(updatedPlayer);
  } catch (error) {
    console.error("Error updating player profile:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const changePlayerPassword = async (req, res) => {
  try {
    const userId = req.userId;
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ message: "Current password, new password, and confirm password are required" });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: "New password and confirm password do not match" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: "New password must be at least 6 characters" });
    }

    const player = await UserModel.findById(userId);

    if (!player) {
      return res.status(404).json({ message: "Player not found" });
    }

    const passwordMatches = await bcrypt.compare(currentPassword, player.Password);

    if (!passwordMatches) {
      return res.status(401).json({ message: "Current password is incorrect" });
    }

    player.Password = newPassword;
    await player.save();

    res.status(200).json({ message: "Password changed successfully" });
  } catch (error) {
    console.error("Error changing player password:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const deletePlayerAccount = async (req, res) => {
  try {
    const playerId = req.userId;
    
    // First, get the player to check for subscriptions
    const player = await UserModel.findById(playerId);
    
    if (!player) {
      return res.status(404).json({ message: "Player not found" });
    }
    
    // Handle any remaining subscriptions
    if (player.subscribedCoaches && player.subscribedCoaches.length > 0) {
      // For each coach the player is subscribed to
      for (const coachId of player.subscribedCoaches) {
        // Remove player from coach's subscribers list
        await CoachDetails.updateOne(
          { user: coachId },
          { $pull: { subscribers: { user: playerId } } }
        );
      }
    }
    
    // Finally, delete the player account
    await UserModel.findByIdAndDelete(playerId);
    
    res.status(200).json({ message: "Account deleted successfully" });
  } catch (error) {
    console.error("Error deleting player account:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}; 
