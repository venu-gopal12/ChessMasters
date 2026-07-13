import CoachDetails from "../models/CoachModel.js";
import Notification from "../models/notificationModel.js";

export const notifyUsers = async (notifications) => {
  if (!notifications.length) return [];
  return Notification.insertMany(notifications, { ordered: false });
};

export const notifyCoachSubscribers = async (coachUserId, payload) => {
  const coach = await CoachDetails.findOne({ user: coachUserId }).select("subscribers").lean();
  if (!coach?.subscribers?.length) return [];

  const notifications = coach.subscribers
    .filter(subscription => subscription.user)
    .map(subscription => ({
      user: subscription.user,
      ...payload,
      metadata: {
        ...(payload.metadata || {}),
        coach: coachUserId,
      },
    }));

  return notifyUsers(notifications);
};
