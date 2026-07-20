// Purpose: Express controller handlers for admin API behavior.
//admin controllers

import UserModel from '../models/userModel.js';
import CoachDetails from '../models/CoachModel.js';
import ArticleModel from '../models/articleModel.js';
import VideoModel from '../models/videoModel.js';
import GameModel from '../models/gameModel.js';
import AdminModel from '../models/adminModel.js';
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { jwtSecretKey } from '../config.js';
import AdminRevenueModel from '../models/adminRevenueModel.js';
import AuditLog from '../models/auditLogModel.js';
import Report from '../models/reportModel.js';
import Notification from '../models/notificationModel.js';
import { createAuditLog } from '../services/auditService.js';

const recalculateUserGameStats = async (userId) => {
    const games = await GameModel.find({
        $or: [{ playerWhite: userId }, { playerBlack: userId }]
    }).sort({ datePlayed: 1 }).select("playerWhite playerBlack winner").lean();

    let gamesWon = 0;
    let gamesLost = 0;
    let gamesDraw = 0;
    let elo = 1200;
    const eloHistory = [];

    games.forEach((game, index) => {
        if (game.winner === "Draw") {
            gamesDraw += 1;
        } else {
            const playedWhite = game.playerWhite.toString() === userId.toString();
            const won = (playedWhite && game.winner === "White")
                || (!playedWhite && game.winner === "Black");
            if (won) {
                gamesWon += 1;
                elo += 100;
            } else {
                gamesLost += 1;
                elo -= 100;
            }
        }
        eloHistory.push({ gameNumber: index + 1, elo });
    });

    await UserModel.findByIdAndUpdate(userId, {
        $set: { gamesWon, gamesLost, gamesDraw, elo, eloHistory }
    });
};

export const deletePlayer = async (req, res) => {
    try {
        const { playerId } = req.params;
        
        // First check if player exists
        const player = await UserModel.findById(playerId);
        if (!player) {
            return res.status(404).json({ message: "Player not found" });
        }
        
        // Remove player from subscribers list of all coaches
        await CoachDetails.updateMany(
            { "subscribers.user": playerId },
            { $pull: { subscribers: { user: playerId } } }
        );
        
        // Delete the player
        await UserModel.findByIdAndDelete(playerId);
        await createAuditLog(req, {
            action: "delete_player",
            targetType: "player",
            targetId: playerId,
            metadata: { userName: player.UserName, email: player.Email }
        });
        
        res.status(200).json({ message: "Player deleted successfully" });
    } catch (error) {
        console.error("Error deleting player:", error);
        res.status(500).json({ message: "Error deleting player", error: error.message });
    }
};

export const deleteCoach = async (req, res) => {
    try {
        const { coachId } = req.params;
        console.log(`Deleting coach with ID: ${coachId}`);
        
        // First find the coach details since coachId is from CoachDetails model
        const coachDetails = await CoachDetails.findById(coachId);
        if (!coachDetails) {
            return res.status(404).json({ message: "Coach details not found" });
        }

        // Get the associated user ID from coach details
        const userId = coachDetails.user;
        
        // Find and verify the user exists
        const coach = await UserModel.findById(userId);
        if (!coach) {
            // Delete coach details if user not found
            await CoachDetails.findByIdAndDelete(coachId);
            return res.status(200).json({ message: "Coach details deleted (no user found)" });
        }
        
        // Track number of subscribers for response
        const subscribersCount = coachDetails.subscribers ? coachDetails.subscribers.length : 0;
        
        // Clean up subscriptions: loop through all subscribers and remove this coach from their subscribedCoaches array
        if (coachDetails.subscribers && Array.isArray(coachDetails.subscribers)) {
            console.log(`Coach has ${coachDetails.subscribers.length} subscribers to clean up`);
            
            // Process each subscriber
            for (const subscription of coachDetails.subscribers) {
                const playerId = subscription.user;
                
                console.log(`Removing coach ${coachId} from player ${playerId}'s subscribedCoaches array`);
                
                // Update player's subscribedCoaches array to remove this coach
                await UserModel.findByIdAndUpdate(
                    playerId,
                    { $pull: { subscribedCoaches: userId } },
                    { new: true }
                );
            }
            
            // Clear the subscribers array in coach details
            coachDetails.subscribers = [];
            await coachDetails.save();
            console.log(`Cleared subscribers array for coach ${coachId}`);
        } else {
            console.log("No subscribers found for this coach");
        }
        
        // Delete all articles by the coach
        const deletedArticles = await ArticleModel.deleteMany({ coach: userId });
        console.log(`Deleted ${deletedArticles.deletedCount} articles`);
        
        // Delete all videos by the coach
        const deletedVideos = await VideoModel.deleteMany({ coach: userId });
        console.log(`Deleted ${deletedVideos.deletedCount} videos`);
        
        // Delete the coach details
        await CoachDetails.findByIdAndDelete(coachId);
        console.log(`Deleted coach details with ID: ${coachId}`);
        
        // Delete the coach user
        await UserModel.findByIdAndDelete(userId);
        console.log(`Deleted coach user with ID: ${userId}`);
        await createAuditLog(req, {
            action: "delete_coach",
            targetType: "coach",
            targetId: userId,
            metadata: {
                coachDetailsId: coachId,
                articlesDeleted: deletedArticles.deletedCount,
                videosDeleted: deletedVideos.deletedCount,
                subscribersRemoved: subscribersCount
            }
        });
        
        res.status(200).json({ 
            message: "Coach and all related content deleted successfully",
            details: {
                articlesDeleted: deletedArticles.deletedCount,
                videosDeleted: deletedVideos.deletedCount,
                subscribersRemoved: subscribersCount
            }
        });
    } catch (error) {
        console.error("Error deleting coach:", error);
        res.status(500).json({ message: "Error deleting coach", error: error.message });
    }
};

