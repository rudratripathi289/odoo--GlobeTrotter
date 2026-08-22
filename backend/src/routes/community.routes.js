import { Router } from 'express';
import * as communityController from '../controllers/community.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const router = Router();

// GET community trips — PUBLIC (no JWT required)
router.get('/trips', communityController.getCommunityTrips);
router.get('/trips/:tripId', communityController.getCommunityTripById);

// POST copy — requires authentication
router.post('/trips/:tripId/copy', authenticate, communityController.copyTrip);

export default router;
