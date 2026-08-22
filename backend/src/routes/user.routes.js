import { Router } from 'express';
import * as userController from '../controllers/user.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const router = Router();

// All /users/me/* routes require authentication (self only)
router.get('/me', authenticate, userController.getMe);
router.patch('/me', authenticate, userController.updateMe);
router.patch('/me/password', authenticate, userController.updatePassword);
router.delete('/me', authenticate, userController.deleteMe);

router.get('/me/saved-destinations', authenticate, userController.getSavedDestinations);
router.post('/me/saved-destinations', authenticate, userController.addSavedDestination);
router.delete('/me/saved-destinations/:cityId', authenticate, userController.deleteSavedDestination);

export default router;
