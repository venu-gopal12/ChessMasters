// Purpose: Restricts routes to authenticated admin users.
import { authMiddleware } from './authMiddlerware.js';

export const isAdmin = (req, res, next) => {
  authMiddleware(req, res, () => {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ message: "Admin access required" });
    }
    next();
  });
};

