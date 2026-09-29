import 'package:flutter/material.dart';

import '../../models/club.dart';
import '../../repositories/app_repository.dart';

class GamesScreen extends StatefulWidget {
  final Club club;

  const GamesScreen({
    super.key,
    required this.club,
  });

  @override
  State<GamesScreen> createState() => _GamesScreenState();
}

class _GamesScreenState extends State<GamesScreen> {
  final repository = AppRepository();

  late Future<List<Map<String, dynamic>>> matchesFuture;

  @override
  void initState() {
    super.initState();
    matchesFuture = repository.matches(widget.club.id);
  }

  Future<void> refresh() async {
    final future = repository.matches(widget.club.id);

    setState(() {
      matchesFuture = future;
    });

    await future;
  }

  DateTime? kickoff(Map<String, dynamic> match) {
    return DateTime.tryParse(
      match['kickoff']?.toString() ?? '',
    )?.toLocal();
  }

  List<Map<String, dynamic>> sortMatches(
    List<Map<String, dynamic>> input,
  ) {
    final now = DateTime.now();

    final live = <Map<String, dynamic>>[];
    final future = <Map<String, dynamic>>[];
    final past = <Map<String, dynamic>>[];

    for (final match in input) {
      final status =
          match['status']?.toString().toLowerCase() ?? '';

      final date = kickoff(match);

      if (status == 'live') {
        live.add(match);
      } else if (status != 'finished' &&
          date != null &&
          date.isAfter(now)) {
        future.add(match);
      } else {
        past.add(match);
      }
    }

    future.sort((a, b) {
      final aa = kickoff(a) ?? DateTime(9999);
      final bb = kickoff(b) ?? DateTime(9999);

      return aa.compareTo(bb);
    });

    past.sort((a, b) {
      final aa = kickoff(a) ?? DateTime(1900);
      final bb = kickoff(b) ?? DateTime(1900);

      return bb.compareTo(aa);
    });

    return [
      ...live,
      ...future,
      ...past,
    ];
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: FutureBuilder<List<Map<String, dynamic>>>(
        future: matchesFuture,
        builder: (context, snapshot) {
          if (snapshot.connectionState ==
                  ConnectionState.waiting &&
              !snapshot.hasData) {
            return const Center(
              child: CircularProgressIndicator(),
            );
          }

          if (snapshot.hasError) {
            return _ErrorState(
              onRetry: refresh,
            );
          }

          final matches = sortMatches(
            snapshot.data ?? [],
          );

          return RefreshIndicator(
            onRefresh: refresh,
            child: ListView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.fromLTRB(
                16,
                18,
                16,
                110,
              ),
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment:
                            CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'משחקים',
                            style: TextStyle(
                              fontSize: 32,
                              fontWeight: FontWeight.w900,
                            ),
                          ),
                          const SizedBox(height: 3),
                          Text(
                            widget.club.name,
                            style: const TextStyle(
                              color: Colors.white54,
                              fontSize: 15,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                    ),
                    Container(
                      width: 46,
                      height: 46,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: widget.club.accent.withValues(
                          alpha: .14,
                        ),
                      ),
                      child: Icon(
                        Icons.sports_soccer,
                        color: widget.club.accent,
                      ),
                    ),
                  ],
                ),

                const SizedBox(height: 24),

                if (matches.isEmpty) const _EmptyState(),

                ...matches.map(
                  (match) => Padding(
                    padding: const EdgeInsets.only(
                      bottom: 14,
                    ),
                    child: MatchCard(
                      match: match,
                      club: widget.club,
                      onTap: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (_) => MatchCenter(
                              match: match,
                              club: widget.club,
                            ),
                          ),
                        );
                      },
                    ),
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}

// ============================================================
// MATCH CARD
// ============================================================

class MatchCard extends StatelessWidget {
  final Map<String, dynamic> match;
  final Club club;
  final VoidCallback onTap;

  const MatchCard({
    super.key,
    required this.match,
    required this.club,
    required this.onTap,
  });

  DateTime? get kickoff {
    return DateTime.tryParse(
      match['kickoff']?.toString() ?? '',
    )?.toLocal();
  }

  String get status =>
      match['status']?.toString().toLowerCase() ?? '';

  bool get live => status == 'live';

  bool get finished => status == 'finished';

  static String timeOnly(DateTime? date) {
    if (date == null) return 'TBD';

    return '${date.hour.toString().padLeft(2, '0')}:'
        '${date.minute.toString().padLeft(2, '0')}';
  }

  static String dateOnly(DateTime? date) {
    if (date == null) {
      return 'מועד טרם נקבע';
    }

    return '${date.day.toString().padLeft(2, '0')}.'
        '${date.month.toString().padLeft(2, '0')}.'
        '${date.year}';
  }

