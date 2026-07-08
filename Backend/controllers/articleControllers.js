import Article from "../models/articleModel.js";

export const recordArticleView = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user ? req.user.id : null;

    const article = await Article.findByIdAndUpdate(
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
    if (!article) {
      return res.status(404).json({ message: "Article not found" });
    }
    
    return res.status(200).json({ message: "View recorded successfully" });
  } catch (error) {
    console.error("Error recording article view:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getArticlesByCoach = async (req, res) => {
  try {
    const { coachId } = req.params;
    const articles = await Article.find({ coach: coachId });
    return res.status(200).json(articles);
  } catch (error) {
    console.error("Error fetching coach articles:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
