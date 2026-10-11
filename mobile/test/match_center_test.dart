import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:forty_five_forty_five/features/games/games_screen.dart';
import 'package:forty_five_forty_five/models/club.dart';
import 'package:forty_five_forty_five/repositories/app_repository.dart';

class FakeRepository implements AppRepository {
  Map<String, dynamic> latest = {
    'id': 'match-1', 'status': 'live',
    'home_name': 'בית', 'away_name': 'חוץ',
    'home_score': 1, 'away_score': 0,
    'kickoff': '2026-10-11T12:00:00Z',
  };
  int fetches = 0;
  bool fail = false;

  @override
  Future<Map<String, dynamic>?> match(String id) async {
    fetches++;
    if (fail) throw Exception('offline');
    return Map<String, dynamic>.from(latest);
  }
  @override
  Future<List<Map<String, dynamic>>> events(String id) async => [];
  @override
  Future<List<Map<String, dynamic>>> chat({String? club, String? match}) async => [];
  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

void main() {
  const club = Club('club-1', 'בית', 'בית', Colors.red);
  testWidgets('refresh replaces stale score and polling is disposed', (tester) async {
    final repository = FakeRepository();
    await tester.pumpWidget(MaterialApp(theme: ThemeData(splashFactory: NoSplash.splashFactory), home: MatchCenter(
      club: club, repository: repository,
      match: {...repository.latest, 'home_score': 0},
    )));
    await tester.pump();
    await tester.pump();
    expect(find.text('1  -  0'), findsOneWidget);

    repository.latest['home_score'] = 2;
    await tester.tap(find.byTooltip('רענון'));
    await tester.pump();
    await tester.pump();
    expect(find.text('2  -  0'), findsOneWidget);

    repository.latest['home_score'] = 3;
    await tester.pump(const Duration(seconds: 30));
    await tester.pump();
    await tester.pump();
    expect(find.text('3  -  0'), findsOneWidget);

    await tester.pumpWidget(const SizedBox());
    final fetches = repository.fetches;
    await tester.pump(const Duration(seconds: 60));
    expect(repository.fetches, fetches);
    expect(tester.takeException(), isNull);
  });

  testWidgets('failed refresh retains last score and displays retry feedback', (tester) async {
    final repository = FakeRepository();
    await tester.pumpWidget(MaterialApp(theme: ThemeData(splashFactory: NoSplash.splashFactory), home: MatchCenter(
      club: club, repository: repository, match: repository.latest,
    )));
    await tester.pump();
    await tester.pump();
    repository.fail = true;
    await tester.tap(find.byTooltip('רענון'));
    await tester.pump();
    await tester.pump();
    expect(find.text('1  -  0'), findsOneWidget);
    expect(find.text('הרענון נכשל. נסה שוב.'), findsOneWidget);
    await tester.pumpWidget(const SizedBox());
  });
}