  @override
  Widget build(BuildContext context) {
    final home = FootballHebrew.team(
      match['home_name']?.toString(),
    );

    final away = FootballHebrew.team(
      match['away_name']?.toString(),
    );

    return Material(
      color: const Color(0xFF111216),
      borderRadius: BorderRadius.circular(24),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.fromLTRB(
            16,
            15,
            16,
            17,
          ),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(24),
            border: Border.all(
              color: live
                  ? Colors.redAccent.withValues(alpha: .5)
                  : Colors.white.withValues(alpha: .055),
            ),
          ),
          child: Column(
            children: [
              Row(
                children: [
                  _NetworkImage(
                    url: match['competition_logo_url']
                        ?.toString(),
                    size: 24,
                    fallback: Icons.emoji_events_outlined,
                    contain: true,
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      FootballHebrew.competition(
                        match['competition']?.toString(),
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        color: club.accent,
                        fontSize: 13,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                  ),
                  if ((match['round_name']?.toString() ?? '')
                      .isNotEmpty)
                    Text(
                      FootballHebrew.round(
                        match['round_name'].toString(),
                      ),
                      style: const TextStyle(
                        color: Colors.white38,
                        fontSize: 11,
                      ),
                    ),
                ],
              ),

              const SizedBox(height: 20),

              Row(
                children: [
                  Expanded(
                    child: _MatchTeam(
                      name: home,
                      logo:
                          match['home_logo_url']?.toString(),
                    ),
                  ),
                  SizedBox(
                    width: 92,
                    child: Column(
                      children: [
                        Text(
                          finished || live
                              ? '${match['home_score'] ?? '–'}  -  ${match['away_score'] ?? '–'}'
                              : timeOnly(kickoff),
                          textDirection: TextDirection.ltr,
                          style: const TextStyle(
                            fontSize: 24,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                        const SizedBox(height: 5),
                        Text(
                          live
                              ? '● LIVE'
                              : finished
                                  ? 'הסתיים'
                                  : 'VS',
                          style: TextStyle(
                            color: live
                                ? Colors.redAccent
                                : Colors.white38,
                            fontSize: 10,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                      ],
                    ),
                  ),
                  Expanded(
                    child: _MatchTeam(
                      name: away,
                      logo:
                          match['away_logo_url']?.toString(),
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 16),

              Divider(
                height: 1,
                color: Colors.white.withValues(alpha: .06),
              ),

              const SizedBox(height: 11),

              Row(
                children: [
                  const Icon(
                    Icons.calendar_today_outlined,
                    size: 14,
                    color: Colors.white38,
                  ),
                  const SizedBox(width: 6),
                  Text(
                    dateOnly(kickoff),
                    textDirection: TextDirection.ltr,
                    style: const TextStyle(
                      color: Colors.white54,
                      fontSize: 12,
                    ),
                  ),
                  const Spacer(),
                  if (status == 'postponed')
                    const _StatusPill('נדחה'),
                  if (status == 'cancelled')
                    const _StatusPill('בוטל'),
                  if (live)
                    const _StatusPill(
                      'LIVE',
                      live: true,
                    ),
                  const Icon(
                    Icons.chevron_left,
                    color: Colors.white38,
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ============================================================
// MATCH CENTER
// ============================================================

class MatchCenter extends StatefulWidget {
  final Map<String, dynamic> match;
  final Club club;

  const MatchCenter({
    super.key,
    required this.match,
    required this.club,
  });

  @override
  State<MatchCenter> createState() =>
      _MatchCenterState();
}

class _MatchCenterState extends State<MatchCenter> {
  final repository = AppRepository();

  final messageController = TextEditingController();

  int homePrediction = 0;
  int awayPrediction = 0;

  @override
  void dispose() {
    messageController.dispose();
    super.dispose();
  }

  DateTime? get kickoff {
    return DateTime.tryParse(
      widget.match['kickoff']?.toString() ?? '',
    )?.toLocal();
  }

  String get status =>
      widget.match['status']?.toString().toLowerCase() ??
      '';

  bool get finished => status == 'finished';

  bool get live => status == 'live';

  bool get canPredict =>
      !finished &&
      !live &&
      status != 'cancelled';

  String get dateText {
    final date = kickoff;

    if (date == null) {
      return 'מועד טרם נקבע';
    }

    return '${date.day.toString().padLeft(2, '0')}.'
        '${date.month.toString().padLeft(2, '0')}.'
        '${date.year} • '
        '${date.hour.toString().padLeft(2, '0')}:'
        '${date.minute.toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    final match = widget.match;

    final homeName = FootballHebrew.team(
      match['home_name']?.toString(),
    );

    final awayName = FootballHebrew.team(
      match['away_name']?.toString(),
    );

    return Scaffold(
      appBar: AppBar(
        title: const Text(
          'MATCH CENTER',
          style: TextStyle(
            fontWeight: FontWeight.w900,
          ),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(
          14,
          10,
          14,
          60,
        ),
        children: [
          _MatchHero(
            match: match,
            club: widget.club,
            homeName: homeName,
            awayName: awayName,
            kickoff: kickoff,
            live: live,
            finished: finished,
            dateText: dateText,
          ),

          const SizedBox(height: 14),

          if (finished || live)
            FutureBuilder<List<Map<String, dynamic>>>(
              future: repository.events(
                match['id'].toString(),
              ),
              builder: (context, snapshot) {
                if (snapshot.connectionState ==
                        ConnectionState.waiting &&
                    !snapshot.hasData) {
                  return const Padding(
                    padding: EdgeInsets.all(30),
                    child: Center(
                      child: CircularProgressIndicator(),
                    ),
                  );
                }

                if (snapshot.hasError) {
                  return const _SmallError(
                    'לא הצלחנו לטעון את אירועי המשחק',
                  );
                }

                return _MatchEventsTimeline(
                  events: snapshot.data ?? [],
                  homeName: homeName,
                  awayName: awayName,
                  homeLogo:
                      match['home_logo_url']?.toString(),
                  awayLogo:
                      match['away_logo_url']?.toString(),
                );
              },
            ),

          if (finished || live)
            const SizedBox(height: 14),

          if (canPredict)
            _PredictionCard(
              homeName: homeName,
              awayName: awayName,
              homePrediction: homePrediction,
              awayPrediction: awayPrediction,
              onHomeMinus: () {
                if (homePrediction > 0) {
                  setState(() {
                    homePrediction--;
                  });
                }
              },
              onHomePlus: () {
                setState(() {
                  homePrediction++;
                });
              },
              onAwayMinus: () {
                if (awayPrediction > 0) {
                  setState(() {
                    awayPrediction--;
                  });
                }
              },
              onAwayPlus: () {
                setState(() {
                  awayPrediction++;
                });
              },
              onSubmit: () async {
                await repository.prediction(
                  match['id'].toString(),
                  homePrediction,
                  awayPrediction,
                );

                if (!context.mounted) return;

                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('הניחוש נשמר 🔥'),
                  ),
                );
              },
            ),

          Card(
            child: Padding(
              padding: const EdgeInsets.all(14),
              child: SizedBox(
                width: double.infinity,
                child: OutlinedButton.icon(
                  onPressed: () async {
                    await repository.attendance(
                      match['id'].toString(),
                    );

                    if (!context.mounted) return;

                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text(
                          'המשחק נוסף לרשימת "הייתי במשחק"',
                        ),
                      ),
                    );
                  },
                  icon: const Icon(Icons.stadium),
                  label: const Text('הייתי במשחק'),
                ),
              ),
            ),
          ),

          const SizedBox(height: 18),

          const Text(
            'MATCH CHAT',
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.w900,
            ),
          ),

          const SizedBox(height: 8),

          TextField(
            controller: messageController,
            decoration: InputDecoration(
              hintText: 'כתוב הודעה...',
              suffixIcon: IconButton(
                icon: const Icon(Icons.send),
                onPressed: () async {
                  final text =
                      messageController.text.trim();

                  if (text.isEmpty) return;

                  await repository.message(
                    match: match['id'].toString(),
                    body: text,
                  );

                  messageController.clear();

                  setState(() {});
                },
              ),
            ),
          ),

          const SizedBox(height: 10),

          FutureBuilder<List<Map<String, dynamic>>>(
            future: repository.chat(
              match: match['id'].toString(),
            ),
            builder: (context, snapshot) {
              final messages = snapshot.data ?? [];

              if (messages.isEmpty) {
                return const Padding(
                  padding: EdgeInsets.all(16),
                  child: Text(
                    'עדיין אין הודעות. תהיה הראשון ביציע 🔥',
                    style: TextStyle(
                      color: Colors.white54,
                    ),
                  ),
                );
              }

              return Column(
                children: messages.map(
                  (message) {
                    final profile =
                        message['profiles']
                            as Map<String, dynamic>?;

                    final author =
                        profile?['display_name'] ??
                            profile?['username'] ??
                            'אוהד';

                    return ListTile(
                      contentPadding: EdgeInsets.zero,
                      title: Text(
                        author.toString(),
                        style: const TextStyle(
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      subtitle: Text(
                        message['body']?.toString() ?? '',
                      ),
                    );
                  },
                ).toList(),
              );
            },
          ),
        ],
      ),
    );
  }
}

// ============================================================
// HERO
// ============================================================

class _MatchHero extends StatelessWidget {
  final Map<String, dynamic> match;
  final Club club;
  final String homeName;
  final String awayName;
  final DateTime? kickoff;
  final bool live;
  final bool finished;
  final String dateText;

  const _MatchHero({
    required this.match,
    required this.club,
    required this.homeName,
    required this.awayName,
    required this.kickoff,
    required this.live,
    required this.finished,
    required this.dateText,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(
        18,
        18,
        18,
        22,
      ),
      decoration: BoxDecoration(
        color: const Color(0xFF111216),
        borderRadius: BorderRadius.circular(28),
        border: Border.all(
          color: club.accent.withValues(alpha: .20),
        ),
      ),
      child: Column(
        children: [
          Text(
            FootballHebrew.competition(
              match['competition']?.toString(),
            ),
            style: TextStyle(
              color: club.accent,
              fontWeight: FontWeight.w900,
            ),
          ),

          const SizedBox(height: 24),

          Row(
            children: [
              Expanded(
                child: _MatchTeam(
                  name: homeName,
                  logo:
                      match['home_logo_url']?.toString(),
                ),
              ),

              SizedBox(
                width: 100,
                child: Column(
                  children: [
                    Text(
                      finished || live
                          ? '${match['home_score'] ?? '–'}  -  ${match['away_score'] ?? '–'}'
                          : MatchCard.timeOnly(kickoff),
                      textDirection: TextDirection.ltr,
                      style: const TextStyle(
                        fontSize: 28,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                    const SizedBox(height: 5),
                    Text(
                      live
                          ? '● LIVE'
                          : finished
                              ? 'הסתיים'
                              : 'VS',
                      style: TextStyle(
                        color: live
                            ? Colors.redAccent
                            : Colors.white38,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                  ],
                ),
              ),

              Expanded(
                child: _MatchTeam(
                  name: awayName,
                  logo:
                      match['away_logo_url']?.toString(),
                ),
              ),
            ],
          ),

          const SizedBox(height: 20),

          Text(
            dateText,
            textDirection: TextDirection.ltr,
            style: const TextStyle(
              color: Colors.white70,
            ),
          ),

          if ((match['stadium']?.toString() ?? '')
              .isNotEmpty) ...[
            const SizedBox(height: 7),
            Text(
              match['stadium'].toString(),
              textAlign: TextAlign.center,
              style: const TextStyle(
                color: Colors.white54,
                fontSize: 12,
              ),
            ),
          ],
        ],
      ),
    );
  }
}

// ============================================================
// TIMELINE
// ============================================================

class _MatchEventsTimeline extends StatelessWidget {
  final List<Map<String, dynamic>> events;

  final String homeName;
  final String awayName;

  final String? homeLogo;
  final String? awayLogo;

  const _MatchEventsTimeline({
    required this.events,
    required this.homeName,
    required this.awayName,
    this.homeLogo,
    this.awayLogo,
  });

  int minute(Map<String, dynamic> event) {
    final value = event['minute'];

    if (value is int) return value;

    return int.tryParse(
          value?.toString() ?? '',
        ) ??
        0;
  }

  @override
  Widget build(BuildContext context) {
    if (events.isEmpty) {
      return const _SmallError(
        'אין עדיין אירועים למשחק.',
      );
    }

    final sorted = [...events];

    sorted.sort(
      (a, b) => minute(b).compareTo(
        minute(a),
      ),
    );

    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFF11151A),
        borderRadius: BorderRadius.circular(22),
        border: Border.all(
          color: Colors.white.withValues(
            alpha: .06,
          ),
        ),
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        children: [
          const Padding(
            padding: EdgeInsets.fromLTRB(
              14,
              16,
              14,
              8,
            ),
            child: Align(
              alignment: Alignment.centerRight,
              child: Text(
                'אירועי המשחק',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w900,
                ),
              ),
            ),
          ),

          Padding(
            padding: const EdgeInsets.fromLTRB(
              12,
              6,
              12,
              12,
            ),
            child: Row(
              children: [
                Expanded(
                  child: _TeamHeader(
                    name: homeName,
                    logo: homeLogo,
                  ),
                ),
                const SizedBox(width: 58),
                Expanded(
                  child: _TeamHeader(
                    name: awayName,
                    logo: awayLogo,
                    reverse: true,
                  ),
                ),
              ],
            ),
          ),

          Divider(
            height: 1,
            color: Colors.white.withValues(
              alpha: .07,
            ),
          ),

          ...List.generate(
            sorted.length,
            (index) => _TimelineRow(
              event: sorted[index],
              first: index == 0,
              last: index == sorted.length - 1,
            ),
          ),
        ],
      ),
    );
  }
}

class _TimelineRow extends StatelessWidget {
  final Map<String, dynamic> event;

  final bool first;
  final bool last;

  const _TimelineRow({
    required this.event,
    required this.first,
    required this.last,
  });

  int get minute {
    final value = event['minute'];

    if (value is int) return value;

    return int.tryParse(
          value?.toString() ?? '',
        ) ??
        0;
  }

  bool get home =>
      event['team_side']
          ?.toString()
          .toLowerCase() ==
      'home';

  String get type =>
      event['event_type']
          ?.toString()
          .toLowerCase() ??
      '';

  Map<String, dynamic>? player(
    bool secondary,
  ) {
    final value = event[
        secondary
            ? 'secondary_player'
            : 'player'];

    if (value is Map<String, dynamic>) {
      return value;
    }

    if (value is Map) {
      return Map<String, dynamic>.from(
        value,
      );
    }

    return null;
  }

  String name(bool secondary) {
    final p = player(secondary);

    final candidates = [
      p?['name_he'],
      p?['name'],
      secondary
          ? event['secondary_player_name']
          : event['player_name'],
    ];

    for (final value in candidates) {
      final text =
          value?.toString().trim() ?? '';

      if (text.isNotEmpty) {
        return text;
      }
    }

    return '';
  }

  String? image(bool secondary) {
    final value = player(secondary)?[
            'image_url']
        ?.toString()
        .trim();

    if (value == null || value.isEmpty) {
      return null;
    }

    return value;
  }

  @override
  Widget build(BuildContext context) {
    final content = _EventContent(
      type: type,
      primaryName: name(false),
      secondaryName: name(true),
      primaryImage: image(false),
      secondaryImage: image(true),
      score: event['score']?.toString(),
      alignEnd: home,
    );

    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment:
            CrossAxisAlignment.stretch,
        children: [
          Expanded(
            child:
                home ? content : const SizedBox(),
          ),

          SizedBox(
            width: 58,
            child: Stack(
              alignment: Alignment.center,
              children: [
                Positioned(
                  top: first ? 25 : 0,
                  bottom: last ? 25 : 0,
                  child: Container(
                    width: 1,
                    color: Colors.white.withValues(
                      alpha: .20,
                    ),
                  ),
                ),
                Container(
                  padding:
                      const EdgeInsets.symmetric(
                    horizontal: 7,
                    vertical: 5,
                  ),
                  decoration: BoxDecoration(
                    color:
                        const Color(0xFF11151A),
                    borderRadius:
                        BorderRadius.circular(999),
                    border: Border.all(
                      color:
                          Colors.white.withValues(
                        alpha: .12,
                      ),
                    ),
                  ),
                  child: Text(
                    "$minute'",
                    textDirection:
                        TextDirection.ltr,
                    style: const TextStyle(
                      fontSize: 12,
                      fontWeight:
                          FontWeight.w900,
                    ),
                  ),
                ),
              ],
            ),
          ),

          Expanded(
            child:
                home ? const SizedBox() : content,
          ),
        ],
      ),
    );
  }
}

// ============================================================
// EVENT CONTENT
// ============================================================

class _EventContent extends StatelessWidget {
  final String type;

  final String primaryName;
  final String secondaryName;

  final String? primaryImage;
  final String? secondaryImage;

  final String? score;

  final bool alignEnd;

  const _EventContent({
    required this.type,
    required this.primaryName,
    required this.secondaryName,
    required this.primaryImage,
    required this.secondaryImage,
    required this.score,
    required this.alignEnd,
  });

  bool get substitution =>
      type == 'substitution';

  bool get goal => type.contains('goal');

  bool get yellow =>
      type == 'yellow_card';

  bool get red => type == 'red_card';

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(
        horizontal: 7,
        vertical: 13,
      ),
      child: substitution
          ? substitutionWidget()
          : normalWidget(),
    );
  }

  Widget normalWidget() {
    final displayName =
        primaryName.isEmpty
            ? 'שחקן'
            : primaryName;

    final text = Flexible(
      child: Column(
        crossAxisAlignment: alignEnd
            ? CrossAxisAlignment.end
            : CrossAxisAlignment.start,
        children: [
          Text(
            displayName,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            textAlign: alignEnd
                ? TextAlign.end
                : TextAlign.start,
            style: const TextStyle(
              fontSize: 12.5,
              fontWeight: FontWeight.w900,
            ),
          ),

          if (goal &&
              secondaryName.isNotEmpty &&
              secondaryName != displayName)
            Padding(
              padding:
                  const EdgeInsets.only(top: 3),
              child: Text(
                'בישול: $secondaryName',
                maxLines: 1,
                overflow:
                    TextOverflow.ellipsis,
                style: const TextStyle(
                  color: Colors.white54,
                  fontSize: 10,
                ),
              ),
            ),

          if (goal &&
              (score ?? '').isNotEmpty)
            Padding(
              padding:
                  const EdgeInsets.only(top: 2),
              child: Text(
                score!,
                textDirection:
                    TextDirection.ltr,
                style: const TextStyle(
                  color: Colors.white38,
                  fontSize: 10,
                ),
              ),
            ),
        ],
      ),
    );

    final avatar = _PlayerAvatar(
      url: primaryImage,
      size: 33,
    );

    final icon = _EventIcon(
      goal: goal,
      yellow: yellow,
      red: red,
    );

    return Row(
      mainAxisAlignment: alignEnd
          ? MainAxisAlignment.end
          : MainAxisAlignment.start,
      children: alignEnd
          ? [
              text,
              const SizedBox(width: 7),
              avatar,
              const SizedBox(width: 6),
              icon,
            ]
          : [
              icon,
              const SizedBox(width: 6),
              avatar,
              const SizedBox(width: 7),
              text,
            ],
    );
  }

  Widget substitutionWidget() {
    // GOAL:
    // primary = השחקן שיוצא
    // secondary = השחקן שנכנס

    return Column(
      crossAxisAlignment: alignEnd
          ? CrossAxisAlignment.end
          : CrossAxisAlignment.start,
      children: [
        _SubPlayer(
          name: primaryName.isEmpty
              ? 'שחקן'
              : primaryName,
          image: primaryImage,

          // FIX: primary יוצא
          incoming: false,

          alignEnd: alignEnd,
        ),

        if (secondaryName.isNotEmpty &&
            secondaryName != primaryName) ...[
          const SizedBox(height: 6),

          _SubPlayer(
            name: secondaryName,
            image: secondaryImage,

            // FIX: secondary נכנס
            incoming: true,

            alignEnd: alignEnd,
          ),
        ],
      ],
    );
  }
}

class _SubPlayer extends StatelessWidget {
  final String name;
  final String? image;

  final bool incoming;
  final bool alignEnd;

  const _SubPlayer({
    required this.name,
    required this.image,
    required this.incoming,
    required this.alignEnd,
  });

  @override
  Widget build(BuildContext context) {
    final arrow = Icon(
      incoming
          ? Icons.arrow_upward_rounded
          : Icons.arrow_downward_rounded,
      size: 17,
      color: incoming
          ? const Color(0xFF6BC85B)
          : const Color(0xFFFF5261),
    );

    final avatar = _PlayerAvatar(
      url: image,
      size: 29,
    );

    final text = Flexible(
      child: Text(
        name,
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        textAlign: alignEnd
            ? TextAlign.end
            : TextAlign.start,
        style: TextStyle(
          color: incoming
              ? const Color(0xFF79CC68)
              : Colors.white60,
          fontSize: incoming ? 12 : 11,
          fontWeight: incoming
              ? FontWeight.w900
              : FontWeight.w700,
        ),
      ),
    );

    return Row(
      mainAxisAlignment: alignEnd
          ? MainAxisAlignment.end
          : MainAxisAlignment.start,
      children: alignEnd
          ? [
              text,
              const SizedBox(width: 5),
              avatar,
              const SizedBox(width: 4),
              arrow,
            ]
          : [
              arrow,
              const SizedBox(width: 4),
              avatar,
              const SizedBox(width: 5),
              text,
            ],
    );
  }
}

class _EventIcon extends StatelessWidget {
  final bool goal;
  final bool yellow;
  final bool red;

  const _EventIcon({
    required this.goal,
    required this.yellow,
    required this.red,
  });

  @override
  Widget build(BuildContext context) {
    if (goal) {
      return const Text(
        '⚽',
        style: TextStyle(fontSize: 18),
      );
    }

    if (yellow) {
      return Container(
        width: 11,
        height: 16,
        decoration: BoxDecoration(
          color: const Color(0xFFFFC83D),
          borderRadius:
              BorderRadius.circular(2),
        ),
      );
    }

    if (red) {
      return Container(
        width: 11,
        height: 16,
        decoration: BoxDecoration(
          color: const Color(0xFFFF5261),
          borderRadius:
              BorderRadius.circular(2),
        ),
      );
    }

    return const Icon(
      Icons.sports_soccer,
      size: 17,
      color: Colors.white60,
    );
  }
}

// ============================================================
// SHARED
// ============================================================

class _TeamHeader extends StatelessWidget {
  final String name;
  final String? logo;
  final bool reverse;

  const _TeamHeader({
    required this.name,
    required this.logo,
    this.reverse = false,
  });

  @override
  Widget build(BuildContext context) {
    final image = _NetworkImage(
      url: logo,
      size: 27,
      fallback: Icons.shield_outlined,
      contain: true,
    );

    final text = Flexible(
      child: Text(
        name,
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        textAlign:
            reverse ? TextAlign.end : TextAlign.start,
        style: const TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w900,
        ),
      ),
    );

    return Row(
      mainAxisAlignment: reverse
          ? MainAxisAlignment.end
          : MainAxisAlignment.start,
      children: reverse
          ? [
              text,
              const SizedBox(width: 6),
              image,
            ]
          : [
              image,
              const SizedBox(width: 6),
              text,
            ],
    );
  }
}

class _MatchTeam extends StatelessWidget {
  final String name;
  final String? logo;

  const _MatchTeam({
    required this.name,
    required this.logo,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        _NetworkImage(
          url: logo,
          size: 58,
          fallback: Icons.shield_outlined,
          contain: true,
        ),
        const SizedBox(height: 10),
        SizedBox(
          height: 38,
          child: Center(
            child: Text(
              name,
              textAlign: TextAlign.center,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w800,
              ),
            ),
          ),
        ),
      ],
    );
  }
}

class _PlayerAvatar extends StatelessWidget {
  final String? url;
  final double size;

  const _PlayerAvatar({
    required this.url,
    required this.size,
  });

  @override
  Widget build(BuildContext context) {
    return _NetworkImage(
      url: url,
      size: size,
      fallback: Icons.person,
      round: true,
    );
  }
}

class _NetworkImage extends StatelessWidget {
  final String? url;
  final double size;
  final IconData fallback;

  final bool round;
  final bool contain;

  const _NetworkImage({
    required this.url,
    required this.size,
    required this.fallback,
    this.round = false,
    this.contain = false,
  });

  @override
  Widget build(BuildContext context) {
    final valid =
        url != null && url!.trim().isNotEmpty;

    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        shape: round
            ? BoxShape.circle
            : BoxShape.rectangle,
        color:
            Colors.white.withValues(alpha: .05),
        borderRadius: round
            ? null
            : BorderRadius.circular(6),
        border: Border.all(
          color:
              Colors.white.withValues(alpha: .08),
        ),
      ),
      clipBehavior: Clip.antiAlias,
      child: valid
          ? Image.network(
              url!,
              fit: contain
                  ? BoxFit.contain
                  : BoxFit.cover,
              filterQuality: FilterQuality.high,
              errorBuilder: (_, __, ___) {
                return Icon(
                  fallback,
                  size: size * .58,
                  color: Colors.white30,
                );
              },
            )
          : Icon(
              fallback,
              size: size * .58,
              color: Colors.white30,
            ),
    );
  }
}

// ============================================================
// PREDICTION
// ============================================================

class _PredictionCard extends StatelessWidget {
  final String homeName;
  final String awayName;

  final int homePrediction;
  final int awayPrediction;

  final VoidCallback onHomeMinus;
  final VoidCallback onHomePlus;
  final VoidCallback onAwayMinus;
  final VoidCallback onAwayPlus;
  final VoidCallback onSubmit;

  const _PredictionCard({
    required this.homeName,
    required this.awayName,
    required this.homePrediction,
    required this.awayPrediction,
    required this.onHomeMinus,
    required this.onHomePlus,
    required this.onAwayMinus,
    required this.onAwayPlus,
    required this.onSubmit,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            const Align(
              alignment: Alignment.centerRight,
              child: Text(
                'ניחוש תוצאה',
                style: TextStyle(
                  fontSize: 19,
                  fontWeight: FontWeight.w900,
                ),
              ),
            ),

            const SizedBox(height: 14),

            Row(
              children: [
                Expanded(
                  child: Text(
                    homeName,
                    textAlign: TextAlign.center,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                const SizedBox(width: 30),
                Expanded(
                  child: Text(
                    awayName,
                    textAlign: TextAlign.center,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),

            Row(
              mainAxisAlignment:
                  MainAxisAlignment.center,
              children: [
                IconButton(
                  onPressed: onHomeMinus,
                  icon: const Icon(Icons.remove),
                ),
                Text(
                  '$homePrediction',
                  style: const TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.w900,
                  ),
                ),
                IconButton(
                  onPressed: onHomePlus,
                  icon: const Icon(Icons.add),
                ),

                const Text(
                  ' : ',
                  style: TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.w900,
                  ),
                ),

                IconButton(
                  onPressed: onAwayMinus,
                  icon: const Icon(Icons.remove),
                ),
                Text(
                  '$awayPrediction',
                  style: const TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.w900,
                  ),
                ),
                IconButton(
                  onPressed: onAwayPlus,
                  icon: const Icon(Icons.add),
                ),
              ],
            ),

            SizedBox(
              width: double.infinity,
              child: FilledButton(
                onPressed: onSubmit,
                child: const Text('שלח ניחוש'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _StatusPill extends StatelessWidget {
  final String text;
  final bool live;

  const _StatusPill(
    this.text, {
    this.live = false,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(left: 5),
      padding: const EdgeInsets.symmetric(
        horizontal: 9,
        vertical: 4,
      ),
      decoration: BoxDecoration(
        borderRadius:
            BorderRadius.circular(999),
        color: live
            ? Colors.redAccent.withValues(
                alpha: .14,
              )
            : Colors.white.withValues(
                alpha: .07,
              ),
      ),
      child: Text(
        text,
        style: TextStyle(
          color: live
              ? Colors.redAccent
              : Colors.white60,
          fontSize: 10,
          fontWeight: FontWeight.w900,
        ),
      ),
    );
  }
}

// ============================================================
// HEBREW
// ============================================================

class FootballHebrew {
  static const _teams = <String, String>{
    "Hapoel Be'er Sheva":
        'הפועל באר שבע',
    "H. Beer Sheva":
        'הפועל באר שבע',
    'Maccabi Haifa':
        'מכבי חיפה',
    'Maccabi Tel Aviv':
        'מכבי תל אביב',
    'Beitar Jerusalem':
        'בית"ר ירושלים',
    'Hapoel Jerusalem':
        'הפועל ירושלים',
    'Hapoel Tel Aviv':
        'הפועל תל אביב',
    'Hapoel Haifa':
        'הפועל חיפה',
    'Maccabi Netanya':
        'מכבי נתניה',
    'Netanya':
        'מכבי נתניה',
    'Bnei Sakhnin':
        'בני סכנין',
    'Sakhnin':
        'בני סכנין',
    'Maccabi Petah Tikva':
        'מכבי פתח תקווה',
    'Hapoel Petah Tikva':
        'הפועל פתח תקווה',
    'Ironi Tiberias':
        'עירוני טבריה',
    'Ironi Kiryat Shmona':
        'עירוני קריית שמונה',
    'Kiryat Shmona':
        'עירוני קריית שמונה',
  };

  static String team(String? value) {
    final clean = value?.trim() ?? '';

    if (clean.isEmpty) {
      return 'קבוצה';
    }

    return _teams[clean] ?? clean;
  }

  static String competition(
    String? value,
  ) {
    final clean = value?.trim() ?? '';

    if (clean.isEmpty) {
      return 'כדורגל';
    }

    final lower = clean.toLowerCase();

    if (lower.contains("ligat ha'al")) {
      return 'ליגת העל';
    }

    if (lower.contains('europa league')) {
      return 'הליגה האירופית';
    }

    if (lower.contains('champions league')) {
      return 'ליגת האלופות';
    }

    if (lower.contains('conference league')) {
      return 'הקונפרנס ליג';
    }

    if (lower.contains('state cup')) {
      return 'גביע המדינה';
    }

    if (lower.contains('toto cup')) {
      return 'גביע הטוטו';
    }

    if (lower.contains('club friendlies')) {
      return 'משחק ידידות';
    }

    return clean;
  }

  static String round(String value) {
    return value
        .replaceAll(
          'League Phase',
          'שלב הליגה',
        )
        .replaceAll(
          'Championship Group',
          'פלייאוף עליון',
        )
        .replaceAll(
          'Group Stage',
          'שלב הבתים',
        )
        .replaceAll(
          'Club Friendly',
          'ידידות',
        );
  }
}

// ============================================================
// STATES
// ============================================================

class _SmallError extends StatelessWidget {
  final String text;

  const _SmallError(this.text);

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(22),
      decoration: BoxDecoration(
        color: const Color(0xFF11151A),
        borderRadius:
            BorderRadius.circular(22),
      ),
      child: Text(
        text,
        textAlign: TextAlign.center,
        style: const TextStyle(
          color: Colors.white54,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}

class _ErrorState extends StatelessWidget {
  final Future<void> Function() onRetry;

  const _ErrorState({
    required this.onRetry,
  });

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Text(
            'לא הצלחנו לטעון את המשחקים',
            style: TextStyle(
              fontSize: 19,
              fontWeight: FontWeight.w900,
            ),
          ),
          const SizedBox(height: 12),
          FilledButton(
            onPressed: () {
              onRetry();
            },
            child: const Text('נסה שוב'),
          ),
        ],
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  const _EmptyState();

  @override
  Widget build(BuildContext context) {
    return const Card(
      child: Padding(
        padding: EdgeInsets.all(24),
        child: Center(
          child: Text(
            'אין משחקים להצגה כרגע',
            style: TextStyle(
              fontWeight: FontWeight.w800,
            ),
          ),
        ),
      ),
    );
  }
}
