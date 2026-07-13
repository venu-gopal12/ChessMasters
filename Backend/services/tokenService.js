import crypto from "crypto";
import AuthToken from "../models/authTokenModel.js";

const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex");

export const createAuthToken = async ({ userId, type, expiresInMinutes }) => {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);

  await AuthToken.create({
    user: userId,
    type,
    tokenHash: hashToken(token),
    expiresAt,
  });

  return token;
};

export const consumeAuthToken = async ({ token, type }) => {
  const record = await AuthToken.findOne({
    tokenHash: hashToken(token),
    type,
    usedAt: null,
    expiresAt: { $gt: new Date() },
  });

  if (!record) return null;

  record.usedAt = new Date();
  await record.save();
  return record;
};
