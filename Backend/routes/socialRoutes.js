import express from "express";
import { body, param } from "express-validator";
import { authMiddleware } from "../middlewares/authMiddlerware.js";
import { createRateLimiter } from "../middlewares/rateLimit.js";
import { validateRequest } from "../middlewares/validateRequest.js";
import {
  blockUser,
  getMyBlocks,
  getMyReports,
  reportUser,
  unblockUser
} from "../controllers/socialControllers.js";

const router = express.Router();
const socialRateLimit = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 60, keyPrefix: "social" });

router.use(authMiddleware);

router.post(
  "/report",
  socialRateLimit,
  [
    body("targetUserId").isMongoId().withMessage("Valid target user is required"),
    body("reason").isIn(["abuse", "spam", "cheating", "inappropriate_content", "other"]).withMessage("Invalid report reason"),
    body("details").optional({ values: "falsy" }).trim().isLength({ max: 2000 }).withMessage("Details are too long"),
  ],
  validateRequest,
  reportUser
);

router.get("/reports/mine", getMyReports);

router.post(
  "/block/:userId",
  socialRateLimit,
  [
    param("userId").isMongoId().withMessage("Valid user ID is required"),
    body("reason").optional({ values: "falsy" }).trim().isLength({ max: 500 }).withMessage("Reason is too long"),
  ],
  validateRequest,
  blockUser
);

router.delete(
  "/block/:userId",
  [param("userId").isMongoId().withMessage("Valid user ID is required")],
  validateRequest,
  unblockUser
);

router.get("/blocks", getMyBlocks);

export default router;
