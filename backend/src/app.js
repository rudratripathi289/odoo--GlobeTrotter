import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import cookieParser from 'cookie-parser';

import routes from './routes/index.js';
import { globalErrorHandler } from './middlewares/error.middleware.js';

const app = express();

// ---------------- SECURITY & UTILITIES ----------------
app.use(helmet());
app.use(morgan('dev'));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(compression());
app.use(cookieParser());
app.use(express.json());
app.set('trust proxy', 1);

// ---------------- API ROUTES ----------------
app.use('/api/v1', routes);

// ---------------- HEALTH CHECK ----------------
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Server is healthy.' });
});

// ---------------- GLOBAL ERROR HANDLER ----------------
app.use(globalErrorHandler);

export default app;
