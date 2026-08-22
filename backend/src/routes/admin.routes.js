import { Router } from 'express';
import * as adminController from '../controllers/admin.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { requireAdmin } from '../middlewares/admin.middleware.js';

const router = Router();

// All admin routes require authentication + ADMIN role
router.use(authenticate, requireAdmin);

// --- USERS ---
router.get('/users', adminController.getAllUsers);
router.get('/users/:userId', adminController.getUserById);
router.patch('/users/:userId/role', adminController.updateUserRole);
router.delete('/users/:userId', adminController.deleteUser);

// --- ANALYTICS ---
router.get('/analytics/overview', adminController.getAnalyticsOverview);
router.get('/analytics/popular-cities', adminController.getPopularCities);
router.get('/analytics/popular-activities', adminController.getPopularActivities);
router.get('/analytics/copied-trips', adminController.getCopiedTrips);

// --- MASTER DATA MANAGEMENT ---
router.post('/countries', adminController.createCountry);
router.patch('/countries/:id', adminController.updateCountry);
router.delete('/countries/:id', adminController.deleteCountry);

router.post('/states', adminController.createState);
router.patch('/states/:id', adminController.updateState);
router.delete('/states/:id', adminController.deleteState);

router.post('/cities', adminController.createCity);
router.patch('/cities/:id', adminController.updateCity);
router.delete('/cities/:id', adminController.deleteCity);

router.post('/activities', adminController.createActivity);
router.patch('/activities/:id', adminController.updateActivity);
router.delete('/activities/:id', adminController.deleteActivity);

export default router;
