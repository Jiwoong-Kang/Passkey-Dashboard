import express from 'express';
import Link from '../models/Link.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

// Search links
router.get('/search', authMiddleware, async (req, res) => {
  try {
    const { query } = req.query;

    if (!query || !query.trim()) {
      return res.status(400).json({ message: 'Search query is required' });
    }

    // Search in title, description, category, and tags
    const links = await Link.find({
      $or: [
        { title: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } },
        { category: { $regex: query, $options: 'i' } },
        { tags: { $regex: query, $options: 'i' } }
      ]
    }).sort({ createdAt: -1 });

    res.json(links);
  } catch (error) {
    console.error('Search links error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all links (with optional pagination)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    
    const links = await Link.find()
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const count = await Link.countDocuments();

    res.json({
      links,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      totalLinks: count
    });
  } catch (error) {
    console.error('Get links error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single link by ID
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const link = await Link.findById(req.params.id);
    
    if (!link) {
      return res.status(404).json({ message: 'Link not found' });
    }

    res.json(link);
  } catch (error) {
    console.error('Get link error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add new link (admin/manual entry)
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { title, url, description, category, tags } = req.body;

    if (!title || !url) {
      return res.status(400).json({ message: 'Title and URL are required' });
    }

    const link = new Link({
      title,
      url,
      description,
      category,
      tags: tags || []
    });

    await link.save();

    res.status(201).json(link);
  } catch (error) {
    console.error('Create link error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update link
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { title, url, description, category, tags } = req.body;
    
    const link = await Link.findById(req.params.id);
    
    if (!link) {
      return res.status(404).json({ message: 'Link not found' });
    }

    if (title) link.title = title;
    if (url) link.url = url;
    if (description !== undefined) link.description = description;
    if (category !== undefined) link.category = category;
    if (tags !== undefined) link.tags = tags;

    await link.save();

    res.json(link);
  } catch (error) {
    console.error('Update link error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete link
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const link = await Link.findById(req.params.id);
    
    if (!link) {
      return res.status(404).json({ message: 'Link not found' });
    }

    await Link.deleteOne({ _id: req.params.id });

    res.json({ message: 'Link deleted successfully' });
  } catch (error) {
    console.error('Delete link error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
