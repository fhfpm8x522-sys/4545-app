class MatchRules {
  static bool canPredict(Map<String, dynamic> match, DateTime now) {
    if (match['status'] != 'scheduled') return false;
    final kickoff = DateTime.tryParse(match['kickoff']?.toString() ?? '');
    return kickoff != null && kickoff.isAfter(now);
  }
}
