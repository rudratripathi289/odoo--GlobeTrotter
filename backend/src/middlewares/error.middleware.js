import { ZodError } from 'zod';

const PRISMA_ERROR_MAP = { P2002: 409, P2003: 409, P2025: 404 };

/**
 * Middleware: globalErrorHandler
 * Must be the LAST middleware registered in app.js (4-arg signature).
 * Handles Zod validation errors, custom AppErrors, Prisma errors, and unknown errors.
 */
export const globalErrorHandler = (err, req, res, next) => {
  console.error('🚨 ERROR:', req.method, req.originalUrl);
  console.error(err);

  // Zod validation error
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: err.issues[0]?.message || 'Validation failed.',
        details: err.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        })),
      },
    });
  }

  // Custom AppError (thrown from services)
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      error: {
        code: err.code || 'APP_ERROR',
        message: err.message,
        details: err.details || [],
      },
    });
  }

  // Prisma P2003 — FK restrict violation → 409
  if (err.code === 'P2003') {
    return res.status(409).json({
      error: {
        code: 'IN_USE',
        message: 'Cannot delete: this record is referenced by other data.',
        details: [],
      },
    });
  }

  // Prisma P2002 — unique constraint violation → 409
  if (err.code === 'P2002') {
    return res.status(409).json({
      error: {
        code: 'DUPLICATE',
        message: 'A record with this value already exists.',
        details: [],
      },
    });
  }

  // Unknown / unexpected error
  return res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred.',
      details: [],
    },
  });
};
