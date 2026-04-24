class TrustService {
  // Calculate new trust score based on action
  static calculateNewScore(currentScore, action, wasAccurate) {
    let delta = 0;
    
    switch(action) {
      case 'report':
        delta = wasAccurate ? +3 : -8;
        break;
      case 'verification':
        delta = wasAccurate ? +2 : -4;
        break;
      case 'report_marked_false':
        delta = -5;
        break;
      default:
        return currentScore;
    }
    
    // New users (below 30) have slower changes (protection)
    const multiplier = currentScore < 30 ? 0.6 : 1;
    
    let newScore = currentScore + (delta * multiplier);
    return Math.min(100, Math.max(0, Math.round(newScore)));
  }
  
  // Required verifications based on reporter's trust
  static getRequiredVerifications(reporterTrustScore) {
    if (reporterTrustScore >= 80) return 2;      // Trusted users
    if (reporterTrustScore >= 60) return 3;      // Normal users
    if (reporterTrustScore >= 40) return 4;      // Low trust
    if (reporterTrustScore >= 20) return 5;      // Suspicious
    return 6;                                     // New/penalized users
  }
  
  // Priority escalation based on verification count
  static getEscalatedPriority(currentPriority, verificationCount, requiredCount) {
    const ratio = verificationCount / requiredCount;
    
    if (verificationCount >= requiredCount * 2) {
      return 'emergency';
    }
    if (ratio >= 1.5) {
      return 'critical';
    }
    if (ratio >= 1.0) {
      return 'important';
    }
    if (ratio >= 0.5 && currentPriority === 'critical') {
      return 'important';
    }
    return currentPriority;
  }
  
  // Calculate distance between two coordinates (Haversine formula)
  static calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2 - lat1) * Math.PI/180;
    const Δλ = (lon2 - lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    
    return R * c; // Distance in meters
  }
  
  // Check if user can verify (within radius)
  static canVerify(userLat, userLng, issueLat, issueLng, maxRadiusMeters = 500) {
    const distance = this.calculateDistance(userLat, userLng, issueLat, issueLng);
    return distance <= maxRadiusMeters;
  }
  
  // Determine badges to award based on stats
  static getEligibleBadges(stats, trustScore, localityRank) {
    const badges = [];
    
    if (stats.accurateReports >= 10) {
      badges.push('truth_seeker');
    }
    if (stats.totalVerifications >= 20) {
      badges.push('community_validator');
    }
    if (trustScore >= 85) {
      badges.push('trusted_verifier');
    }
    if (localityRank === 1) {
      badges.push('local_hero');
    }
    if (stats.accurateReports >= 50) {
      badges.push('top_reporter');
    }
    if (stats.helpfulVotes >= 100) {
      badges.push('neighbor_of_the_year');
    }
    
    return badges;
  }
}

module.exports = TrustService;