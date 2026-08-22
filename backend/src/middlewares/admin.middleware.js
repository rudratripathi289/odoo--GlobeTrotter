/**
 * Middleware: requireAdmin
 * Must be used AFTER authenticate.
 * Checks that req.user.role === 'ADMIN'.
 * Returns 403 if the user is not an admin.
 */
export const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'ADMIN') {
    return res.status(403).json({
      error: { code: 'FORBIDDEN', message: 'Admin access required.' },
    });
  }
  next();
};
