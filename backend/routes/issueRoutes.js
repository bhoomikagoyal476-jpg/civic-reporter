const express = require('express');
const router = express.Router();
const Issue = require('../models/Issue');
const User = require('../models/User');  // ✅ ADDED - Was missing!
const TrustService = require('../services/TrustService');  // ✅ Fixed - Single import, correct case

// POST /api/issues - Report new issue (with location)
router.post('/issues', async (req, res) => {
  try {
    const { title, description, category, lat, lng, address, photoUrl, userId } = req.body;
    
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.isBanned) return res.status(403).json({ error: 'User is banned' });
    
    // Anti-cheat: Daily limit
    if (!user.canReportToday()) {
      return res.status(429).json({ 
        error: 'Daily report limit reached (5 max). Try again tomorrow.' 
      });
    }
    
    // Determine locality from coordinates (simplified - you can use reverse geocoding)
    const locality = address.split(',')[0] || 'Unknown Area';
    
    const requiredVerifications = TrustService.getRequiredVerifications(user.trustScore);
    
    const issue = new Issue({
      title,
      description,
      category,
      location: { lat, lng, address, locality },
      photoUrl,
      reporter: userId,
      requiredVerifications
    });
    
    // Auto-set priority based on category
    if (category === 'water_leakage') issue.priority = 'critical';
    if (category === 'pothole') issue.priority = 'important';
    
    await issue.save();
    
    // Update user stats
    user.stats.totalReports += 1;
    user.dailyReportCount += 1;
    user.lastReportDate = new Date();
    await user.save();
    
    res.status(201).json({
      success: true,
      issue: {
        id: issue._id,
        title: issue.title,
        priority: issue.priority,
        requiredVerifications: issue.requiredVerifications,
        status: issue.status
      }
    });
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/issues/nearby - Hyperlocal feed
router.get('/issues/nearby', async (req, res) => {
  try {
    const { locality, lat, lng, radius = 2000 } = req.query;
    
    let query = { status: { $ne: 'resolved' } };
    
    if (locality) {
      query['location.locality'] = locality;
    } else if (lat && lng) {
      // Find issues within radius (simplified - use proper geospatial in production)
      const issues = await Issue.find(query)
        .populate('reporter', 'username trustScore')
        .sort({ createdAt: -1 })
        .limit(50);
      
      // Filter by distance in memory (for demo)
      const filtered = issues.filter(issue => {
        const distance = TrustService.calculateDistance(
          parseFloat(lat), parseFloat(lng),
          issue.location.lat, issue.location.lng
        );
        return distance <= parseFloat(radius);
      });
      
      return res.json(filtered);
    }
    
    const issues = await Issue.find(query)
      .populate('reporter', 'username trustScore')
      .sort({ createdAt: -1 })
      .limit(50);
    
    res.json(issues);
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/issues/:id/verify - Multi-layer verification with photo
router.post('/issues/:id/verify', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, photoUrl, userLat, userLng, comment } = req.body;
    
    const issue = await Issue.findById(id);
    if (!issue) return res.status(404).json({ error: 'Issue not found' });
    
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    // Check if already verified
    const alreadyVerified = issue.verifications && issue.verifications.some(v => v.user.toString() === userId);
    if (alreadyVerified) {
      return res.status(400).json({ error: 'You already verified this issue' });
    }
    
    // CRITICAL: Distance check (must be within 500m)
    if (userLat && userLng) {
      const canVerify = TrustService.canVerify(
        userLat, userLng,
        issue.location.lat, issue.location.lng,
        500
      );
      
      if (!canVerify) {
        return res.status(403).json({ 
          error: 'You must be within 500 meters of the issue to verify it' 
        });
      }
    }
    
    // MANDATORY: New photo required
    if (!photoUrl) {
      return res.status(400).json({ error: 'New photo required for verification' });
    }
    
    // Initialize arrays if they don't exist
    if (!issue.verifications) issue.verifications = [];
    if (!issue.verificationCount) issue.verificationCount = 0;
    
    // Add verification
    issue.verifications.push({
      user: userId,
      photoUrl: photoUrl,
      comment: comment || ''
    });
    issue.verificationCount += 1;
    
    // Escalate priority based on verification count
    issue.priority = TrustService.getEscalatedPriority(
      issue.priority,
      issue.verificationCount,
      issue.requiredVerifications || 3
    );
    
    // Auto-verify if threshold reached
    if (issue.verificationCount >= (issue.requiredVerifications || 3)) {
      issue.status = 'verified';
    }
    
    await issue.save();
    
    // Update user verification stats
    if (!user.stats) user.stats = {};
    user.stats.totalVerifications = (user.stats.totalVerifications || 0) + 1;
    await user.save();
    
    res.json({
      success: true,
      verificationCount: issue.verificationCount,
      requiredVerifications: issue.requiredVerifications || 3,
      priority: issue.priority,
      status: issue.status,
      message: issue.status === 'verified' ? 'Issue verified! Moving to resolution.' : 'Verification added. Need more confirmations.'
    });
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/issues/:id - Get single issue with verification details
router.get('/issues/:id', async (req, res) => {
  try {
    const issue = await Issue.findById(req.params.id)
      .populate('reporter', 'name trustScore badges')
      .populate('verifications.user', 'name trustScore');
    
    if (!issue) return res.status(404).json({ error: 'Issue not found' });
    
    res.json({
      id: issue._id,
      title: issue.title,
      description: issue.description,
      category: issue.category,
      location: issue.location,
      photoUrl: issue.photoUrl,
      reporter: issue.reporter,
      verificationCount: issue.verificationCount || 0,
      requiredVerifications: issue.requiredVerifications || 3,
      priority: issue.priority,
      status: issue.status,
      verifications: issue.verifications || [],
      createdAt: issue.createdAt
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/issues/:id/resolve - Mark issue as resolved
router.put('/issues/:id/resolve', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, resolutionNote } = req.body;
    
    const issue = await Issue.findById(id);
    if (!issue) return res.status(404).json({ error: 'Issue not found' });
    
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    // Only reporter or high-trust users can mark as resolved
    const isReporter = issue.reporter.toString() === userId;
    const isHighTrust = user.trustScore >= 80;
    
    if (!isReporter && !isHighTrust) {
      return res.status(403).json({ error: 'Only reporter or high-trust users can mark as resolved' });
    }
    
    issue.status = 'resolved';
    issue.resolvedAt = new Date();
    issue.resolutionNote = resolutionNote || 'Issue resolved';
    
    await issue.save();
    
    res.json({ success: true, message: 'Issue marked as resolved' });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;