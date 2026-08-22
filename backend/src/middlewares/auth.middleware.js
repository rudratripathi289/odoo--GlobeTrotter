import jwt from 'jsonwebtoken';

/**
 * Middleware: authenticate
 * Verifies the JWT from the Authorization header and sets req.user.
 * Returns 401 if missing or invalid, 401 if expired.
 */
export const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: { code: 'MISSING_TOKEN', message: 'Authorization token is required.' },
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    req.user = decoded; // { id, email, role }
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: { code: 'TOKEN_EXPIRED', message: 'Access token has expired.' },
      });
    }
    return res.status(401).json({
      error: { code: 'INVALID_TOKEN', message: 'Invalid access token.' },
    });
  }
};

/**
 * Middleware: optionalAuthenticate
 * Same as authenticate but does NOT block unauthenticated requests.
 * Sets req.user if token is valid, otherwise req.user stays undefined.
 * Used for community endpoints where both guests and users can access.
 */
export const optionalAuthenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    req.user = decoded;
  } catch (_) {
    // silently ignore invalid tokens on optional routes
  }

  next();
};
