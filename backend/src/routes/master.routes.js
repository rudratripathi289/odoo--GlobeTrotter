import { Router } from 'express';
import * as masterController from '../controllers/master.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const router = Router();

// Authenticated (read-only master data)
router.get('/countries', authenticate, masterController.getCountries);
router.get('/states', authenticate, masterController.getStates);

router.get('/cities', authenticate, masterController.getCities);
router.get('/cities/:cityId', authenticate, masterController.getCityById);
router.get('/cities/:cityId/activities', authenticate, masterController.getCityActivities);

export default router;
