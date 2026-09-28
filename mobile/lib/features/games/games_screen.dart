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
    setState(() {
      matchesFuture = repository.matches(widget.club.id);
    });

    await matchesFuture;
  }

  DateTime? parseDate(dynamic value) {
    if (value == null) return null;

    return DateTime.tryParse(
      value.toString(),
    )?.toLocal();
  }

  String formatDate(dynamic value) {
    final date = parseDate(value);

    if (date == null) {
      return 'טרם נקבע';
    }

    final day = date.day.toString().padLeft(2, '0');
    final month = date.month.toString().padLeft(2, '0');
    final hour = date.hour.toString().padLeft(2, '0');
    final minute = date.minute.toString().padLeft(2, '0');

    return '$day/$month/${date.year} • $hour:$minute';
  }

  String matchStatus(Map<String, dynamic> match) {
    final status =
        match['status']?.toString().toLowerCase() ?? '';

    switch (status) {
      case 'live':
        return 'LIVE';
      case 'finished':
        return 'הסתיים';
      case 'postponed':
        return 'נדחה';
      case 'cancelled':
        return 'בוטל';
      default:
        return formatDate(match['kickoff']);
    }
  }

  bool isFinished(Map<String, dynamic> match) {
    return match['status']?.toString().toLowerCase() ==
        'finished';
  }

  bool isLive(Map<String, dynamic> match) {
    return match['status']?.toString().toLowerCase() == 'live';
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
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(
                      Icons.error_outline,
                      size: 44,
                    ),
                    const SizedBox(height: 12),
                    const Text(
                      'לא הצלחנו לטעון את המשחקים',
                      style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                    const SizedBox(height: 12),
                    FilledButton(
                      onPressed: refresh,
                      child: const Text('נסה שוב'),
                    ),
                  ],
                ),
              ),
            );
          }

          final matches = snapshot.data ?? [];

          final sortedMatches =
              List<Map<String, dynamic>>.from(matches);

          sortedMatches.sort((a, b) {
            final aDate = parseDate(a['kickoff']);
            final bDate = parseDate(b['kickoff']);

            if (aDate == null && bDate == null) return 0;
            if (aDate == null) return 1;
            if (bDate == null) return -1;

            return bDate.compareTo(aDate);
          });

          return RefreshIndicator(
            onRefresh: refresh,
            child: ListView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.fromLTRB(
                18,
                18,
                18,
                110,
              ),
              children: [
                const Text(
                  'משחקים',
                  style: TextStyle(
                    fontSize: 32,
                    fontWeight: FontWeight.w900,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'כל המשחקים של ${widget.club.name}',
                  style: const TextStyle(
                    color: Colors.white60,
                  ),
                ),
                const SizedBox(height: 20),

                if (sortedMatches.isEmpty)
                  const Card(
                    child: Padding(
                      padding: EdgeInsets.all(20),
                      child: Text(
                        'עדיין אין משחקים להצגה.',
                      ),
                    ),
                  ),

                ...sortedMatches.map(
                  (match) => Padding(
                    padding: const EdgeInsets.only(
                      bottom: 10,
                    ),
                    child: _MatchCard(
                      match: match,
                      club: widget.club,
                      statusText: matchStatus(match),
                      finished: isFinished(match),
                      live: isLive(match),
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

class _MatchCard extends StatelessWidget {
  final Map<String, dynamic> match;
  final Club club;
  final String statusText;
  final bool finished;
  final bool live;
  final VoidCallback onTap;

  const _MatchCard({
    required this.match,
    required this.club,
    required this.statusText,
    required this.finished,
    required this.live,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final homeName =
        match['home_name']?.toString() ?? 'קבוצת בית';

    final awayName =
        match['away_name']?.toString() ?? 'קבוצת חוץ';

    final homeLogo =
        match['home_logo_url']?.toString();

    final awayLogo =
        match['away_logo_url']?.toString();

    final homeScore = match['home_score'];
    final awayScore = match['away_score'];

    final competition =
        match['competition']?.toString() ?? 'כדורגל';

    final round = match['round_name']?.toString();

    return Card(
      margin: EdgeInsets.zero,
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      competition,
                      style: TextStyle(
                        color: club.accent,
                        fontSize: 13,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                  ),
                  if (round != null && round.isNotEmpty)
                    Text(
                      round,
                      style: const TextStyle(
                        color: Colors.white54,
                        fontSize: 12,
                      ),
                    ),
                ],
              ),

              const SizedBox(height: 16),

              Row(
                children: [
                  Expanded(
                    child: _Team(
                      name: homeName,
                      logo: homeLogo,
                    ),
                  ),

                  Padding(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 12,
                    ),
                    child: Column(
                      children: [
                        if (finished || live)
                          Text(
                            '${homeScore ?? '–'} : ${awayScore ?? '–'}',
                            style: const TextStyle(
                              fontSize: 25,
                              fontWeight: FontWeight.w900,
                            ),
                          )
                        else
                          const Text(
                            'VS',
                            style: TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.w900,
                              color: Colors.white54,
                            ),
                          ),
                        const SizedBox(height: 5),
                        Text(
                          statusText,
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w800,
                            color: live
                                ? Colors.redAccent
                                : Colors.white54,
                          ),
                        ),
                      ],
                    ),
                  ),

                  Expanded(
                    child: _Team(
                      name: awayName,
                      logo: awayLogo,
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 14),

              Row(
                children: [
                  Icon(
                    Icons.stadium_outlined,
                    size: 15,
                    color: Colors.white.withValues(
                      alpha: .45,
                    ),
                  ),
                  const SizedBox(width: 5),
                  Expanded(
                    child: Text(
                      match['stadium']?.toString().isNotEmpty ==
                              true
                          ? match['stadium'].toString()
                          : 'אצטדיון טרם נקבע',
                      style: const TextStyle(
                        color: Colors.white54,
                        fontSize: 12,
                      ),
                    ),
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

class _Team extends StatelessWidget {
  final String name;
  final String? logo;

  const _Team({
    required this.name,
    required this.logo,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        _TeamLogo(
          url: logo,
          size: 52,
        ),
        const SizedBox(height: 8),
        Text(
          name,
          textAlign: TextAlign.center,
          maxLines: 2,
          overflow: TextOverflow.ellipsis,
          style: const TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w800,
          ),
        ),
      ],
    );
  }
}

class _TeamLogo extends StatelessWidget {
  final String? url;
  final double size;

  const _TeamLogo({
    required this.url,
    required this.size,
  });

  @override
  Widget build(BuildContext context) {
    if (url == null || url!.isEmpty) {
      return SizedBox(
        width: size,
        height: size,
        child: const Icon(
          Icons.shield_outlined,
          size: 38,
        ),
      );
    }

    return SizedBox(
      width: size,
      height: size,
      child: Image.network(
        url!,
        fit: BoxFit.contain,
        errorBuilder: (_, __, ___) {
          return const Icon(
            Icons.shield_outlined,
            size: 38,
          );
        },
      ),
    );
  }
}

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

  final messageController =
      TextEditingController();

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

  String get formattedKickoff {
    final date = kickoff;

    if (date == null) {
      return 'מועד טרם נקבע';
    }

    final day =
        date.day.toString().padLeft(2, '0');

    final month =
        date.month.toString().padLeft(2, '0');

    final hour =
        date.hour.toString().padLeft(2, '0');

    final minute =
        date.minute.toString().padLeft(2, '0');

    return '$day/$month/${date.year} • $hour:$minute';
  }

  bool get finished {
    return widget.match['status']
            ?.toString()
            .toLowerCase() ==
        'finished';
  }

  bool get live {
    return widget.match['status']
            ?.toString()
            .toLowerCase() ==
        'live';
  }

  bool get canPredict {
    return !finished && !live;
  }

  @override
  Widget build(BuildContext context) {
    final match = widget.match;

    final homeName =
        match['home_name']?.toString() ??
            'קבוצת בית';

    final awayName =
        match['away_name']?.toString() ??
            'קבוצת חוץ';

    final homeLogo =
        match['home_logo_url']?.toString();

    final awayLogo =
        match['away_logo_url']?.toString();

    final competitionLogo =
        match['competition_logo_url']
            ?.toString();

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
          18,
          18,
          18,
          60,
        ),
        children: [
          Container(
            padding: const EdgeInsets.all(22),
            decoration: BoxDecoration(
              borderRadius:
                  BorderRadius.circular(26),
              color: widget.club.accent
                  .withValues(alpha: .12),
              border: Border.all(
                color: widget.club.accent
                    .withValues(alpha: .25),
              ),
            ),
            child: Column(
              children: [
                if (competitionLogo != null &&
                    competitionLogo.isNotEmpty)
                  Padding(
                    padding:
                        const EdgeInsets.only(
                      bottom: 8,
                    ),
                    child: Image.network(
                      competitionLogo,
                      width: 38,
                      height: 38,
                      fit: BoxFit.contain,
                      errorBuilder:
                          (_, __, ___) =>
                              const SizedBox(),
                    ),
                  ),

                Text(
                  match['competition']
                          ?.toString() ??
                      '',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    color: widget.club.accent,
                    fontWeight: FontWeight.w900,
                  ),
                ),

                if (match['round_name'] != null)
                  Padding(
                    padding:
                        const EdgeInsets.only(
                      top: 4,
                    ),
                    child: Text(
                      match['round_name']
                          .toString(),
                      style: const TextStyle(
                        color: Colors.white54,
                        fontSize: 12,
                      ),
                    ),
                  ),

                const SizedBox(height: 24),

                Row(
                  children: [
                    Expanded(
                      child: _Team(
                        name: homeName,
                        logo: homeLogo,
                      ),
                    ),

                    Padding(
                      padding:
                          const EdgeInsets.symmetric(
                        horizontal: 10,
                      ),
                      child: Column(
                        children: [
                          if (finished || live)
                            Text(
                              '${match['home_score'] ?? '–'}'
                              ' : '
                              '${match['away_score'] ?? '–'}',
                              style:
                                  const TextStyle(
                                fontSize: 30,
                                fontWeight:
                                    FontWeight.w900,
                              ),
                            )
                          else
                            const Text(
                              'VS',
                              style: TextStyle(
                                fontSize: 22,
                                fontWeight:
                                    FontWeight.w900,
                              ),
                            ),

                          if (live)
                            const Padding(
                              padding:
                                  EdgeInsets.only(
                                top: 4,
                              ),
                              child: Text(
                                '● LIVE',
                                style: TextStyle(
                                  color:
                                      Colors.redAccent,
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
                      child: _Team(
                        name: awayName,
                        logo: awayLogo,
                      ),
                    ),
                  ],
                ),

                const SizedBox(height: 20),

                Text(
                  formattedKickoff,
                  style: const TextStyle(
                    fontWeight: FontWeight.w700,
                  ),
                ),

                const SizedBox(height: 6),

                if (match['stadium']
                        ?.toString()
                        .isNotEmpty ==
                    true)
                  Text(
                    match['stadium'].toString(),
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                      color: Colors.white60,
                    ),
                  ),
              ],
            ),
          ),

          const SizedBox(height: 12),

          if (canPredict)
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment:
                      CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'ניחוש תוצאה',
                      style: TextStyle(
                        fontSize: 19,
                        fontWeight:
                            FontWeight.w900,
                      ),
                    ),

                    const SizedBox(height: 12),

                    Row(
                      mainAxisAlignment:
                          MainAxisAlignment.center,
                      children: [
                        IconButton(
                          onPressed: () {
                            if (homePrediction >
                                0) {
                              setState(() {
                                homePrediction--;
                              });
                            }
                          },
                          icon: const Icon(
                            Icons.remove,
                          ),
                        ),

                        Text(
                          '$homePrediction',
                          style: const TextStyle(
                            fontSize: 24,
                            fontWeight:
                                FontWeight.w900,
                          ),
                        ),

                        IconButton(
                          onPressed: () {
                            setState(() {
                              homePrediction++;
                            });
                          },
                          icon:
                              const Icon(Icons.add),
                        ),

                        const Padding(
                          padding:
                              EdgeInsets.symmetric(
                            horizontal: 8,
                          ),
                          child: Text(
                            ':',
                            style: TextStyle(
                              fontSize: 24,
                              fontWeight:
                                  FontWeight.w900,
                            ),
                          ),
                        ),

                        IconButton(
                          onPressed: () {
                            if (awayPrediction >
                                0) {
                              setState(() {
                                awayPrediction--;
                              });
                            }
                          },
                          icon: const Icon(
                            Icons.remove,
                          ),
                        ),

                        Text(
                          '$awayPrediction',
                          style: const TextStyle(
                            fontSize: 24,
                            fontWeight:
                                FontWeight.w900,
                          ),
                        ),

                        IconButton(
                          onPressed: () {
                            setState(() {
                              awayPrediction++;
                            });
                          },
                          icon:
                              const Icon(Icons.add),
                        ),
                      ],
                    ),

                    const SizedBox(height: 8),

                    SizedBox(
                      width: double.infinity,
                      child: FilledButton(
                        onPressed: () async {
                          await repository.prediction(
                            match['id'],
                            homePrediction,
                            awayPrediction,
                          );

                          if (!context.mounted) {
                            return;
                          }

                          ScaffoldMessenger.of(
                            context,
                          ).showSnackBar(
                            const SnackBar(
                              content: Text(
                                'הניחוש נשמר 🔥',
                              ),
                            ),
                          );
                        },
                        child:
                            const Text('שלח ניחוש'),
                      ),
                    ),
                  ],
                ),
              ),
            ),

          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: SizedBox(
                width: double.infinity,
                child: OutlinedButton.icon(
                  onPressed: () async {
                    await repository.attendance(
                      match['id'],
                    );

                    if (!context.mounted) {
                      return;
                    }

                    ScaffoldMessenger.of(
                      context,
                    ).showSnackBar(
                      const SnackBar(
                        content: Text(
                          'המשחק נוסף לרשימת "הייתי במשחק"',
                        ),
                      ),
                    );
                  },
                  icon:
                      const Icon(Icons.stadium),
                  label:
                      const Text('הייתי במשחק'),
                ),
              ),
            ),
          ),

          FutureBuilder<
              List<Map<String, dynamic>>>(
            future:
                repository.events(match['id']),
            builder: (context, snapshot) {
              final events =
                  snapshot.data ?? [];

              return Card(
                child: Padding(
                  padding:
                      const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment:
                        CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'אירועי משחק',
                        style: TextStyle(
                          fontSize: 19,
                          fontWeight:
                              FontWeight.w900,
                        ),
                      ),

                      const SizedBox(height: 8),

                      if (events.isEmpty)
                        const Padding(
                          padding:
                              EdgeInsets.symmetric(
                            vertical: 12,
                          ),
                          child: Text(
                            'אין עדיין אירועים למשחק.',
                            style: TextStyle(
                              color:
                                  Colors.white54,
                            ),
                          ),
                        ),

                      ...events.map(
                        (event) => ListTile(
                          contentPadding:
                              EdgeInsets.zero,
                          title: Text(
                            "${event['minute'] ?? ''}' • "
                            "${event['event_type'] ?? ''}",
                          ),
                          subtitle: Text(
                            '${event['player_name'] ?? ''} '
                            '${event['detail'] ?? ''}',
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              );
            },
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
                icon: const Icon(
                  Icons.send,
                ),
                onPressed: () async {
                  final message =
                      messageController.text
                          .trim();

                  if (message.isEmpty) {
                    return;
                  }

                  await repository.message(
                    match: match['id'],
                    body: message,
                  );

                  messageController.clear();

                  setState(() {});
                },
              ),
            ),
          ),

          const SizedBox(height: 10),

          FutureBuilder<
              List<Map<String, dynamic>>>(
            future: repository.chat(
              match: match['id'],
            ),
            builder: (context, snapshot) {
              final messages =
                  snapshot.data ?? [];

              if (messages.isEmpty) {
                return const Padding(
                  padding:
                      EdgeInsets.all(16),
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
                            as Map<String,
                                dynamic>?;

                    final author =
                        profile?[
                                'display_name'] ??
                            profile?[
                                'username'] ??
                            'אוהד';

                    return ListTile(
                      contentPadding:
                          EdgeInsets.zero,
                      title: Text(
                        author.toString(),
                        style:
                            const TextStyle(
                          fontWeight:
                              FontWeight.w800,
                        ),
                      ),
                      subtitle: Text(
                        message['body']
                                ?.toString() ??
                            '',
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
