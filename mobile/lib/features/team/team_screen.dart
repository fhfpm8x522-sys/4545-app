import 'package:flutter/material.dart';

import '../../models/club.dart';
import '../../repositories/app_repository.dart';
import '../community/community_screen.dart';

class TeamScreen extends StatefulWidget {
  final Club club;

  const TeamScreen({
    super.key,
    required this.club,
  });

  @override
  State<TeamScreen> createState() => _TeamScreenState();
}

class _TeamScreenState extends State<TeamScreen> {
  int selectedTab = 0;

  final repository = AppRepository();

  final tabs = const [
    'סקירה',
    'סגל',
    'נתונים',
    'מועדון',
    'היציע',
  ];

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(18),
            child: Container(
              width: double.infinity,
              padding: const EdgeInsets.all(22),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(28),
                color: widget.club.accent.withValues(
                  alpha: .15,
                ),
                border: Border.all(
                  color: widget.club.accent.withValues(
                    alpha: .30,
                  ),
                ),
              ),
              child: Row(
                children: [
                  CircleAvatar(
                    radius: 30,
                    backgroundColor:
                        widget.club.accent.withValues(alpha: .20),
                    backgroundImage:
                        widget.club.crestUrl != null
                            ? NetworkImage(widget.club.crestUrl!)
                            : null,
                    child: widget.club.crestUrl == null
                        ? Text(
                            widget.club.shortName.characters.first,
                            style: const TextStyle(
                              fontSize: 22,
                              fontWeight: FontWeight.w900,
                            ),
                          )
                        : null,
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment:
                          CrossAxisAlignment.start,
                      children: [
                        Text(
                          widget.club.name,
                          style: const TextStyle(
                            fontSize: 28,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                        const SizedBox(height: 4),
                        const Text(
                          'הקבוצה שלי • חיים את הקבוצה.',
                          style: TextStyle(
                            color: Colors.white60,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),

          SizedBox(
            height: 46,
            child: ListView.builder(
              padding:
                  const EdgeInsets.symmetric(horizontal: 12),
              scrollDirection: Axis.horizontal,
              itemCount: tabs.length,
              itemBuilder: (context, index) {
                return Padding(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 4),
                  child: ChoiceChip(
                    label: Text(tabs[index]),
                    selected: selectedTab == index,
                    selectedColor:
                        widget.club.accent.withValues(alpha: .35),
                    onSelected: (_) {
                      setState(() {
                        selectedTab = index;
                      });
                    },
                  ),
                );
              },
            ),
          ),

          const SizedBox(height: 8),

          Expanded(
            child: _buildTab(),
          ),
        ],
      ),
    );
  }

  Widget _buildTab() {
    switch (selectedTab) {
      case 1:
        return _squad();

      case 2:
        return _statistics();

      case 3:
        return _club();

      case 4:
        return CommunityScreen(
          club: widget.club,
          embedded: true,
        );

      default:
        return _overview();
    }
  }

  Widget _overview() {
    return FutureBuilder<List<Map<String, dynamic>>>(
      future: repository.matches(widget.club.id),
      builder: (context, snapshot) {
        if (!snapshot.hasData) {
          return const Center(
            child: CircularProgressIndicator(),
          );
        }

        final matches = snapshot.data!;

        final finished = matches.where(
          (match) => match['status'] == 'finished',
        );

        int wins = 0;
        int draws = 0;
        int losses = 0;
        int goalsFor = 0;
        int goalsAgainst = 0;

        for (final match in finished) {
          final homeScore =
              (match['home_score'] as num?)?.toInt() ?? 0;

          final awayScore =
              (match['away_score'] as num?)?.toInt() ?? 0;

          final isHome =
              match['home_club_id'] == widget.club.id;

          final ourGoals =
              isHome ? homeScore : awayScore;

          final theirGoals =
              isHome ? awayScore : homeScore;

          goalsFor += ourGoals;
          goalsAgainst += theirGoals;

          if (ourGoals > theirGoals) {
            wins++;
          } else if (ourGoals == theirGoals) {
            draws++;
          } else {
            losses++;
          }
        }

        return ListView(
          padding: const EdgeInsets.all(18),
          children: [
            const Text(
              'סקירת העונה',
              style: TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.w900,
              ),
            ),

            const SizedBox(height: 12),

            Row(
              children: [
                Expanded(
                  child: _statCard(
                    'משחקים',
                    '${finished.length}',
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: _statCard(
                    'ניצחונות',
                    '$wins',
                  ),
                ),
              ],
            ),

            const SizedBox(height: 8),

            Row(
              children: [
                Expanded(
                  child: _statCard(
                    'תיקו',
                    '$draws',
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: _statCard(
                    'הפסדים',
                    '$losses',
                  ),
                ),
              ],
            ),

            const SizedBox(height: 8),

            Row(
              children: [
                Expanded(
                  child: _statCard(
                    'שערי זכות',
                    '$goalsFor',
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: _statCard(
                    'שערי חובה',
                    '$goalsAgainst',
                  ),
                ),
              ],
            ),

            const SizedBox(height: 18),

            Card(
              child: Padding(
                padding: const EdgeInsets.all(18),
                child: Text(
                  matches.isEmpty
                      ? 'נתוני הקבוצה יתעדכנו ברגע שיוזנו משחקים במערכת.'
                      : 'כל הנתונים כאן מחושבים מהמשחקים שנמצאים ב־45:45.',
                  style: const TextStyle(
                    color: Colors.white70,
                  ),
                ),
              ),
            ),
          ],
        );
      },
    );
  }

  Widget _squad() {
    return FutureBuilder<List<Map<String, dynamic>>>(
      future: repository.players(widget.club.id),
      builder: (context, snapshot) {
        if (!snapshot.hasData) {
          return const Center(
            child: CircularProgressIndicator(),
          );
        }

        final players = snapshot.data!;

        if (players.isEmpty) {
          return const Center(
            child: Text(
              'עדיין לא הוזן סגל.',
              style: TextStyle(
                color: Colors.white60,
              ),
            ),
          );
        }

        return ListView(
          padding: const EdgeInsets.all(18),
          children: [
            const Text(
              'הסגל',
              style: TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.w900,
              ),
            ),

            const SizedBox(height: 10),

            ...players.map(
              (player) => Card(
                child: ListTile(
                  leading: CircleAvatar(
                    backgroundColor:
                        widget.club.accent.withValues(
                      alpha: .25,
                    ),
                    backgroundImage:
                        player['image_url'] != null
                            ? NetworkImage(
                                player['image_url'],
                              )
                            : null,
                    child: player['image_url'] == null
                        ? Text(
                            '${player['number'] ?? '-'}',
                            style: const TextStyle(
                              fontWeight: FontWeight.w900,
                            ),
                          )
                        : null,
                  ),
                  title: Text(
                    player['name'] ?? '',
                    style: const TextStyle(
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                  subtitle: Text(
                    '${player['position'] ?? 'עמדה לא הוגדרה'}'
                    '${player['nationality'] != null ? ' • ${player['nationality']}' : ''}',
                  ),
                  trailing: const Icon(
                    Icons.chevron_left,
                  ),
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => PlayerScreen(
                          player: player,
                          club: widget.club,
                        ),
                      ),
                    );
                  },
                ),
              ),
            ),
          ],
        );
      },
    );
  }

  Widget _statistics() {
    return FutureBuilder<List<Map<String, dynamic>>>(
      future: repository.stats(widget.club.id),
      builder: (context, snapshot) {
        if (!snapshot.hasData) {
          return const Center(
            child: CircularProgressIndicator(),
          );
        }

        final stats = snapshot.data!;

        if (stats.isEmpty) {
          return const Center(
            child: Text(
              'עדיין אין נתוני שחקנים לעונה.',
              style: TextStyle(
                color: Colors.white60,
              ),
            ),
          );
        }

        return ListView(
          padding: const EdgeInsets.all(18),
          children: [
            const Text(
              'מובילי העונה',
              style: TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.w900,
              ),
            ),

            const SizedBox(height: 10),

            ...stats.map(
              (item) {
                final player =
                    item['players']
                        as Map<String, dynamic>?;

                return Card(
                  child: ListTile(
                    leading: CircleAvatar(
                      backgroundColor:
                          widget.club.accent.withValues(
                        alpha: .25,
                      ),
                      child: Text(
                        '${player?['number'] ?? '-'}',
                      ),
                    ),
                    title: Text(
                      player?['name'] ?? 'שחקן',
                      style: const TextStyle(
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                    subtitle: Text(
                      '${item['appearances'] ?? 0} הופעות'
                      ' • ${item['minutes'] ?? 0} דקות',
                    ),
                    trailing: Text(
                      '${item['goals'] ?? 0} ⚽  '
                      '${item['assists'] ?? 0} 🅰️',
                      style: const TextStyle(
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ),
                );
              },
            ),
          ],
        );
      },
    );
  }

  Widget _club() {
    return FutureBuilder<List<dynamic>>(
      future: Future.wait([
        repository.history(widget.club.id),
        repository.chants(widget.club.id),
      ]),
      builder: (context, snapshot) {
        if (!snapshot.hasData) {
          return const Center(
            child: CircularProgressIndicator(),
          );
        }

        final history =
            snapshot.data![0]
                as List<Map<String, dynamic>>;

        final chants =
            snapshot.data![1]
                as List<Map<String, dynamic>>;

        return ListView(
          padding: const EdgeInsets.all(18),
          children: [
            const Text(
              'המועדון',
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.w900,
              ),
            ),

            const SizedBox(height: 18),

            const Text(
              'היסטוריה',
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w900,
              ),
            ),

            const SizedBox(height: 8),

            if (history.isEmpty)
              const Card(
                child: Padding(
                  padding: EdgeInsets.all(18),
                  child: Text(
                    'עדיין לא הוזנה היסטוריית מועדון.',
                  ),
                ),
              ),

            ...history.map(
              (event) => Card(
                child: ListTile(
                  title: Text(
                    event['title'] ?? '',
                    style: const TextStyle(
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                  subtitle: Text(
                    '${event['event_date'] ?? ''}\n'
                    '${event['body'] ?? ''}',
                  ),
                  isThreeLine: true,
                ),
              ),
            ),

            const SizedBox(height: 22),

            const Text(
              'שירי היציע',
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w900,
              ),
            ),

            const SizedBox(height: 8),

            if (chants.isEmpty)
              const Card(
                child: Padding(
                  padding: EdgeInsets.all(18),
                  child: Text(
                    'עדיין לא הוזנו שירי אוהדים.',
                  ),
                ),
              ),

            ...chants.map(
              (chant) => Card(
                child: Padding(
                  padding: const EdgeInsets.all(18),
                  child: Text(
                    chant['line'] ?? '',
                    style: const TextStyle(
                      fontSize: 17,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              ),
            ),
          ],
        );
      },
    );
  }

  Widget _statCard(
    String title,
    String value,
  ) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          children: [
            Text(
              value,
              style: TextStyle(
                color: widget.club.accent,
                fontSize: 28,
                fontWeight: FontWeight.w900,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              title,
              style: const TextStyle(
                color: Colors.white60,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class PlayerScreen extends StatelessWidget {
  final Map<String, dynamic> player;
  final Club club;

  const PlayerScreen({
    super.key,
    required this.player,
    required this.club,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(
          player['name'] ?? 'שחקן',
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.all(18),
        children: [
          Center(
            child: CircleAvatar(
              radius: 55,
              backgroundColor:
                  club.accent.withValues(alpha: .25),
              backgroundImage:
                  player['image_url'] != null
                      ? NetworkImage(
                          player['image_url'],
                        )
                      : null,
              child: player['image_url'] == null
                  ? Text(
                      '${player['number'] ?? '-'}',
                      style: const TextStyle(
                        fontSize: 32,
                        fontWeight: FontWeight.w900,
                      ),
                    )
                  : null,
            ),
          ),

          const SizedBox(height: 18),

          Text(
            player['name'] ?? '',
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontSize: 28,
              fontWeight: FontWeight.w900,
            ),
          ),

          const SizedBox(height: 6),

          Text(
            '#${player['number'] ?? '-'} • '
            '${player['position'] ?? 'ללא עמדה'}',
            textAlign: TextAlign.center,
            style: TextStyle(
              color: club.accent,
              fontWeight: FontWeight.w800,
            ),
          ),

          const SizedBox(height: 22),

          _detail(
            'לאום',
            player['nationality'] ?? 'לא הוגדר',
          ),

          _detail(
            'תאריך לידה',
            player['birth_date'] ?? 'לא הוגדר',
          ),
        ],
      ),
    );
  }

  Widget _detail(
    String title,
    dynamic value,
  ) {
    return Card(
      child: ListTile(
        title: Text(title),
        trailing: Text(
          '$value',
          style: const TextStyle(
            fontWeight: FontWeight.w800,
          ),
        ),
      ),
    );
  }
}
