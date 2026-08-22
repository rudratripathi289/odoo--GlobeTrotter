import { Router } from 'express';

const router = Router();

// ==========================================
// MASTER DATA ROUTES (/countries, /states, /cities)
// ==========================================

router.get('/countries', (req, res) => res.json({ message: 'get countries' }));
router.get('/states', (req, res) => res.json({ message: 'get states' }));

router.get('/cities', (req, res) => res.json({ message: 'get cities' }));
router.get('/cities/:cityId', (req, res) => res.json({ message: 'get city by id' }));
router.get('/cities/:cityId/activities', (req, res) => res.json({ message: 'get city activities' }));

export default router;