export const deleteArticle = async (req, res) => {
    try {
        const { articleId } = req.params;
        const article = await ArticleModel.findByIdAndDelete(articleId);
        if (!article) return res.status(404).json({ message: "Article not found" });
        await createAuditLog(req, {
            action: "delete_article",
            targetType: "article",
            targetId: articleId,
            metadata: { title: article.title, coach: article.coach }
        });
        res.status(200).json({ message: "Article deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: "Error deleting article", error });
    }
};
export const deleteVideo = async (req, res) => {
    try {
        const { videoId } = req.params;
        const video = await VideoModel.findByIdAndDelete(videoId);
        if (!video) return res.status(404).json({ message: "Video not found" });
        await createAuditLog(req, {
            action: "delete_video",
            targetType: "video",
            targetId: videoId,
            metadata: { title: video.title, coach: video.coach }
        });
        res.status(200).json({ message: "video deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: "Error deleting video", error });
    }
};

export const deleteGame = async (req, res) => {
    try {
        const { gameId } = req.params;
        const deletedGame = await GameModel.findByIdAndDelete(gameId);
        if (!deletedGame) {
            return res.status(404).json({ message: "Game not found" });
        }
        await Promise.all([
            recalculateUserGameStats(deletedGame.playerWhite),
            recalculateUserGameStats(deletedGame.playerBlack)
        ]);
        await createAuditLog(req, {
            action: "delete_game",
            targetType: "game",
            targetId: gameId,
            metadata: {
                playerWhite: deletedGame.playerWhite,
                playerBlack: deletedGame.playerBlack,
                winner: deletedGame.winner
            }
        });
        res.status(200).json({ message: "Game deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: "Error deleting game", error });
    }
};

export const deleteAllGames = async (req, res) => {
    try {
        const result = await GameModel.deleteMany({});
        await UserModel.updateMany(
            {},
            {
                $set: {
                    gamesWon: 0,
                    gamesLost: 0,
                    gamesDraw: 0,
                    elo: 1200,
                    eloHistory: []
                }
            }
        );
        await createAuditLog(req, {
            action: "delete_all_games",
            targetType: "game",
            metadata: { count: result.deletedCount }
        });
        res.status(200).json({ 
            message: "All games deleted and player statistics reset successfully",
            count: result.deletedCount 
        });
    } catch (error) {
        console.error("Error deleting all games:", error);
        res.status(500).json({ message: "Error deleting all games", error: error.message });
    }
};

export const getAllCoaches = async (req, res) => {
    try {
        const coaches = await CoachDetails.find().populate("user", "UserName Email elo");
        console.log('coaches', coaches);
        res.status(200).json(coaches);
    } catch (error) {
        res.status(500).json({ message: "Error fetching coaches", error });
    }
};

export const getAllPlayers = async (req, res) => {
    try {
        const players = await UserModel.find({Role : "player"});
        res.status(200).json(players);
    } catch (error) {
        res.status(500).json({ message: "Error fetching players", error });
    }
};

export const getAllGames = async (req, res) => {
    try {
        const games = await GameModel.find();
        res.status(200).json(games);
    } catch (error) {
        res.status(500).json({ message: "Error fetching games", error });
    }
};
export const getAllArticles = async (req, res) => {
    try {
        const articles = await ArticleModel.find();
        res.status(200).json(articles);
    } catch (error) {
        res.status(500).json({ message: "Error fetching articles", error });
    }
};
export const getAllVideos = async (req, res) => {
    try {
        // const coachId = req.userId;
        // console.log(coachId);
        const videos = await VideoModel.find();
        res.status(200).json(videos);
    } catch (error) {
        res.status(500).json({ message: "Error fetching videos", error });
    }
};


export const getvideos = async (req, res) =>{
    try{
        const videos = await VideoModel.find();
        res.status(200).json(videos);
    } catch (error) {
        res.status(500).json({ message: "Error fetching videos", error: error.message });
    }
}

export const adminLogin = async (req, res) => {
    const { email, password } = req.body;

    try {
        const admin = await AdminModel.findOne({ email });
        if (!admin) {
            return res.status(401).json({ message: "Invalid credentials" });
        }
        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        const token = jwt.sign({ id: admin._id, username: admin.username ,role :'admin'}, jwtSecretKey, {
            expiresIn: '1h',
        });

        res.cookie("authorization", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
            path: "/",
            maxAge: 60 * 60 * 1000
        });

        res.status(200).json({ token, userId: admin._id, role: "admin" });
    } catch (error) {
        console.error("Admin login error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const getCoachGameStats = async (req, res) => {
    try {
        const { coachId } = req.params;
        
        // Find coach details first
        const coachDetails = await CoachDetails.findById(coachId);
        if (!coachDetails) {
            return res.status(404).json({ message: "Coach details not found" });
        }
        
        // Now get the user document to access their game data and ELO
        const userId = coachDetails.user;
        
        const user = await UserModel.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "Coach user not found" });
        }
        
        const gamesWon = user.gamesWon || 0;
        const gamesLost = user.gamesLost || 0;
        const gamesDraw = user.gamesDraw || 0;
        const totalGamesPlayed = gamesWon + gamesLost + gamesDraw;
        const elo = user.elo || 1200;
        
        const stats = {
            totalGamesPlayed,
            gamesWon,
            gamesLost,
            gamesDraw,
            elo
        };
        
        res.status(200).json(stats);
    } catch (error) {
        console.error("Error fetching coach game stats:", error);
        res.status(500).json({ message: "Error fetching coach stats", error: error.message });
    }
};

export const getTotalRevenue = async (req, res) => {
    try {
        // Get the admin revenue record or create one if it doesn't exist
        let revenueRecord = await AdminRevenueModel.findOne();
        
        if (!revenueRecord) {
            revenueRecord = await AdminRevenueModel.create({ 
                totalRevenue: 0,
                transactionHistory: []
            });
        }
        
        res.status(200).json({ 
            totalRevenue: revenueRecord.totalRevenue,
            lastUpdated: revenueRecord.lastUpdated,
            transactionHistory: revenueRecord.transactionHistory
        });
    } catch (error) {
        console.error("Error fetching admin revenue:", error);
        res.status(500).json({ message: "Error fetching admin revenue", error: error.message });
    }
};

export const updateRevenue = async (req, res) => {
    try {
        const { amount, description = "Subscription payment" } = req.body;
        
        if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
            return res.status(400).json({ message: "Invalid amount provided" });
        }
        
        const amountValue = parseFloat(amount);
        
        // Get the admin revenue record or create one if it doesn't exist
        let revenueRecord = await AdminRevenueModel.findOne();
        
        if (!revenueRecord) {
            revenueRecord = await AdminRevenueModel.create({ 
                totalRevenue: amountValue,
                transactionHistory: [{
                    amount: amountValue,
                    description: description
                }]
            });
        } else {
            // Update the existing record by adding the new amount
            revenueRecord.totalRevenue += amountValue;
            
            // Add to transaction history
            revenueRecord.transactionHistory.push({
                amount: amountValue,
                description: description
            });
            
            await revenueRecord.save();
        }
        
        console.log(`Admin revenue updated: +$${amountValue}. New total: $${revenueRecord.totalRevenue}`);
        await createAuditLog(req, {
            action: "update_revenue",
            targetType: "revenue",
            targetId: revenueRecord._id,
            metadata: { amount: amountValue, description, totalRevenue: revenueRecord.totalRevenue }
        });
        
        res.status(200).json({ 
            message: "Admin revenue updated successfully", 
            totalRevenue: revenueRecord.totalRevenue 
        });
    } catch (error) {
        console.error("Error updating admin revenue:", error);
        res.status(500).json({ message: "Error updating admin revenue", error: error.message });
    }
};

export const banUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const { reason = "" } = req.body;

        const user = await UserModel.findByIdAndUpdate(
            userId,
            {
                $set: {
                    Status: "Banned",
                    banReason: reason,
                    bannedAt: new Date(),
                    bannedBy: req.user.id
                }
            },
            { new: true }
        ).select("-Password");

        if (!user) return res.status(404).json({ message: "User not found" });

        await createAuditLog(req, {
            action: "ban_user",
            targetType: user.Role,
            targetId: userId,
            metadata: { reason }
        });

        await Notification.create({
            user: userId,
            type: "system",
            title: "Account banned",
            message: reason || "Your account has been banned by an administrator.",
        });

        res.status(200).json({ message: "User banned", user });
    } catch (error) {
        res.status(500).json({ message: "Error banning user", error: error.message });
    }
};

export const unbanUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const user = await UserModel.findByIdAndUpdate(
            userId,
            { $set: { Status: "Active" }, $unset: { banReason: "", bannedAt: "", bannedBy: "" } },
            { new: true }
        ).select("-Password");

        if (!user) return res.status(404).json({ message: "User not found" });

        await createAuditLog(req, {
            action: "unban_user",
            targetType: user.Role,
            targetId: userId,
        });

        await Notification.create({
            user: userId,
            type: "system",
            title: "Account restored",
            message: "Your account access has been restored.",
        });

        res.status(200).json({ message: "User unbanned", user });
    } catch (error) {
        res.status(500).json({ message: "Error unbanning user", error: error.message });
    }
};

