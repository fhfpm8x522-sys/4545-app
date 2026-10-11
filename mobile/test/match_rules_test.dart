import 'package:flutter_test/flutter_test.dart';
import 'package:forty_five_forty_five/models/match_rules.dart';

void main() {
  final now = DateTime.utc(2026, 10, 11, 12);
  Map<String, dynamic> fixture(String status, String? kickoff) =>
      {'status': status, 'kickoff': kickoff};

  test('scheduled prediction closes exactly at kickoff', () {
    expect(MatchRules.canPredict(fixture('scheduled', '2026-10-11T12:00:01Z'), now), isTrue);
    expect(MatchRules.canPredict(fixture('scheduled', '2026-10-11T12:00:00Z'), now), isFalse);
    expect(MatchRules.canPredict(fixture('scheduled', '2026-10-11T11:59:59Z'), now), isFalse);
  });
  test('non scheduled games and missing dates reject predictions', () {
    for (final status in ['live', 'finished', 'postponed', 'cancelled', 'unknown']) {
      expect(MatchRules.canPredict(fixture(status, '2026-10-12T12:00:00Z'), now), isFalse);
    }
    expect(MatchRules.canPredict(fixture('scheduled', null), now), isFalse);
    expect(MatchRules.canPredict(fixture('scheduled', 'invalid'), now), isFalse);
  });
  test('kickoff comparison respects timezone offsets', () {
    expect(MatchRules.canPredict(fixture('scheduled', '2026-10-11T15:00:00+03:00'), now), isFalse);
    expect(MatchRules.canPredict(fixture('scheduled', '2026-10-11T15:00:01+03:00'), now), isTrue);
  });
}
