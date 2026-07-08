import jwt from "jsonwebtoken";
import UserModel  from "../models/userModel.js"; 
import { jwtSecretKey } from "../config.js";

export const isCoach = async (req, res, next) => {
  try {
    const token = req.cookies.authorization || req.headers.authorization?.replace(/^Bearer\s+/i, "");
    if (!token) return res.status(403).json({ message: "No token provided." });

    const decoded = jwt.verify(token, jwtSecretKey);
    const user = await UserModel.findById(decoded.userId);
    // console.log(user.Role)
    if (!user || user.Role !== "coach") {
      return res.status(403).json({ message: "Unauthorized access." });
    }

    req.userId = user._id; 

    next(); 
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};