export const getAuditLogs = async (req, res) => {
    try {
        const logs = await AuditLog.find()
            .sort({ createdAt: -1 })
            .limit(200)
            .lean();
        res.status(200).json(logs);
    } catch (error) {
        res.status(500).json({ message: "Error fetching audit logs", error: error.message });
    }
};

export const getReports = async (req, res) => {
    try {
        const reports = await Report.find()
            .populate("reporter", "UserName Email Role")
            .populate("targetUser", "UserName Email Role Status")
            .sort({ createdAt: -1 })
            .limit(200)
            .lean();
        res.status(200).json(reports);
    } catch (error) {
        res.status(500).json({ message: "Error fetching reports", error: error.message });
    }
};

export const updateReportStatus = async (req, res) => {
    try {
        const { reportId } = req.params;
        const { status } = req.body;
        const report = await Report.findByIdAndUpdate(
            reportId,
            { $set: { status, reviewedBy: req.user.id, reviewedAt: new Date() } },
            { new: true }
        );

        if (!report) return res.status(404).json({ message: "Report not found" });

        await createAuditLog(req, {
            action: "update_report_status",
            targetType: "report",
            targetId: reportId,
            metadata: { status }
        });

        res.status(200).json({ message: "Report updated", report });
    } catch (error) {
        res.status(500).json({ message: "Error updating report", error: error.message });
    }
};

