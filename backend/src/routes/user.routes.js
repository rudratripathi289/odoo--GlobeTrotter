import { Router } from 'express';

const router = Router();

// ==========================================
// USER ROUTES (/users)
// ==========================================

router.get('/me', (req, res) => res.json({ message: 'get current user' }));
router.patch('/me', (req, res) => res.json({ message: 'update current user' }));
router.patch('/me/password', (req, res) => res.json({ message: 'update password' }));
router.delete('/me', (req, res) => res.json({ message: 'delete account' }));

router.get('/me/saved-destinations', (req, res) => res.json({ message: 'get saved destinations' }));
router.post('/me/saved-destinations', (req, res) => res.json({ message: 'add saved destination' }));
router.delete('/me/saved-destinations/:cityId', (req, res) => res.json({ message: 'delete saved destination' }));

export default router;
