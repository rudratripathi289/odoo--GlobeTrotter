import { Router } from 'express';

const router = Router();

// ==========================================
// AUTH ROUTES
// ==========================================

router.post('/register', (req, res) => res.json({ message: 'register endpoint' }));
router.post('/login', (req, res) => res.json({ message: 'login endpoint' }));
router.post('/refresh', (req, res) => res.json({ message: 'refresh endpoint' }));
router.post('/logout', (req, res) => res.json({ message: 'logout endpoint' }));
router.post('/forgot-password', (req, res) => res.json({ message: 'forgot-password endpoint' }));
router.post('/reset-password', (req, res) => res.json({ message: 'reset-password endpoint' }));

export default router;
