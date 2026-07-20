// Purpose: Express route definitions and validation for auth endpoints.
import { Router } from "express";
import { body, oneOf } from "express-validator";
import {
  registerUser,
  signIn,
  logout,
  editDetails,
  getUserDetails,
  requestPasswordReset,
  resendEmailVerification,
  resetPassword,
  verifyEmail
} from "../controllers/authControllers.js";
import { authMiddleware } from "../middlewares/authMiddlerware.js";
import { createRateLimiter } from "../middlewares/rateLimit.js";
import { validateRequest } from "../middlewares/validateRequest.js";

const router = Router();
const authRateLimit = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 25, keyPrefix: "auth" });
const registerValidation = [
  body("UserName").trim().isLength({ min: 3, max: 40 }).withMessage("Username must be 3-40 characters"),
  body("Email").isEmail().normalizeEmail().withMessage("Valid email is required"),
  body("Password").isLength({ min: 6, max: 128 }).withMessage("Password must be 6-128 characters"),
  body("Role").isIn(["player", "coach"]).withMessage("Role must be player or coach"),
  body("Fide_id").optional({ values: "falsy" }).trim().isLength({ max: 40 }).withMessage("FIDE ID is too long"),
];
const signInValidation = [
  body("username").trim().notEmpty().withMessage("Username or email is required"),
  body("password").isLength({ min: 1, max: 128 }).withMessage("Password is required"),
];
const resetRequestValidation = [
  oneOf([
    body("email").isEmail().normalizeEmail(),
    body("Email").isEmail().normalizeEmail(),
  ], { message: "Valid email is required" }),
];
const resetPasswordValidation = [
  body("token").trim().isLength({ min: 32 }).withMessage("Valid reset token is required"),
  body("newPassword").isLength({ min: 6, max: 128 }).withMessage("Password must be 6-128 characters"),
  body("confirmPassword").isLength({ min: 6, max: 128 }).withMessage("Confirm password is required"),
];
const tokenValidation = [
  body("token").trim().isLength({ min: 32 }).withMessage("Valid token is required"),
];

/**
 * @openapi
 * /api/auth/register:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Register a new user
 *     description: Creates a new user account in the system
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *                 example: "John Doe"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "john.doe@example.com"
 *               password:
 *                 type: string
 *                 format: password
 *                 example: "********"
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "User registered successfully"
 *                 token:
 *                   type: string
 *                   example: "eyJhbGciOiJIUzI1NiIsInR5cCI6..."
 *       400:
 *         description: Invalid input or email already in use
 *       500:
 *         description: Server error
 */
router.post("/register", authRateLimit, registerValidation, validateRequest, registerUser);

/**
 * @openapi
 * /api/auth/signin:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Sign in user
 *     description: Authenticates a user and returns a token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "john.doe@example.com"
 *               password:
 *                 type: string
 *                 format: password
 *                 example: "********"
 *     responses:
 *       200:
 *         description: Successfully signed in
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 token:
 *                   type: string
 *                   example: "eyJhbGciOiJIUzI1NiIsInR5cCI6..."
 *                 user:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     email:
 *                       type: string
 *       401:
 *         description: Invalid credentials
 *       500:
 *         description: Server error
 */
router.post("/signin", authRateLimit, signInValidation, validateRequest, signIn);

router.post("/verify-email", authRateLimit, tokenValidation, validateRequest, verifyEmail);
router.post("/resend-verification", authRateLimit, authMiddleware, resendEmailVerification);
router.post("/request-password-reset", authRateLimit, resetRequestValidation, validateRequest, requestPasswordReset);
router.post("/reset-password", authRateLimit, resetPasswordValidation, validateRequest, resetPassword);

/**
 * @openapi
 * /api/auth/logout:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Logout user
 *     description: Logs out the currently authenticated user
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully logged out
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Logged out successfully"
 *       401:
 *         description: Unauthorized - User not authenticated
 *       500:
 *         description: Server error
 */
router.post("/logout", logout);

/**
 * @openapi
 * /api/auth/editdetails:
 *   put:
 *     tags:
 *       - User Management
 *     summary: Edit user details
 *     description: Update authenticated user's profile information
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *     responses:
 *       200:
 *         description: Details updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "User details updated successfully"
 *                 user:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     email:
 *                       type: string
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized - User not authenticated
 *       500:
 *         description: Server error
 */
router.put("/editdetails", authMiddleware, editDetails);

/**
 * @openapi
 * /api/auth/details:
 *   get:
 *     tags:
 *       - User Management
 *     summary: Get user details
 *     description: Retrieve authenticated user's profile information
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: User details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 user:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     email:
 *                       type: string
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *       401:
 *         description: Unauthorized - User not authenticated
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
router.get("/details", authMiddleware, getUserDetails);

export default router;




// import { Router } from "express";
// import {
//   registerUser,
//   signIn,
//   logout,
//   editDetails,
//   getUserDetails
// } from "../controllers/authControllers.js";

// const router = Router();

// router.post("/register", registerUser);

// router.post("/signin", signIn);

// router.post("/logout", logout);

// router.put("/editdetails", editDetails);

// router.get("/details", getUserDetails);

// export default router;
