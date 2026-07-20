// Purpose: Shared backend utility helpers for content access rules.
import CoachDetails from "../models/CoachModel.js";
import Block from "../models/blockModel.js";
import UserModel from "../models/userModel.js";

export const canAccessCoachContentByCoachId = async (req, coachId) => {
  const requesterId = req.user?.id || req.userId;
  if (!requesterId) return false;

  if (req.user?.role === "admin") return true;
  if (requesterId.toString() === coachId.toString()) return true;

  const requester = await UserModel.findById(requesterId).select("Role Status subscribedCoaches");
  if (!requester || requester.Status !== "Active") return false;

  const blocked = await Block.exists({
    $or: [
      { blocker: requesterId, blocked: coachId },
      { blocker: coachId, blocked: requesterId },
    ],
  });
  if (blocked) return false;

  if (requester.Role === "coach") {
    return requester._id.toString() === coachId.toString();
  }

  if (requester.Role !== "player") return false;

  const coachProfile = await CoachDetails.findOne({ user: coachId }).select("_id subscribers.user");
  if (!coachProfile) return false;

  return requester.subscribedCoaches.some(
    (subscribedCoachId) => subscribedCoachId.toString() === coachId.toString()
      || subscribedCoachId.toString() === coachProfile._id.toString()
  ) || coachProfile.subscribers.some(
    (subscriber) => subscriber.user?.toString() === requester._id.toString()
  );
};
