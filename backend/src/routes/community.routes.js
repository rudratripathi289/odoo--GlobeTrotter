import { Router } from 'express';

const router = Router();

// ==========================================
// COMMUNITY ROUTES (/community)
// ==========================================

router.get('/trips', (req, res) => res.json({ message: 'get community trips' }));
router.get('/trips/:tripId', (req, res) => res.json({ message: 'get community trip details' }));
router.post('/trips/:tripId/copy', (req, res) => res.json({ message: 'copy community trip' }));

export default router;
