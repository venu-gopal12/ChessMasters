import AuditLog from "../models/auditLogModel.js";

export const createAuditLog = async (req, { action, targetType, targetId, metadata = {} }) => {
  try {
    await AuditLog.create({
      actor: req.user?.id || req.userId,
      actorModel: req.user?.role === "admin" ? "AdminModel" : "UserModel",
      actorRole: req.user?.role,
      action,
      targetType,
      targetId,
      metadata,
      ip: req.ip,
      userAgent: req.get("user-agent"),
    });
  } catch (error) {
    console.error("Failed to write audit log:", error);
  }
};