// Add a function to get revenue statistics for analytics
export const getRevenueStats = async (req, res) => {
    try {
        const revenueRecord = await AdminRevenueModel.findOne();
        
        if (!revenueRecord) {
            return res.status(200).json({
                totalRevenue: 0,
                dailyRevenue: [],
                monthlyRevenue: []
            });
        }
        
        // Calculate daily revenue for the last 7 days
        const last7Days = [];
        const today = new Date();
        
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(today.getDate() - i);
            date.setHours(0, 0, 0, 0);
            
            const nextDate = new Date(date);
            nextDate.setDate(date.getDate() + 1);
            
            // Filter transactions that occurred on this day
            const dayTransactions = revenueRecord.transactionHistory.filter(t => {
                const transDate = new Date(t.date);
                return transDate >= date && transDate < nextDate;
            });
            
            // Sum the amounts
            const dayTotal = dayTransactions.reduce((sum, t) => sum + t.amount, 0);
            
            last7Days.push({
                date: date.toISOString().split('T')[0],
                amount: dayTotal
            });
        }
        
        // Calculate monthly revenue for the last 6 months
        const last6Months = [];
        
        for (let i = 5; i >= 0; i--) {
            const date = new Date();
            date.setMonth(today.getMonth() - i);
            date.setDate(1);
            date.setHours(0, 0, 0, 0);
            
            const nextMonth = new Date(date);
            nextMonth.setMonth(date.getMonth() + 1);
            
            // Filter transactions that occurred in this month
            const monthTransactions = revenueRecord.transactionHistory.filter(t => {
                const transDate = new Date(t.date);
                return transDate >= date && transDate < nextMonth;
            });
            
            // Sum the amounts
            const monthTotal = monthTransactions.reduce((sum, t) => sum + t.amount, 0);
            
            last6Months.push({
                month: date.toISOString().split('T')[0].substring(0, 7),
                amount: monthTotal
            });
        }
        
        res.status(200).json({
            totalRevenue: revenueRecord.totalRevenue,
            dailyRevenue: last7Days,
            monthlyRevenue: last6Months
        });
    } catch (error) {
        console.error("Error getting revenue stats:", error);
        res.status(500).json({ message: "Error getting revenue stats", error: error.message });
    }
};
