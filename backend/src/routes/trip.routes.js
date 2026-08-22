import { Router } from 'express';

const router = Router();

// ==========================================
// TRIPS ROUTES (/trips)
// Routing Rule: Literal segments MUST be registered before parameterized segments
// ==========================================

// --- LITERALS ---
router.get('/shared-with-me', (req, res) => res.json({ message: 'get trips shared with me' }));

// --- BASE TRIPS ---
router.post('/', (req, res) => res.json({ message: 'create trip' }));
router.get('/', (req, res) => res.json({ message: 'get my trips' }));
router.get('/:tripId', (req, res) => res.json({ message: 'get trip details' }));
router.patch('/:tripId', (req, res) => res.json({ message: 'update trip' }));
router.delete('/:tripId', (req, res) => res.json({ message: 'delete trip' }));

// --- VIEWS ---
router.get('/:tripId/itinerary', (req, res) => res.json({ message: 'get trip itinerary' }));
router.get('/:tripId/budget', (req, res) => res.json({ message: 'get trip budget' }));
router.get('/:tripId/calendar', (req, res) => res.json({ message: 'get trip calendar' }));

// --- STOPS ---
// Literal first
router.put('/:tripId/stops/order', (req, res) => res.json({ message: 'reorder stops' }));

router.post('/:tripId/stops', (req, res) => res.json({ message: 'create stop' }));
router.get('/:tripId/stops', (req, res) => res.json({ message: 'get stops' }));
router.get('/:tripId/stops/:stopId', (req, res) => res.json({ message: 'get stop by id' }));
router.patch('/:tripId/stops/:stopId', (req, res) => res.json({ message: 'update stop' }));
router.delete('/:tripId/stops/:stopId', (req, res) => res.json({ message: 'delete stop' }));

// --- ACTIVITIES ---
// Literal first
router.put('/:tripId/stops/:stopId/activities/order', (req, res) => res.json({ message: 'reorder activities' }));

router.get('/:tripId/stops/:stopId/activities', (req, res) => res.json({ message: 'get activities' }));
router.post('/:tripId/stops/:stopId/activities', (req, res) => res.json({ message: 'create activity' }));
router.patch('/:tripId/stops/:stopId/activities/:tripActivityId', (req, res) => res.json({ message: 'update activity' }));
router.delete('/:tripId/stops/:stopId/activities/:tripActivityId', (req, res) => res.json({ message: 'delete activity' }));

// --- EXPENSES ---
router.get('/:tripId/expenses', (req, res) => res.json({ message: 'get expenses' }));
router.post('/:tripId/expenses', (req, res) => res.json({ message: 'create expense' }));
router.patch('/:tripId/expenses/:expenseId', (req, res) => res.json({ message: 'update expense' }));
router.delete('/:tripId/expenses/:expenseId', (req, res) => res.json({ message: 'delete expense' }));

// --- SHARING ---
router.get('/:tripId/shares', (req, res) => res.json({ message: 'get shares' }));
router.post('/:tripId/shares', (req, res) => res.json({ message: 'add share' }));
router.delete('/:tripId/shares/:userId', (req, res) => res.json({ message: 'remove share' }));

export default router;
