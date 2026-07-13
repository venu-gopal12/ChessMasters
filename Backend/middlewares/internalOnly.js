import { internalApiKey } from "../config.js";

export { internalApiKey };

export const internalOnly = (req, res, next) => {
  if (req.get("x-internal-api-key") !== internalApiKey) {
    return res.status(403).json({ message: "This endpoint is server-internal." });
  }
  next();
};
