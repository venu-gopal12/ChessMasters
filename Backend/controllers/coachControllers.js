// Purpose: Express controller handlers for coach API behavior.
// import CoachModel from "../models/CoachModel.js";
import axios from "axios";
import bcrypt from "bcrypt";
import CoachDetails from "../models/CoachModel.js";
import ArticleModel from "../models/articleModel.js"; // for default export
import UserModel from "../models/userModel.js";
import videoModel from "../models/videoModel.js";
import upload, {
  deleteCloudinaryAsset,
  getCloudinaryDownloadUrl,
  getCloudinaryResourceType
} from "../middlewares/uploadMiddleware.js";
import mongoose from "mongoose";
import Video from "../models/videoModel.js";
import Article from "../models/articleModel.js";
import ErrorHandler, { catchAsync } from "../middlewares/errorHandler.js";
import { canAccessCoachContentByCoachId } from "../utils/contentAccess.js";
import { notifyCoachSubscribers } from "../services/notificationService.js";

const getUploadedFileData = (file) => ({
  filePath: file.path,
  fileOriginalName: file.originalname || "",
  fileMimeType: file.mimetype || "",
  cloudinaryPublicId: file.filename || file.public_id || "",
  cloudinaryResourceType: file.resource_type || getCloudinaryResourceType(file.mimetype)
});

