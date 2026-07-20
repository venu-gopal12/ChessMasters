// Purpose: Express route definitions and validation for notification endpoints.
import express from "express";
import { param } from "express-validator";
import { authMiddleware } from "../middlewares/authMiddlerware.js";
import { validateRequest } from "../middlewares/validateRequest.js";
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead
} from "../controllers/notificationControllers.js";

const router = express.Router();

router.use(authMiddleware);
router.get("/", getNotifications);
router.patch("/read-all", markAllNotificationsRead);
router.patch(
  "/:id/read",
  [param("id").isMongoId().withMessage("Valid notification ID is required")],
  validateRequest,
  markNotificationRead
);

export default router;
