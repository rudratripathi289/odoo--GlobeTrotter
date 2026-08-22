import { Router } from 'express';

import authRoutes from './auth.routes.js';
import userRoutes from './user.routes.js';
import masterRoutes from './master.routes.js';
import tripRoutes from './trip.routes.js';
import communityRoutes from './community.routes.js';
import adminRoutes from './admin.routes.js';
import uploadRoutes from './upload.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
// Mounted at root to support /countries, /states, /cities directly under /api/v1
router.use('/', masterRoutes);
router.use('/trips', tripRoutes);
router.use('/community', communityRoutes);
router.use('/admin', adminRoutes);
router.use('/upload', uploadRoutes);

export default router;
