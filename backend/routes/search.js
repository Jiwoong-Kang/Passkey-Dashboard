import express from 'express';
import SearchHistory from '../models/SearchHistory.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

// Get search history
router.get('/history', authMiddleware, async (req, res) => {
  try {
    const history = await SearchHistory.find({ userId: req.userId })
      .sort({ timestamp: -1 })
      .limit(100);

    res.json(history);
  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add search to history
router.post('/history', authMiddleware, async (req, res) => {
  try {
    const { query } = req.body;

    if (!query || !query.trim()) {
      return res.status(400).json({ message: 'Search query is required' });
    }

    const searchHistory = new SearchHistory({
      userId: req.userId,
      query: query.trim()
    });

    await searchHistory.save();

    res.status(201).json(searchHistory);
  } catch (error) {
    console.error('Add history error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete specific search history
router.delete('/history/:id', authMiddleware, async (req, res) => {
  try {
    const history = await SearchHistory.findOne({
      _id: req.params.id,
      userId: req.userId
    });

    if (!history) {
      return res.status(404).json({ message: 'History not found' });
    }

    await SearchHistory.deleteOne({ _id: req.params.id });

    res.json({ message: 'History deleted successfully' });
  } catch (error) {
    console.error('Delete history error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Clear all search history
router.delete('/history', authMiddleware, async (req, res) => {
  try {
    await SearchHistory.deleteMany({ userId: req.userId });
    res.json({ message: 'All history cleared successfully' });
  } catch (error) {
    console.error('Clear history error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
