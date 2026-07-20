// Purpose: Express controller handlers for auth API behavior.
import UserModel from "../models/userModel.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { jwtSecretKey } from "../config.js";
import CoachDetails from "../models/CoachModel.js";
import AdminModel from "../models/adminModel.js";
import { buildFrontendLink, sendEmail } from "../services/emailService.js";
import { consumeAuthToken, createAuthToken } from "../services/tokenService.js";

function generateToken(userId, role) {
  return jwt.sign({ userId, role }, jwtSecretKey, { expiresIn: "7d" });
}

export const registerUser = async (req, res) => {
  try {
    const { UserName, Email, Password, Role, Fide_id } = req.body;
    const userExists = await UserModel.findOne({ Email });
    if (userExists) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const user = new UserModel({
      UserName,
      Email,
      Password,
      Role,
    });

    await user.save();

    if (Role === "coach") {
      const coachDetails = new CoachDetails({
        user: user._id,
        Fide_id,
      });
      await coachDetails.save();
    }

    const verificationToken = await createAuthToken({
      userId: user._id,
      type: "email-verification",
      expiresInMinutes: 24 * 60,
    });

    await sendEmail({
      to: user.Email,
      subject: "Verify your ChessMasters email",
      text: `Welcome to ChessMasters. Verify your email here: ${buildFrontendLink(`/verify-email?token=${verificationToken}`)}`,
    });

    res.status(201).json({ message: "User registered successfully. Verification email sent." });
  } catch (error) {
    console.error("Error during registration:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const signIn = async (req, res) => {
  try {
    const { username, password } = req.body;

    let user;
    let isAdmin = false;

    const admin = await AdminModel.findOne({
      $or: [{ UserName: username }, { email: username }]
    });

    if (admin) {
      const match = await bcrypt.compare(password, admin.password);
      if (!match) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      user = admin;
      isAdmin = true;
    } else {
      user = await UserModel.findOne({
        $or: [{ UserName: username }, { Email: username.toLowerCase() }]
      });
      if (!user) {
        return res.status(401).json({ message: "Invalid user credentials" });
      }

      if (user.Status === "Banned") {
        return res.status(403).json({ message: "Your account is banned", reason: user.banReason });
      }

      const match = await bcrypt.compare(password, user.Password);
      if (!match) {
        return res.status(401).json({ message: "Invalid user credentials" });
      }
    }

    // Generate JWT with appropriate payload
    const payloadId = user._id;
    const role = isAdmin ? "admin" : user.Role;
    const token = generateToken(payloadId, role);

    // Set token in a secure cookie
    res.cookie("authorization", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60 * 1000 // Optional: 7 days
    });

    return res.status(200).json({
      message: "Signed in successfully",
      userType: isAdmin ? "admin" : user?.Role,
      userId: payloadId,
      emailVerified: isAdmin ? true : user.emailVerified,
    });
  } catch (error) {
    console.error("Error during sign-in:", error);
    res.status(500).send({ message: "Internal server error" });
  }
};


export const logout = (req, res) => {
  res.clearCookie("authorization") || req.cookie.token;
  return res.status(200).json({ message: "Logged out successfully" });
};

export const verifyEmail = async (req, res) => {
  try {
    const { token } = req.body;
    const tokenRecord = await consumeAuthToken({ token, type: "email-verification" });

    if (!tokenRecord) {
      return res.status(400).json({ message: "Invalid or expired verification token" });
    }

    await UserModel.findByIdAndUpdate(tokenRecord.user, {
      $set: { emailVerified: true, emailVerifiedAt: new Date() }
    });

    return res.status(200).json({ message: "Email verified successfully" });
  } catch (error) {
    console.error("Error verifying email:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const resendEmailVerification = async (req, res) => {
  try {
    if (req.user.role === "admin") {
      return res.status(400).json({ message: "Admin emails are not verified here" });
    }

    const user = await UserModel.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.emailVerified) return res.status(200).json({ message: "Email is already verified" });

    const verificationToken = await createAuthToken({
      userId: user._id,
      type: "email-verification",
      expiresInMinutes: 24 * 60,
    });

    await sendEmail({
      to: user.Email,
      subject: "Verify your ChessMasters email",
      text: `Verify your email here: ${buildFrontendLink(`/verify-email?token=${verificationToken}`)}`,
    });

    return res.status(200).json({ message: "Verification email sent" });
  } catch (error) {
    console.error("Error resending verification email:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const requestPasswordReset = async (req, res) => {
  try {
    const normalizedEmail = req.body.Email || req.body.email;
    const user = await UserModel.findOne({ Email: normalizedEmail });

    if (user && user.Status !== "Banned") {
      const resetToken = await createAuthToken({
        userId: user._id,
        type: "password-reset",
        expiresInMinutes: 60,
      });

      await sendEmail({
        to: user.Email,
        subject: "Reset your ChessMasters password",
        text: `Reset your password here: ${buildFrontendLink(`/reset-password?token=${resetToken}`)}`,
      });
    }

    return res.status(200).json({ message: "If the email exists, a reset link has been sent" });
  } catch (error) {
    console.error("Error requesting password reset:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { token, newPassword, confirmPassword } = req.body;
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    const tokenRecord = await consumeAuthToken({ token, type: "password-reset" });
    if (!tokenRecord) {
      return res.status(400).json({ message: "Invalid or expired reset token" });
    }

    const user = await UserModel.findById(tokenRecord.user);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.Status === "Banned") return res.status(403).json({ message: "Your account is banned" });

    user.Password = newPassword;
    await user.save();

    return res.status(200).json({ message: "Password reset successfully" });
  } catch (error) {
    console.error("Error resetting password:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const editDetails = async (req, res) => {
  try {
    if (req.user.role === "admin") {
      return res.status(403).send({ message: "Admin profile cannot be edited here" });
    }
    const source = req.body.userData || req.body;
    const user = await UserModel.findById(req.user.id);
    if (!user) {
      return res.status(404).send({ message: "User not found" });
    }
    if (source.UserName || source.name) user.UserName = source.UserName || source.name;
    if (source.Email || source.email) user.Email = source.Email || source.email;
    if (source.Password || source.password) user.Password = source.Password || source.password;
    await user.save();
    res.status(200).send({ message: "User details updated successfully", user });
  } catch (error) {
    res.status(400).send({ message: "Error updating details", error });
  }
};

export const getUserDetails = async (req, res) => {
  try {
    if (req.user.role === "admin") {
      return res.status(200).json({ message: "Admin access granted." });
    }

    const user = await UserModel.findById(req.user.id).select("-Password");
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    return res.status(200).json(user);
  } catch (error) {
    console.error("Error fetching user details:", error);
    return res.status(error.name === "JsonWebTokenError" ? 401 : 500).json({ message: "Unable to fetch user details." });
  }
};
