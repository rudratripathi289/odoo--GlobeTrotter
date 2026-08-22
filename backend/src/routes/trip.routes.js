import { Router } from 'express';
import * as tripController from '../controllers/trip.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const router = Router();

// All trip routes require authentication (owner access enforced in service layer)

// --- LITERALS FIRST ---
router.get('/shared-with-me', authenticate, tripController.getSharedWithMeTrips);

// --- BASE TRIPS ---
router.post('/', authenticate, tripController.createTrip);
router.get('/', authenticate, tripController.getMyTrips);

// --- VIEWS (before /:tripId to avoid collision) ---
router.get('/:tripId/itinerary', authenticate, tripController.getItinerary);
router.get('/:tripId/budget', authenticate, tripController.getBudget);
router.get('/:tripId/calendar', authenticate, tripController.getCalendar);

router.get('/:tripId', authenticate, tripController.getTripById);
router.patch('/:tripId', authenticate, tripController.updateTrip);
router.delete('/:tripId', authenticate, tripController.deleteTrip);

// --- STOPS (literal /order before /:stopId) ---
router.put('/:tripId/stops/order', authenticate, tripController.reorderStops);

router.post('/:tripId/stops', authenticate, tripController.createStop);
router.get('/:tripId/stops', authenticate, tripController.getStops);
router.get('/:tripId/stops/:stopId', authenticate, tripController.getStopById);
router.patch('/:tripId/stops/:stopId', authenticate, tripController.updateStop);
router.delete('/:tripId/stops/:stopId', authenticate, tripController.deleteStop);

// --- ACTIVITIES (literal /order before /:tripActivityId) ---
router.put('/:tripId/stops/:stopId/activities/order', authenticate, tripController.reorderActivities);

router.get('/:tripId/stops/:stopId/activities', authenticate, tripController.getActivities);
router.post('/:tripId/stops/:stopId/activities', authenticate, tripController.createActivity);
router.patch('/:tripId/stops/:stopId/activities/:tripActivityId', authenticate, tripController.updateActivity);
router.delete('/:tripId/stops/:stopId/activities/:tripActivityId', authenticate, tripController.deleteActivity);

// --- EXPENSES ---
router.get('/:tripId/expenses', authenticate, tripController.getExpenses);
router.post('/:tripId/expenses', authenticate, tripController.createExpense);
router.patch('/:tripId/expenses/:expenseId', authenticate, tripController.updateExpense);
router.delete('/:tripId/expenses/:expenseId', authenticate, tripController.deleteExpense);

// --- SHARING ---
router.get('/:tripId/shares', authenticate, tripController.getShares);
router.post('/:tripId/shares', authenticate, tripController.addShare);
router.delete('/:tripId/shares/:userId', authenticate, tripController.removeShare);

export default router;
