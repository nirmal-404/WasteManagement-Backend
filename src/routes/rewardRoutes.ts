import { Router } from 'express';
import { auth, requireResident } from '../middleware/authMiddleware.js';
import { Reward } from '../models/Reward.js';

const router = Router();

// Get my rewards
router.get('/my', auth, requireResident, async (req: any, res) => {
  try {
    const reward = await Reward.findOne({ userId: req.user._id });
    res.json({ reward });
  } catch (e: any) {
    res.status(500).json({ message: e.message || 'Failed to fetch rewards' });
  }
});

export default router;


