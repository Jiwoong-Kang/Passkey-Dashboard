import express from 'express';
import Link from '../models/Link.js';
import authMiddleware from '../middleware/auth.js';
import { crawlWeb, detectPasskey } from '../services/crawler.js';

const router = express.Router();

// Search links
router.get('/search', authMiddleware, async (req, res) => {
  try {
    const { query } = req.query;

    if (!query || !query.trim()) {
      return res.status(400).json({ message: 'Search query is required' });
    }

    // Search in title, url, description, category, and tags
    const links = await Link.find({
      $or: [
        { title: { $regex: query, $options: 'i' } },
        { url: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } },
        { category: { $regex: query, $options: 'i' } },
        { tags: { $regex: query, $options: 'i' } }
      ]
    }).sort({ createdAt: -1 });

    res.json({ links, hasResults: links.length > 0 });
  } catch (error) {
    console.error('Search links error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Crawl web and add results to database
router.post('/crawl', authMiddleware, async (req, res) => {
  try {
    const { query } = req.body;

    if (!query || !query.trim()) {
      return res.status(400).json({ message: 'Search query is required' });
    }

    console.log(`Starting web crawl for: ${query}`);

    // Crawl the web
    const crawledResults = await crawlWeb(query);

    if (!crawledResults || crawledResults.length === 0) {
      return res.json({ 
        message: 'No results found on the web',
        links: [],
        crawled: true
      });
    }

    // Save crawled results to database
    const savedLinks = [];
    let newLinksCount = 0;
    for (const result of crawledResults) {
      // Check if link already exists
      const existingLink = await Link.findOne({ url: result.url });
      
      if (!existingLink) {
        const link = new Link({
          title:               result.title,
          url:                 result.url,
          description:         result.description || '',
          category:            result.category    || 'Web Result',
          tags:                [],
          hasPasskey:          result.hasPasskey !== undefined ? result.hasPasskey : true,
          passkeyType:         result.passkeyType         || (result.hasPasskey ? 'native' : 'none'),
          crawlStatus:         result.crawlStatus         || 'success',
          detectionSource:     result.detectionSource     || 'static',
          signalSourceUrl:     result.signalSourceUrl     || '',
          finalUrl:            result.finalUrl            || result.url,
          lastCrawledAt:       new Date(),
        });
        
        await link.save();
        savedLinks.push(link);
        newLinksCount++;
      } else {
        existingLink.lastCrawledAt = new Date();
        await existingLink.save();
        savedLinks.push(existingLink);
      }
    }

    console.log(`Crawled and saved ${savedLinks.length} links for: ${query}`);

    res.json({
      message: 'Successfully crawled and saved results',
      links: savedLinks.filter(l => l.hasPasskey),
      crawled: true,
      newLinksAdded: newLinksCount,
      breakdown: {
        native: savedLinks.filter(l => l.passkeyType === 'native').length,
        thirdParty: savedLinks.filter(l => l.passkeyType === 'third-party').length,
        none: savedLinks.filter(l => l.passkeyType === 'none').length,
      }
    });
  } catch (error) {
    console.error('Crawl error:', error);
    res.status(500).json({ message: 'Failed to crawl web' });
  }
});

// Get native passkey sites
router.get('/passkey', authMiddleware, async (req, res) => {
  try {
    const links = await Link.find({ passkeyType: 'native' }).sort({ createdAt: -1 });
    res.json({ links, total: links.length });
  } catch (error) {
    console.error('Get passkey links error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get third-party passkey sites
router.get('/third-party', authMiddleware, async (req, res) => {
  try {
    const links = await Link.find({ passkeyType: 'third-party' }).sort({ createdAt: -1 });
    res.json({ links, total: links.length });
  } catch (error) {
    console.error('Get third-party passkey links error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get no-passkey sites
router.get('/no-passkey', authMiddleware, async (req, res) => {
  try {
    const links = await Link.find({ passkeyType: 'none' }).sort({ createdAt: -1 });
    res.json({ links, total: links.length });
  } catch (error) {
    console.error('Get no-passkey links error:', error);
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

// Re-crawl a specific link
router.post('/:id/recrawl', authMiddleware, async (req, res) => {
  try {
    const link = await Link.findById(req.params.id);
    if (!link) return res.status(404).json({ message: 'Link not found' });

    const result = await detectPasskey(link.url);

    link.hasPasskey = result.hasPasskey;
    link.passkeyType = result.passkeyType || 'none';
    link.lastCrawledAt = new Date();
    if (result.description) link.description = result.description;

    await link.save();
    res.json({ link, message: 'Re-crawl complete' });
  } catch (error) {
    console.error('Recrawl error:', error);
    res.status(500).json({ message: 'Re-crawl failed' });
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
