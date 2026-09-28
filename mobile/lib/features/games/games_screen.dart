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

  DateTime? parseKickoff(Map<String, dynamic> match) {
    final value = match['kickoff'];

    if (value == null) return null;

    return DateTime.tryParse(
      value.toString(),
    )?.toLocal();
  }

  bool isLive(Map<String, dynamic> match) {
    return match['status']
            ?.toString()
            .toLowerCase() ==
        'live';
  }

  bool isFinished(Map<String, dynamic> match) {
    return match['status']
            ?.toString()
            .toLowerCase() ==
        'finished';
  }

  bool isCancelled(Map<String, dynamic> match) {
    return match['status']
            ?.toString()
            .toLowerCase() ==
        'cancelled';
  }

  bool isPostponed(Map<String, dynamic> match) {
    return match['status']
            ?.toString()
            .toLowerCase() ==
        'postponed';
  }

  List<Map<String, dynamic>> sortMatches(
    List<Map<String, dynamic>> matches,
  ) {
    final now = DateTime.now();

    final live = <Map<String, dynamic>>[];
    final future = <Map<String, dynamic>>[];
    final past = <Map<String, dynamic>>[];

    for (final match in matches) {
      final kickoff = parseKickoff(match);

      if (isLive(match)) {
        live.add(match);
        continue;
      }

      if (kickoff != null &&
          kickoff.isAfter(now) &&
          !isFinished(match)) {
        future.add(match);
      } else {
        past.add(match);
      }
    }

    // הקרוב ביותר קודם.
    future.sort((a, b) {
      final aDate = parseKickoff(a);
      final bDate = parseKickoff(b);

      if (aDate == null && bDate == null) return 0;
      if (aDate == null) return 1;
      if (bDate == null) return -1;

      return aDate.compareTo(bDate);
    });

    // המשחק האחרון קודם.
    past.sort((a, b) {
      final aDate = parseKickoff(a);
      final bDate = parseKickoff(b);

      if (aDate == null && bDate == null) return 0;
      if (aDate == null) return 1;
      if (bDate == null) return -1;

      return bDate.compareTo(aDate);
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
              physics:
                  const AlwaysScrollableScrollPhysics(),
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
                              fontWeight:
                                  FontWeight.w900,
                            ),
                          ),
                          const SizedBox(height: 3),
                          Text(
                            widget.club.name,
                            style: const TextStyle(
                              color: Colors.white54,
                              fontSize: 15,
                              fontWeight:
                                  FontWeight.w600,
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
                        color: widget.club.accent
                            .withValues(alpha: .14),
                      ),
                      child: Icon(
                        Icons.sports_soccer,
                        color: widget.club.accent,
                      ),
                    ),
                  ],
                ),

                const SizedBox(height: 24),

                if (matches.isEmpty)
                  const _EmptyState(),

                ...matches.map(
                  (match) => Padding(
                    padding:
                        const EdgeInsets.only(
                      bottom: 14,
                    ),
                    child: MatchCard(
                      match: match,
                      club: widget.club,
                      onTap: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (_) =>
                                MatchCenter(
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
    final value = match['kickoff'];

    if (value == null) return null;

    return DateTime.tryParse(
      value.toString(),
    )?.toLocal();
  }

  String get status {
    return match['status']
            ?.toString()
            .toLowerCase() ??
        '';
  }

  bool get live => status == 'live';

  bool get finished => status == 'finished';

  String get homeName {
    return FootballHebrew.team(
      match['home_name']?.toString(),
    );
  }

  String get awayName {
    return FootballHebrew.team(
      match['away_name']?.toString(),
    );
  }

  String get competition {
    return FootballHebrew.competition(
      match['competition']?.toString(),
    );
  }

  String get dateText {
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

    return '$day.$month • $hour:$minute';
  }

  String get stateText {
    switch (status) {
      case 'live':
        return 'LIVE';
      case 'finished':
        return 'הסתיים';
      case 'cancelled':
        return 'בוטל';
      case 'postponed':
        return 'נדחה';
      default:
        return dateText;
    }
  }

  String? get roundText {
    final raw =
        match['round_name']?.toString();

    if (raw == null || raw.isEmpty) {
      return null;
    }

    return FootballHebrew.round(raw);
  }

  @override
  Widget build(BuildContext context) {
    final homeLogo =
        match['home_logo_url']?.toString();

    final awayLogo =
        match['away_logo_url']?.toString();

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
            borderRadius:
                BorderRadius.circular(24),
            border: Border.all(
              color: live
                  ? Colors.redAccent
                      .withValues(alpha: .5)
                  : Colors.white
                      .withValues(alpha: .055),
            ),
          ),
          child: Column(
            children: [
              // Competition
              Row(
                children: [
                  if (match[
                              'competition_logo_url']
                          ?.toString()
                          .isNotEmpty ==
                      true) ...[
                    _NetworkLogo(
                      url: match[
                              'competition_logo_url']
                          .toString(),
                      size: 24,
                      fallbackIcon:
                          Icons.emoji_events_outlined,
                    ),
                    const SizedBox(width: 8),
                  ],

                  Expanded(
                    child: Text(
                      competition,
                      maxLines: 1,
                      overflow:
                          TextOverflow.ellipsis,
                      style: TextStyle(
                        color: club.accent,
                        fontSize: 13,
                        fontWeight:
                            FontWeight.w900,
                      ),
                    ),
                  ),

                  if (roundText != null)
                    Text(
                      roundText!,
                      style: const TextStyle(
                        color: Colors.white38,
                        fontSize: 11,
                        fontWeight:
                            FontWeight.w700,
                      ),
                    ),
                ],
              ),

              const SizedBox(height: 20),

              // Teams
              Row(
                crossAxisAlignment:
                    CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: _MatchTeam(
                      name: homeName,
                      logo: homeLogo,
                    ),
                  ),

                  SizedBox(
                    width: 92,
                    child: Padding(
                      padding:
                          const EdgeInsets.only(
                        top: 12,
                      ),
                      child: Column(
                        children: [
                          if (finished || live)
                            Text(
                              '${match['home_score'] ?? '–'}'
                              '  -  '
                              '${match['away_score'] ?? '–'}',
                              textDirection:
                                  TextDirection.ltr,
                              style:
                                  const TextStyle(
                                fontSize: 25,
                                fontWeight:
                                    FontWeight.w900,
                                letterSpacing: 1,
                              ),
                            )
                          else
                            Text(
                              _timeOnly(kickoff),
                              textDirection:
                                  TextDirection.ltr,
                              style:
                                  const TextStyle(
                                fontSize: 21,
                                fontWeight:
                                    FontWeight.w900,
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
                              fontWeight:
                                  FontWeight.w900,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),

                  Expanded(
                    child: _MatchTeam(
                      name: awayName,
                      logo: awayLogo,
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 18),

              Container(
                height: 1,
                color: Colors.white
                    .withValues(alpha: .055),
              ),

              const SizedBox(height: 12),

              Row(
                children: [
                  Icon(
                    Icons.calendar_today_outlined,
                    size: 14,
                    color: Colors.white
                        .withValues(alpha: .42),
                  ),
                  const SizedBox(width: 6),

                  Text(
                    finished || live
                        ? dateText
                        : _dateOnly(kickoff),
                    textDirection:
                        TextDirection.ltr,
                    style: const TextStyle(
                      color: Colors.white54,
                      fontSize: 12,
                      fontWeight:
                          FontWeight.w700,
                    ),
                  ),

                  const Spacer(),

                  if (status == 'cancelled')
                    const _StatusPill(
                      text: 'בוטל',
                    )
                  else if (status ==
                      'postponed')
                    const _StatusPill(
                      text: 'נדחה',
                    )
                  else if (live)
                    const _StatusPill(
                      text: 'LIVE',
                      live: true,
                    ),

                  const SizedBox(width: 4),

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

  static String _timeOnly(
    DateTime? date,
  ) {
    if (date == null) return 'TBD';

    final hour =
        date.hour.toString().padLeft(2, '0');

    final minute =
        date.minute.toString().padLeft(2, '0');

    return '$hour:$minute';
  }

  static String _dateOnly(
    DateTime? date,
  ) {
    if (date == null) {
      return 'מועד טרם נקבע';
    }

    final day =
        date.day.toString().padLeft(2, '0');

    final month =
        date.month.toString().padLeft(2, '0');

    return '$day.$month.${date.year}';
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
        _NetworkLogo(
          url: logo,
          size: 58,
          fallbackIcon:
              Icons.shield_outlined,
        ),

        const SizedBox(height: 10),

        SizedBox(
          height: 38,
          child: Center(
            child: Text(
              name,
              textAlign: TextAlign.center,
              maxLines: 2,
              overflow:
                  TextOverflow.ellipsis,
              style: const TextStyle(
                fontSize: 13,
                height: 1.2,
                fontWeight:
                    FontWeight.w800,
              ),
            ),
          ),
        ),
      ],
    );
  }
}

class _NetworkLogo extends StatelessWidget {
  final String? url;
  final double size;
  final IconData fallbackIcon;

  const _NetworkLogo({
    required this.url,
    required this.size,
    required this.fallbackIcon,
  });

  @override
  Widget build(BuildContext context) {
    final valid =
        url != null && url!.trim().isNotEmpty;

    if (!valid) {
      return SizedBox(
        width: size,
        height: size,
        child: Icon(
          fallbackIcon,
          size: size * .7,
          color: Colors.white30,
        ),
      );
    }

    return SizedBox(
      width: size,
      height: size,
      child: Image.network(
        url!,
        fit: BoxFit.contain,
        filterQuality:
            FilterQuality.high,
        errorBuilder:
            (context, error, stackTrace) {
          return Icon(
            fallbackIcon,
            size: size * .7,
            color: Colors.white30,
          );
        },
      ),
    );
  }
}

class _StatusPill extends StatelessWidget {
  final String text;
  final bool live;

  const _StatusPill({
    required this.text,
    this.live = false,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding:
          const EdgeInsets.symmetric(
        horizontal: 9,
        vertical: 4,
      ),
      decoration: BoxDecoration(
        borderRadius:
            BorderRadius.circular(999),
        color: live
            ? Colors.redAccent
                .withValues(alpha: .14)
            : Colors.white
                .withValues(alpha: .07),
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

class _MatchCenterState
    extends State<MatchCenter> {
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
    final value = widget.match['kickoff'];

    if (value == null) return null;

    return DateTime.tryParse(
      value.toString(),
    )?.toLocal();
  }

  String get status {
    return widget.match['status']
            ?.toString()
            .toLowerCase() ??
        '';
  }

  bool get finished =>
      status == 'finished';

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

    final day =
        date.day.toString().padLeft(2, '0');

    final month =
        date.month.toString().padLeft(2, '0');

    final hour =
        date.hour.toString().padLeft(2, '0');

    final minute =
        date.minute.toString().padLeft(2, '0');

    return '$day.$month.${date.year} • $hour:$minute';
  }

  @override
  Widget build(BuildContext context) {
    final match = widget.match;

    final homeName =
        FootballHebrew.team(
      match['home_name']?.toString(),
    );

    final awayName =
        FootballHebrew.team(
      match['away_name']?.toString(),
    );

    return Scaffold(
      appBar: AppBar(
        title: const Text(
          'MATCH CENTER',
          style: TextStyle(
            fontWeight:
                FontWeight.w900,
          ),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(
          16,
          10,
          16,
          60,
        ),
        children: [
          Container(
            padding:
                const EdgeInsets.fromLTRB(
              18,
              18,
              18,
              22,
            ),
            decoration: BoxDecoration(
              color: const Color(0xFF111216),
              borderRadius:
                  BorderRadius.circular(28),
              border: Border.all(
                color: widget.club.accent
                    .withValues(alpha: .2),
              ),
            ),
            child: Column(
              children: [
                Text(
                  FootballHebrew.competition(
                    match['competition']
                        ?.toString(),
                  ),
                  textAlign:
                      TextAlign.center,
                  style: TextStyle(
                    color:
                        widget.club.accent,
                    fontSize: 14,
                    fontWeight:
                        FontWeight.w900,
                  ),
                ),

                if (match['round_name'] !=
                    null) ...[
                  const SizedBox(height: 4),
                  Text(
                    FootballHebrew.round(
                      match['round_name']
                          .toString(),
                    ),
                    style:
                        const TextStyle(
                      color:
                          Colors.white38,
                      fontSize: 11,
                    ),
                  ),
                ],

                const SizedBox(height: 26),

                Row(
                  children: [
                    Expanded(
                      child: _MatchTeam(
                        name: homeName,
                        logo: match[
                                'home_logo_url']
                            ?.toString(),
                      ),
                    ),

                    SizedBox(
                      width: 100,
                      child: Column(
                        children: [
                          if (finished ||
                              live)
                            Text(
                              '${match['home_score'] ?? '–'}'
                              '  -  '
                              '${match['away_score'] ?? '–'}',
                              textDirection:
                                  TextDirection
                                      .ltr,
                              style:
                                  const TextStyle(
                                fontSize: 29,
                                fontWeight:
                                    FontWeight
                                        .w900,
                              ),
                            )
                          else
                            Text(
                              MatchCard
                                  ._timeOnly(
                                kickoff,
                              ),
                              textDirection:
                                  TextDirection
                                      .ltr,
                              style:
                                  const TextStyle(
                                fontSize: 27,
                                fontWeight:
                                    FontWeight
                                        .w900,
                              ),
                            ),

                          const SizedBox(
                            height: 5,
                          ),

                          Text(
                            live
                                ? '● LIVE'
                                : finished
                                    ? 'הסתיים'
                                    : 'VS',
                            style: TextStyle(
                              color: live
                                  ? Colors
                                      .redAccent
                                  : Colors
                                      .white38,
                              fontSize: 11,
                              fontWeight:
                                  FontWeight
                                      .w900,
                            ),
                          ),
                        ],
                      ),
                    ),

                    Expanded(
                      child: _MatchTeam(
                        name: awayName,
                        logo: match[
                                'away_logo_url']
                            ?.toString(),
                      ),
                    ),
                  ],
                ),

                const SizedBox(height: 22),

                Text(
                  dateText,
                  textDirection:
                      TextDirection.ltr,
                  style: const TextStyle(
                    color: Colors.white70,
                    fontWeight:
                        FontWeight.w700,
                  ),
                ),

                if (match['stadium']
                        ?.toString()
                        .isNotEmpty ==
                    true) ...[
                  const SizedBox(height: 7),
                  Row(
                    mainAxisAlignment:
                        MainAxisAlignment
                            .center,
                    children: [
                      const Icon(
                        Icons
                            .stadium_outlined,
                        size: 15,
                        color:
                            Colors.white38,
                      ),
                      const SizedBox(
                          width: 5),
                      Flexible(
                        child: Text(
                          match['stadium']
                              .toString(),
                          textAlign:
                              TextAlign.center,
                          style:
                              const TextStyle(
                            color:
                                Colors.white54,
                            fontSize: 12,
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ],
            ),
          ),

          const SizedBox(height: 14),

          if (canPredict)
            _PredictionCard(
              homeName: homeName,
              awayName: awayName,
              homePrediction:
                  homePrediction,
              awayPrediction:
                  awayPrediction,
              onHomeMinus: () {
                if (homePrediction == 0) {
                  return;
                }

                setState(() {
                  homePrediction--;
                });
              },
              onHomePlus: () {
                setState(() {
                  homePrediction++;
                });
              },
              onAwayMinus: () {
                if (awayPrediction == 0) {
                  return;
                }

                setState(() {
                  awayPrediction--;
                });
              },
              onAwayPlus: () {
                setState(() {
                  awayPrediction++;
                });
              },
              onSubmit: () async {
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
            ),

          Card(
            child: Padding(
              padding:
                  const EdgeInsets.all(14),
              child: SizedBox(
                width: double.infinity,
                child:
                    OutlinedButton.icon(
                  onPressed: () async {
                    await repository
                        .attendance(
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
                  icon: const Icon(
                    Icons.stadium,
                  ),
                  label: const Text(
                    'הייתי במשחק',
                  ),
                ),
              ),
            ),
          ),

          FutureBuilder<
              List<Map<String, dynamic>>>(
            future:
                repository.events(
              match['id'],
            ),
            builder:
                (context, snapshot) {
              final events =
                  snapshot.data ?? [];

              return Card(
                child: Padding(
                  padding:
                      const EdgeInsets
                          .all(16),
                  child: Column(
                    crossAxisAlignment:
                        CrossAxisAlignment
                            .start,
                    children: [
                      const Text(
                        'אירועי משחק',
                        style: TextStyle(
                          fontSize: 19,
                          fontWeight:
                              FontWeight
                                  .w900,
                        ),
                      ),

                      const SizedBox(
                          height: 8),

                      if (events.isEmpty)
                        const Padding(
                          padding:
                              EdgeInsets
                                  .symmetric(
                            vertical: 12,
                          ),
                          child: Text(
                            'אין עדיין אירועים למשחק.',
                            style:
                                TextStyle(
                              color: Colors
                                  .white54,
                            ),
                          ),
                        ),

                      ...events.map(
                        (event) =>
                            ListTile(
                          contentPadding:
                              EdgeInsets
                                  .zero,
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
              fontWeight:
                  FontWeight.w900,
            ),
          ),

          const SizedBox(height: 8),

          TextField(
            controller:
                messageController,
            decoration: InputDecoration(
              hintText:
                  'כתוב הודעה...',
              suffixIcon: IconButton(
                icon: const Icon(
                  Icons.send,
                ),
                onPressed: () async {
                  final message =
                      messageController
                          .text
                          .trim();

                  if (message.isEmpty) {
                    return;
                  }

                  await repository.message(
                    match: match['id'],
                    body: message,
                  );

                  messageController
                      .clear();

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
            builder:
                (context, snapshot) {
              final messages =
                  snapshot.data ?? [];

              if (messages.isEmpty) {
                return const Padding(
                  padding:
                      EdgeInsets.all(16),
                  child: Text(
                    'עדיין אין הודעות. תהיה הראשון ביציע 🔥',
                    style: TextStyle(
                      color:
                          Colors.white54,
                    ),
                  ),
                );
              }

              return Column(
                children:
                    messages.map(
                  (message) {
                    final profile =
                        message[
                                'profiles']
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
                        author
                            .toString(),
                        style:
                            const TextStyle(
                          fontWeight:
                              FontWeight
                                  .w800,
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

class _PredictionCard
    extends StatelessWidget {
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
        padding:
            const EdgeInsets.all(16),
        child: Column(
          children: [
            const Align(
              alignment:
                  Alignment.centerRight,
              child: Text(
                'ניחוש תוצאה',
                style: TextStyle(
                  fontSize: 19,
                  fontWeight:
                      FontWeight.w900,
                ),
              ),
            ),

            const SizedBox(height: 16),

            Row(
              children: [
                Expanded(
                  child: Text(
                    homeName,
                    textAlign:
                        TextAlign.center,
                    maxLines: 1,
                    overflow:
                        TextOverflow.ellipsis,
                    style:
                        const TextStyle(
                      fontSize: 12,
                      fontWeight:
                          FontWeight.w700,
                    ),
                  ),
                ),
                const SizedBox(width: 90),
                Expanded(
                  child: Text(
                    awayName,
                    textAlign:
                        TextAlign.center,
                    maxLines: 1,
                    overflow:
                        TextOverflow.ellipsis,
                    style:
                        const TextStyle(
                      fontSize: 12,
                      fontWeight:
                          FontWeight.w700,
                    ),
                  ),
                ),
              ],
            ),

            const SizedBox(height: 8),

            Row(
              mainAxisAlignment:
                  MainAxisAlignment.center,
              children: [
                IconButton(
                  onPressed:
                      onHomeMinus,
                  icon: const Icon(
                    Icons.remove,
                  ),
                ),
                Text(
                  '$homePrediction',
                  style:
                      const TextStyle(
                    fontSize: 24,
                    fontWeight:
                        FontWeight.w900,
                  ),
                ),
                IconButton(
                  onPressed:
                      onHomePlus,
                  icon: const Icon(
                    Icons.add,
                  ),
                ),

                const Padding(
                  padding:
                      EdgeInsets.symmetric(
                    horizontal: 5,
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
                  onPressed:
                      onAwayMinus,
                  icon: const Icon(
                    Icons.remove,
                  ),
                ),
                Text(
                  '$awayPrediction',
                  style:
                      const TextStyle(
                    fontSize: 24,
                    fontWeight:
                        FontWeight.w900,
                  ),
                ),
                IconButton(
                  onPressed:
                      onAwayPlus,
                  icon: const Icon(
                    Icons.add,
                  ),
                ),
              ],
            ),

            const SizedBox(height: 8),

            SizedBox(
              width: double.infinity,
              child: FilledButton(
                onPressed: onSubmit,
                child: const Text(
                  'שלח ניחוש',
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ============================================================
// HEBREW NAMES
// ============================================================

class FootballHebrew {
  static const Map<String, String>
      _teams = {
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

  static String team(
    String? value,
  ) {
    if (value == null ||
        value.trim().isEmpty) {
      return 'קבוצה';
    }

    final clean = value.trim();

    return _teams[clean] ?? clean;
  }

  static String competition(
    String? value,
  ) {
    if (value == null ||
        value.trim().isEmpty) {
      return 'כדורגל';
    }

    final clean = value.trim();

    if (clean.contains(
      "Ligat Ha'al",
    )) {
      if (clean
          .toLowerCase()
          .contains('championship')) {
        return 'ליגת העל • פלייאוף עליון';
      }

      return 'ליגת העל';
    }

    if (clean.contains(
      'UEFA Europa League',
    )) {
      if (clean
          .toLowerCase()
          .contains('league phase')) {
        return 'הליגה האירופית • שלב הליגה';
      }

      return 'הליגה האירופית';
    }

    if (clean.contains(
      'UEFA Champions League',
    )) {
      return 'ליגת האלופות';
    }

    if (clean.contains(
      'UEFA Conference League',
    )) {
      return 'הקונפרנס ליג';
    }

    if (clean.contains(
      'State Cup',
    )) {
      return 'גביע המדינה';
    }

    if (clean.contains(
      'Toto Cup',
    )) {
      return 'גביע הטוטו';
    }

    if (clean.contains(
      'Club Friendlies',
    )) {
      return 'משחק ידידות';
    }

    return clean;
  }

  static String round(
    String value,
  ) {
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

class _ErrorState
    extends StatelessWidget {
  final Future<void> Function() onRetry;

  const _ErrorState({
    required this.onRetry,
  });

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding:
            const EdgeInsets.all(24),
        child: Column(
          mainAxisSize:
              MainAxisSize.min,
          children: [
            const Icon(
              Icons.error_outline,
              size: 44,
              color: Colors.white54,
            ),
            const SizedBox(height: 12),
            const Text(
              'לא הצלחנו לטעון את המשחקים',
              style: TextStyle(
                fontSize: 19,
                fontWeight:
                    FontWeight.w900,
              ),
            ),
            const SizedBox(height: 12),
            FilledButton(
              onPressed: () {
                onRetry();
              },
              child:
                  const Text('נסה שוב'),
            ),
          ],
        ),
      ),
    );
  }
}

class _EmptyState
    extends StatelessWidget {
  const _EmptyState();

  @override
  Widget build(BuildContext context) {
    return const Card(
      child: Padding(
        padding: EdgeInsets.all(24),
        child: Column(
          children: [
            Icon(
              Icons
                  .sports_soccer_outlined,
              size: 38,
              color: Colors.white38,
            ),
            SizedBox(height: 10),
            Text(
              'אין משחקים להצגה כרגע',
              style: TextStyle(
                fontWeight:
                    FontWeight.w800,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
