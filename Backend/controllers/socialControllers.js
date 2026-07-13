import Block from "../models/blockModel.js";
import Report from "../models/reportModel.js";
import UserModel from "../models/userModel.js";

export const reportUser = async (req, res) => {
  try {
    const { targetUserId, reason, details = "" } = req.body;
    if (targetUserId === req.user.id) {
      return res.status(400).json({ message: "You cannot report yourself" });
    }

    const targetUser = await UserModel.findById(targetUserId).select("Role");
    if (!targetUser) {
      return res.status(404).json({ message: "Target user not found" });
    }

    const report = await Report.create({
      reporter: req.user.id,
      targetUser: targetUserId,
      targetRole: targetUser.Role,
      reason,
      details,
    });

    res.status(201).json({ message: "Report submitted", report });
  } catch (error) {
    res.status(500).json({ message: "Error submitting report", error: error.message });
  }
};

export const getMyReports = async (req, res) => {
  try {
    const reports = await Report.find({ reporter: req.user.id })
      .populate("targetUser", "UserName Role")
      .sort({ createdAt: -1 })
      .lean();
    res.status(200).json(reports);
  } catch (error) {
    res.status(500).json({ message: "Error fetching reports", error: error.message });
  }
};

export const blockUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason = "" } = req.body;

    if (userId === req.user.id) {
      return res.status(400).json({ message: "You cannot block yourself" });
    }

    const targetUser = await UserModel.findById(userId).select("_id");
    if (!targetUser) {
      return res.status(404).json({ message: "User not found" });
    }

    await Block.updateOne(
      { blocker: req.user.id, blocked: userId },
      { $set: { reason } },
      { upsert: true }
    );

    res.status(200).json({ message: "User blocked" });
  } catch (error) {
    res.status(500).json({ message: "Error blocking user", error: error.message });
  }
};

export const unblockUser = async (req, res) => {
  try {
    const { userId } = req.params;
    await Block.deleteOne({ blocker: req.user.id, blocked: userId });
    res.status(200).json({ message: "User unblocked" });
  } catch (error) {
    res.status(500).json({ message: "Error unblocking user", error: error.message });
  }
};

export const getMyBlocks = async (req, res) => {
  try {
    const blocks = await Block.find({ blocker: req.user.id })
      .populate("blocked", "UserName Role")
      .sort({ createdAt: -1 })
      .lean();
    res.status(200).json(blocks);
  } catch (error) {
    res.status(500).json({ message: "Error fetching blocked users", error: error.message });
  }
};
