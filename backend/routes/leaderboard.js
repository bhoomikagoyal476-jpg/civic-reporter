const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Issue = require('../models/Issue');

// GET /leaderboard/:locality - Weekly leaderboard
router.get('/:locality', async (req, res) => {
  try {
    const { locality } = req.params;
    const { period = 'weekly' } = req.query;
    
    let dateFilter = {};
    const now = new Date();
    
    if (period === 'weekly') {
      const weekAgo = new Date(now.setDate(now.getDate() - 7));
      dateFilter = { createdAt: { $gte: weekAgo } };
    } else if (period === 'monthly') {
      const monthAgo = new Date(now.setMonth(now.getMonth() - 1));
      dateFilter = { createdAt: { $gte: monthAgo } };
    }
    
    // Get users from this locality
    const users = await User.find({ locality: locality })
      .select('username trustScore stats badges');
    
    // Calculate points (reports + verifications + trust bonus)
    const leaderboard = await Promise.all(users.map(async (user) => {
      const recentReports = await Issue.countDocuments({
        reporter: user._id,
        ...dateFilter
      });
      
      const recentVerifications = await Issue.countDocuments({
        'verifications.user': user._id,
        ...dateFilter
      });
      
      const points = (recentReports * 10) + (recentVerifications * 5) + Math.floor(user.trustScore);
      
      return {
        username: user.username,
        trustScore: user.trustScore,
        points: points,
        badges: user.badges.slice(0, 3),
        stats: user.stats
      };
    }));
    
    // Sort by points descending
    leaderboard.sort((a, b) => b.points - a.points);
    
    res.json({
      locality,
      period,
      topUsers: leaderboard.slice(0, 10)
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /user/:userId/badges - Get user's earned badges
router.get('/user/:userId/badges', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select('username badges trustScore stats');
    
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    const badgeInfo = {
      truth_seeker: { name: '🔍 Truth Seeker', description: '10+ accurate reports', earned: false },
      local_hero: { name: '🦸 Local Hero', description: 'Top in locality leaderboard', earned: false },
      trusted_verifier: { name: '⭐ Trusted Verifier', description: '85+ trust score', earned: false },
      community_validator: { name: '✓ Community Validator', description: '20+ verifications', earned: false },
      top_reporter: { name: '📢 Top Reporter', description: '50+ accurate reports', earned: false },
      neighbor_of_the_year: { name: '🏆 Neighbor of the Year', description: '100+ helpful votes', earned: false }
    };
    
    user.badges.forEach(badge => {
      if (badgeInfo[badge.name]) {
        badgeInfo[badge.name].earned = true;
      }
    });
    
    res.json({
      username: user.username,
      trustScore: user.trustScore,
      badges: badgeInfo
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;