const isPdfArticle = (article) => {
  const values = [
    article.fileMimeType,
    article.fileOriginalName,
    article.filePath,
    article.cloudinaryPublicId
  ].filter(Boolean);

  return values.some(value => (
    value === 'application/pdf' || /\.pdf($|[?#])/i.test(value)
  ));
};

const isArticleFile = (file) => [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
].includes(file?.mimetype);

const isVideoFile = (file) => file?.mimetype?.startsWith('video/');

const canAccessCoachContent = async (req, content) => {
  const user = await UserModel.findById(req.userId).select("Role subscribedCoaches");
  if (!user) return false;

  const coachId = content.coach?.toString();
  const userId = user._id.toString();

  if (user.Role === "coach") {
    return coachId === userId;
  }

  if (user.Role === "player") {
    return user.subscribedCoaches.some(
      subscribedCoachId => subscribedCoachId.toString() === coachId
    );
  }

  return false;
};



export const getCoachDetails = async (req, res) => {
  try {
    const coachDetails = await CoachDetails.findOne({
      user: req.userId,
    });

    if (!coachDetails) {
      return res.status(404).json({ message: "Coach details not found" });
    }

    res.status(200).json(coachDetails);
  } catch (error) {
    console.error("Error fetching coach details:", error); // Debugging statement
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getAllCoaches = async (req, res) => {
  try {

    const coaches = await CoachDetails.find()
      .populate("user", "UserName")
      .select("-password");

    if (!coaches.length)
      return res.status(404).json({ message: "No coaches found" });

   
    console.log("Serving from MongoDB ");
    res.status(200).json(coaches);
    
  } catch (error) {
    console.error("Error fetching all coach details:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getCoachById = async (req, res) => {
  try {
    const { id } = req.params;
    const coach = await CoachDetails.findById(id).populate("user", "UserName");

    if (!coach) return res.status(404).json({ message: "Coach not found." });

    res.status(200).json(coach);
  } catch (error) {
    console.error("Error fetching coach details:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};

// export const getSubscribedPlayers = async (req, res) => {
//   try {
//     const { coachId } = req.params; // Assuming userId is attached via middleware

//     // Check if the user is a coach
//     const user = await UserModel.findById(coachId);
//     if (!user || user.Role !== "coach") {
//       return res.status(403).json({ error: "Access denied. Not a coach." });
//     }

//     // Find the corresponding CoachDetails document
//     const coach = await CoachDetails.findOne({ user: new mongoose.Types.ObjectId(coachId) }).populate("subscribers");
//     if (!coach) {
//       return res.status(404).json({ error: "Coach profile not found." });
//     }

//     // Send the subscribers
//     return res.status(200).json({ subscribers: coach.subscribers });
//   } catch (error) {
//     console.error(error);
//     return res.status(500).json({ error: "Internal server error." });
//   }
// };
export const getSubscribedPlayers = async (req, res) => {
  try {
    const { coachId } = req.params;
    console.log("coachId", coachId);

    // Check if the user is a coach
    const user = await UserModel.findById(coachId);
    if (!user || user.Role !== "coach") {
      return res.status(403).json({ error: "Access denied. Not a coach." });
    }

    // Find the corresponding CoachDetails document and populate subscribers.user
    const coach = await CoachDetails.findOne({ user: coachId }).populate('subscribers.user');
    console.log("coach", coach);
    if (!coach) {
      return res.status(404).json({ error: "Coach profile not found." });
    }

    // Send the subscribers
    return res.status(200).json({ subscribers: coach.subscribers });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal server error." });
  }
};

export const addArticle = [
  // Handle file upload with error handling
  (req, res, next) => {
    upload.single("file")(req, res, (err) => {
      if (err) {
        console.error("Article upload error:", err);
        return next(new ErrorHandler(err.message || 'File upload error', 400));
      }
      if (!req.file) {
        return next(new ErrorHandler('No file uploaded', 400));
      }
      if (!isArticleFile(req.file)) {
        return next(new ErrorHandler('Articles must be uploaded as PDF or DOCX files', 400));
      }
      next();
    });
  },
  // Process article creation using catchAsync
  catchAsync(async (req, res, next) => {
    const { title, content } = req.body;
    const coachId = req.userId;

    if (!title || !content) {
      return next(new ErrorHandler('Title and content are required', 400));
    }

    const article = new ArticleModel({
      coach: coachId,
      title,
      content,
      ...getUploadedFileData(req.file),
      dateCreated: new Date()
    });

    await article.save();
    await notifyCoachSubscribers(coachId, {
      type: "new_article",
      title: "New coach article",
      message: title,
      link: `/ArticleDetail/${article._id}`,
      metadata: { article: article._id },
    });

    res.status(201).json({ 
      success: true,
      message: "Article added successfully", 
      article 
    });
  })
];

export const addVideo = [
  // Handle file upload with error handling
  (req, res, next) => {
    upload.single("file")(req, res, (err) => {
      if (err) {
        console.error("Video upload error:", err);
        return next(new ErrorHandler(err.message || 'File upload error', 400));
      }
      if (!req.file) {
        return next(new ErrorHandler('No file uploaded', 400));
      }
      if (!isVideoFile(req.file)) {
        return next(new ErrorHandler('Videos must be uploaded as video files', 400));
      }
      next();
    });
  },
  // Process video creation using catchAsync
  catchAsync(async (req, res, next) => {
    const { title, content } = req.body;
    const coachId = req.userId;

    if (!title) {
      return next(new ErrorHandler('Title is required', 400));
    }

    // Create a new video document
    const video = new videoModel({
      coach: coachId,
      title,
      content: content || '',
      ...getUploadedFileData(req.file),
      dateCreated: new Date()
    });

    await video.save();
    await notifyCoachSubscribers(coachId, {
      type: "new_video",
      title: "New coach video",
      message: title,
      link: `/VideoDetail/${video._id}`,
      metadata: { video: video._id },
    });

    res.status(201).json({ 
      success: true,
      message: "Video added successfully", 
      video 
    });
  })
];

export const completeProfile = async (req, res) => {
  const profileId = req.userId;
  const updatedValues = req.body;

  try {
    const updatedUser = await CoachDetails.findOneAndUpdate(
      { user: profileId }, // Match on user field instead of _id
      updatedValues,
      { new: true } // Return the updated document
    );

    if (updatedUser) {
      res.status(200).json({ message: "Profile updated successfully" });
    } else {
      res.status(404).json({ message: "Profile not found" });
    }
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getArticles = async (req, res) => {
  try {
    const articles = await ArticleModel.find({ coach: req.userId }); // Fetch articles by the logged-in coach
    res.status(200).json(articles);
  } catch (error) {
    console.error("Error fetching articles:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getArticleById = async (req, res) => {
  try {
    const article = await ArticleModel.findById(req.params.id); // Find article by ID
    if (!article) {
      return res.status(404).json({ message: "Article not found" });
    }
    if (!(await canAccessCoachContent(req, article))) {
      return res.status(403).json({ message: "You do not have access to this article" });
    }
    res.status(200).json(article); // Return the article details
  } catch (error) {
    console.error("Error fetching article:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getVideos = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.userId)) {
      return res.status(400).json({ message: "Invalid coach ID" });
    }

    const videos = await videoModel.find({ coach: req.userId });
    res.status(200).json(videos);
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getVideoById = async (req, res) => {
  try {
    const video = await videoModel.findById(req.params.id);
    if (!video) {
      return res.status(404).json({ message: "Video not found" });
    }
    if (!(await canAccessCoachContent(req, video))) {
      return res.status(403).json({ message: "You do not have access to this video" });
    }
    res.status(200).json(video);
  } catch (error) {
    console.error("Error fetching video:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getCoachRevenue = async (req, res) => {
  try {
    const { coachId } = req.params;
    console.log("coachId", coachId);
    
    // Find the coach details - look up by user field, not by the document ID
    const coach = await CoachDetails.findOne({ user: coachId });
    console.log("coach", coach);
    
    if (!coach) {
      return res.status(404).json({ message: "Coach not found" });
    }
    
    // Return the revenue
    res.status(200).json({ revenue: coach.revenue || 0 });
  } catch (error) {
    console.error("Error fetching coach revenue:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getCoachContent = async (req, res) => {
  try {
    const { coachId } = req.params;
    if (!(await canAccessCoachContentByCoachId(req, coachId))) {
      return res.status(403).json({ message: "You do not have access to this coach content" });
    }
    
    // Get videos and articles with populated views
    const videos = await Video.find({ coach: coachId });
    const articles = await Article.find({ coach: coachId });
    
    return res.status(200).json({
      videos,
      articles
    });
  } catch (error) {
    console.error("Error fetching coach content:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getCoachVideos = async (req, res) => {
  try {
    const coachId = req.userId;
    
    const videos = await Video.find({ coach: coachId });
    
    return res.status(200).json(videos);
  } catch (error) {
    console.error("Error fetching coach videos:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getCoachArticles = async (req, res) => {
  try {
    const coachId = req.userId;
    
    const articles = await Article.find({ coach: coachId });
    
    return res.status(200).json(articles);
  } catch (error) {
    console.error("Error fetching coach articles:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const updateCoachProfile = async (req, res) => {
  try {
    const userId = req.userId;
    const { UserName, Email, Password } = req.body;
    
    // Find the user by ID
    const user = await UserModel.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: "Coach not found" });
    }
    
    // Update fields if provided
    if (UserName) user.UserName = UserName;
    if (Email) user.Email = Email;
    
    if (Password && Password !== '********') {
      return res.status(400).json({ message: "Use the change-password endpoint to update your password" });
    }
    
    await user.save();
    
    // Return updated user without password
    const updatedUser = await UserModel.findById(userId).select('-Password');
    res.status(200).json(updatedUser);
  } catch (error) {
    console.error("Error updating coach profile:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const deleteCoachAccount = async (req, res) => {
  try {
    const coachId = req.userId;
    
    // Find the coach details
    const coach = await CoachDetails.findOne({ user: coachId });
    
    if (!coach) {
      return res.status(404).json({ message: "Coach not found" });
    }
    
    // Step 1: Update all subscribed players to remove this coach
    if (coach.subscribers && coach.subscribers.length > 0) {
      // Get all subscribed player IDs
      const subscribedPlayerIds = coach.subscribers.map(sub => sub.user);
      
      // Update all those players to remove this coach from their subscribedCoaches array
      await UserModel.updateMany(
        { _id: { $in: subscribedPlayerIds } },
        { $pull: { subscribedCoaches: coachId } }
      );
      
      console.log(`Removed coach from ${subscribedPlayerIds.length} players' subscriptions`);
    }
    
    const articlesToDelete = await ArticleModel.find({ coach: coachId });
    const videosToDelete = await videoModel.find({ coach: coachId });

    await Promise.all([
      ...articlesToDelete.map(article =>
        deleteCloudinaryAsset(article.cloudinaryPublicId, article.cloudinaryResourceType)
      ),
      ...videosToDelete.map(video =>
        deleteCloudinaryAsset(video.cloudinaryPublicId, video.cloudinaryResourceType)
      )
    ]);

    // Step 2: Delete all articles by this coach
    const articlesDeleteResult = await ArticleModel.deleteMany({ coach: coachId });
    console.log(`Deleted ${articlesDeleteResult.deletedCount} articles`);
    
    // Step 3: Delete all videos by this coach
    const videosDeleteResult = await videoModel.deleteMany({ coach: coachId });
    console.log(`Deleted ${videosDeleteResult.deletedCount} videos`);
    
    // Step 4: Delete the coach details from CoachModel
    await CoachDetails.findOneAndDelete({ user: coachId });
    
    // Step 5: Delete the user account from UserModel
    await UserModel.findByIdAndDelete(coachId);
    
    res.status(200).json({ message: "Coach account deleted successfully" });
  } catch (error) {
    console.error("Error deleting coach account:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const updateArticle = [
  // Handle file upload if it exists
  (req, res, next) => {
    // Use this approach to handle file upload
    upload.single("file")(req, res, (err) => {
      if (err) {
        console.error("Article update upload error:", err);
        return next(new ErrorHandler(err.message || 'File upload error', 400));
      }
      if (req.file && !isArticleFile(req.file)) {
        return next(new ErrorHandler('Articles must be uploaded as PDF or DOCX files', 400));
      }
      next();
    });
  },
  // Process article update
  catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const { title, content } = req.body;
    const coachId = req.userId;

    console.log("Update Article Request:", {
      articleId: id,
      coachId: coachId,
      title: title,
      content: content
    });

    // Verify this article belongs to the coach
    const article = await ArticleModel.findById(id);
    
    if (!article) {
      return next(new ErrorHandler('Article not found', 404));
    }
    
    console.log("Found article:", {
      articleId: article._id,
      articleCoach: article.coach,
      requestCoachId: coachId
    });
    
    // Convert both IDs to strings for comparison
    // This is important because MongoDB ObjectId comparison can be tricky
    if (article.coach.toString() !== coachId.toString()) {
      console.log("Authorization failed:", {
        articleCoach: article.coach.toString(),
        requestCoachId: coachId.toString()
      });
      return next(new ErrorHandler('You are not authorized to update this article', 403));
    }
    
    // Prepare update object
    const updateData = {
      title: title || article.title,
      content: content || article.content
    };
    
    const oldCloudinaryPublicId = article.cloudinaryPublicId;
    const oldCloudinaryResourceType = article.cloudinaryResourceType;

    // If a new file was uploaded, update the Cloudinary file details
    if (req.file) {
      Object.assign(updateData, getUploadedFileData(req.file));
    }
    
    console.log("Updating article with data:", updateData);
    
    // Update the article
    const updatedArticle = await ArticleModel.findByIdAndUpdate(
      id, 
      updateData, 
      { new: true }
    );

    if (req.file && oldCloudinaryPublicId) {
      await deleteCloudinaryAsset(oldCloudinaryPublicId, oldCloudinaryResourceType);
    }

    res.status(200).json({ 
      success: true, 
      message: "Article updated successfully", 
      article: updatedArticle 
    });
  })
];

export const updateVideo = [
  // Handle file upload if it exists
  (req, res, next) => {
    upload.single("file")(req, res, (err) => {
      if (err) {
        console.error("Video update upload error:", err);
        return next(new ErrorHandler(err.message || 'File upload error', 400));
      }
      if (req.file && !isVideoFile(req.file)) {
        return next(new ErrorHandler('Videos must be uploaded as video files', 400));
      }
      next();
    });
  },
  // Process video update
  catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const { title, content } = req.body;
    const coachId = req.userId;

    console.log("Update Video Request:", {
      videoId: id,
      coachId: coachId,
      title: title,
      content: content
    });

    // Verify this video belongs to the coach
    const video = await videoModel.findById(id);
    
    if (!video) {
      return next(new ErrorHandler('Video not found', 404));
    }
    
    console.log("Found video:", {
      videoId: video._id,
      videoCoach: video.coach,
      requestCoachId: coachId
    });
    
    // Convert both IDs to strings for comparison
    if (video.coach.toString() !== coachId.toString()) {
      console.log("Authorization failed:", {
        videoCoach: video.coach.toString(),
        requestCoachId: coachId.toString()
      });
      return next(new ErrorHandler('You are not authorized to update this video', 403));
    }
    
    // Prepare update object
    const updateData = {
      title: title || video.title,
      content: content || video.content
    };
    
    const oldCloudinaryPublicId = video.cloudinaryPublicId;
    const oldCloudinaryResourceType = video.cloudinaryResourceType;

    // If a new file was uploaded, update the Cloudinary file details
    if (req.file) {
      Object.assign(updateData, getUploadedFileData(req.file));
    }
    
    console.log("Updating video with data:", updateData);
    
    // Update the video
    const updatedVideo = await videoModel.findByIdAndUpdate(
      id, 
      updateData, 
      { new: true }
    );

    if (req.file && oldCloudinaryPublicId) {
      await deleteCloudinaryAsset(oldCloudinaryPublicId, oldCloudinaryResourceType);
    }

    res.status(200).json({ 
      success: true, 
      message: "Video updated successfully", 
      video: updatedVideo 
    });
  })
];

export const deleteArticle = async (req, res) => {
  try {
    const { id } = req.params;
    const coachId = req.userId;
    
    console.log("Delete article attempt:", {
      articleId: id,
      requestingCoachId: coachId
    });
    
    // Verify this article belongs to the coach
    const article = await ArticleModel.findById(id);
    
    if (!article) {
      return res.status(404).json({ message: 'Article not found' });
    }

    console.log("Article coach ID:", article.coach.toString());
    console.log("Request coach ID:", coachId.toString());
    
    // Convert both IDs to strings for comparison
    if (article.coach.toString() !== coachId.toString()) {
      return res.status(403).json({ message: 'You are not authorized to delete this article' });
    }
    
    await deleteCloudinaryAsset(article.cloudinaryPublicId, article.cloudinaryResourceType);

    // Delete the article
    await ArticleModel.findByIdAndDelete(id);
    
    res.status(200).json({ 
      success: true, 
      message: "Article deleted successfully" 
    });
  } catch (error) {
    console.error("Error deleting article:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const deleteVideo = async (req, res) => {
  try {
    const { id } = req.params;
    const coachId = req.userId;
    
    console.log("Delete video attempt:", {
      videoId: id,
      requestingCoachId: coachId
    });
    
    // Verify this video belongs to the coach
    const video = await videoModel.findById(id);
    
    if (!video) {
      return res.status(404).json({ message: 'Video not found' });
    }
    
    console.log("Video coach ID:", video.coach.toString());
    console.log("Request coach ID:", coachId.toString());
    
    // Convert both IDs to strings for comparison
    if (video.coach.toString() !== coachId.toString()) {
      return res.status(403).json({ message: 'You are not authorized to delete this video' });
    }
    
    await deleteCloudinaryAsset(video.cloudinaryPublicId, video.cloudinaryResourceType);

    // Delete the video
    await videoModel.findByIdAndDelete(id);
    
    res.status(200).json({ 
      success: true, 
      message: "Video deleted successfully" 
    });
  } catch (error) {
    console.error("Error deleting video:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const downloadArticleById = async (req, res) => {
  try {
    const article = await ArticleModel.findById(req.params.id);
    if (!article) {
      return res.status(404).json({ message: "Article not found" });
    }
    if (!(await canAccessCoachContent(req, article))) {
      return res.status(403).json({ message: "You do not have access to this article" });
    }

    if (article.cloudinaryPublicId) {
      const downloadUrl = getCloudinaryDownloadUrl(
        article.cloudinaryPublicId,
        article.cloudinaryResourceType || 'raw'
      );
      return res.redirect(downloadUrl);
    }

    return res.redirect(article.filePath);
  } catch (error) {
    console.error("Error downloading article:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const changeCoachPassword = async (req, res) => {
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

    const coach = await UserModel.findById(userId);
    if (!coach) {
      return res.status(404).json({ message: "Coach not found" });
    }

    const passwordMatches = await bcrypt.compare(currentPassword, coach.Password);
    if (!passwordMatches) {
      return res.status(401).json({ message: "Current password is incorrect" });
    }

    coach.Password = newPassword;
    await coach.save();

    res.status(200).json({ message: "Password changed successfully" });
  } catch (error) {
    console.error("Error changing coach password:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const viewArticlePdfById = async (req, res) => {
  try {
    const article = await ArticleModel.findById(req.params.id);
    if (!article) {
      return res.status(404).json({ message: "Article not found" });
    }
    if (!(await canAccessCoachContent(req, article))) {
      return res.status(403).json({ message: "You do not have access to this article" });
    }

    if (!isPdfArticle(article)) {
      return res.status(400).json({ message: "Only PDF articles can be previewed" });
    }

    const fileUrl = article.cloudinaryPublicId
      ? getCloudinaryDownloadUrl(article.cloudinaryPublicId, article.cloudinaryResourceType || 'raw', false)
      : article.filePath;

    const response = await axios.get(fileUrl, { responseType: "stream" });
    const filename = article.fileOriginalName || `${article.title || 'article'}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${filename.replace(/"/g, '')}"`);
    response.data.pipe(res);
  } catch (error) {
    console.error("Error viewing article PDF:", error.response?.data || error);
    res.status(500).json({ message: "Unable to load PDF article" });
  }
};
