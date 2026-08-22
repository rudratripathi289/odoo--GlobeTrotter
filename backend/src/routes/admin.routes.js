import { Router } from 'express';

const router = Router();

// ==========================================
// ADMIN ROUTES (/admin)
// ==========================================

// --- USERS ---
router.get('/users', (req, res) => res.json({ message: 'get all users' }));
router.get('/users/:userId', (req, res) => res.json({ message: 'get user by id' }));
router.patch('/users/:userId/role', (req, res) => res.json({ message: 'update user role' }));
router.delete('/users/:userId', (req, res) => res.json({ message: 'delete user' }));

// --- ANALYTICS ---
router.get('/analytics/overview', (req, res) => res.json({ message: 'analytics overview' }));
router.get('/analytics/popular-cities', (req, res) => res.json({ message: 'analytics popular cities' }));
router.get('/analytics/popular-activities', (req, res) => res.json({ message: 'analytics popular activities' }));
router.get('/analytics/copied-trips', (req, res) => res.json({ message: 'analytics copied trips' }));

// --- MASTER DATA MANAGEMENT ---
router.post('/countries', (req, res) => res.json({ message: 'create country' }));
router.patch('/countries/:id', (req, res) => res.json({ message: 'update country' }));
router.delete('/countries/:id', (req, res) => res.json({ message: 'delete country' }));

router.post('/states', (req, res) => res.json({ message: 'create state' }));
router.patch('/states/:id', (req, res) => res.json({ message: 'update state' }));
router.delete('/states/:id', (req, res) => res.json({ message: 'delete state' }));

router.post('/cities', (req, res) => res.json({ message: 'create city' }));
router.patch('/cities/:id', (req, res) => res.json({ message: 'update city' }));
router.delete('/cities/:id', (req, res) => res.json({ message: 'delete city' }));

router.post('/activities', (req, res) => res.json({ message: 'create master activity' }));
router.patch('/activities/:id', (req, res) => res.json({ message: 'update master activity' }));
router.delete('/activities/:id', (req, res) => res.json({ message: 'delete master activity' }));

export default router;
