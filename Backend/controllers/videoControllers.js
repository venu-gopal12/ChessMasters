import Video from "../models/videoModel.js";
import { canAccessCoachContentByCoachId } from "../utils/contentAccess.js";

export const recordVideoView = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user ? req.user.id : null;

    const video = await Video.findByIdAndUpdate(
      id,
      {
        $push: {
          views: {
            $each: [{ user: userId, viewedAt: new Date() }],
            $slice: -5000
          }
        }
      },
      { new: false }
    );
    if (!video) {
      return res.status(404).json({ message: "Video not found" });
    }
    
    return res.status(200).json({ message: "View recorded successfully" });
  } catch (error) {
    console.error("Error recording video view:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getVideosByCoach = async (req, res) => {
  try {
    const { coachId } = req.params;
    if (!(await canAccessCoachContentByCoachId(req, coachId))) {
      return res.status(403).json({ message: "You do not have access to these videos" });
    }

    const videos = await Video.find({ coach: coachId });
    return res.status(200).json(videos);
  } catch (error) {
    console.error("Error fetching coach videos:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
