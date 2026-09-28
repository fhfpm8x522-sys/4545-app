import 'package:flutter/material.dart';

import '../../models/club.dart';
import '../../repositories/home_repository.dart';

class HomeScreen extends StatefulWidget {
  final Club club;

  const HomeScreen({
    super.key,
    required this.club,
  });

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final repository = HomeRepository();

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: RefreshIndicator(
        onRefresh: () async {
          setState(() {});
        },
        child: FutureBuilder<List<dynamic>>(
          future: Future.wait([
            repository.nextMatch(widget.club.id),
            repository.latestNews(widget.club.id),
            repository.activePoll(widget.club.id),
            repository.latestHistory(widget.club.id),
          ]),
          builder: (context, snapshot) {
            if (snapshot.connectionState ==
                ConnectionState.waiting) {
              return const Center(
                child: CircularProgressIndicator(),
              );
            }

            if (snapshot.hasError) {
              return _errorState(
                snapshot.error.toString(),
              );
            }

            final data = snapshot.data ?? [];

            final nextMatch = data.isNotEmpty
                ? data[0] as Map<String, dynamic>?
                : null;

            final news = data.length > 1
                ? List<Map<String, dynamic>>.from(
                    data[1] ?? [],
                  )
                : <Map<String, dynamic>>[];

            final poll = data.length > 2
                ? data[2] as Map<String, dynamic>?
                : null;

            final history = data.length > 3
                ? data[3] as Map<String, dynamic>?
                : null;

            return ListView(
              physics:
                  const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.fromLTRB(
                18,
                14,
                18,
                30,
              ),
              children: [
                _header(),

                const SizedBox(height: 22),

                _matchHero(nextMatch),

                const SizedBox(height: 18),

                _nowCard(),

                const SizedBox(height: 24),

                _sectionHeader(
                  'חדשות אחרונות',
                  Icons.newspaper_outlined,
                ),

                const SizedBox(height: 10),

                _newsSection(news),

                const SizedBox(height: 24),

                _sectionHeader(
                  'סקר האוהדים',
                  Icons.poll_outlined,
                ),

                const SizedBox(height: 10),

                _pollSection(poll),

                const SizedBox(height: 24),

                _sectionHeader(
                  'היום במועדון',
                  Icons.history_rounded,
                ),

                const SizedBox(height: 10),

                _historySection(history),

                const SizedBox(height: 24),

                _clubStatus(),
              ],
            );
          },
        ),
      ),
    );
  }

  // =========================================================
  // HEADER
  // =========================================================

  Widget _header() {
    return Row(
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment:
                CrossAxisAlignment.start,
            children: [
              const Text(
                '45:45',
                textDirection: TextDirection.ltr,
                style: TextStyle(
                  fontSize: 31,
                  fontWeight: FontWeight.w900,
                  letterSpacing: -1,
                ),
              ),

              const SizedBox(height: 2),

              Text(
                widget.club.name,
                style: TextStyle(
                  color: widget.club.accent,
                  fontSize: 15,
                  fontWeight: FontWeight.w900,
                ),
              ),
            ],
          ),
        ),

        IconButton(
          tooltip: 'התראות',
          onPressed: () {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text(
                  'מרכז ההתראות יחובר לשירות ה־Push.',
                ),
              ),
            );
          },
          icon: const Icon(
            Icons.notifications_none_rounded,
          ),
        ),

        const SizedBox(width: 4),

        CircleAvatar(
          radius: 21,
          backgroundColor:
              widget.club.accent.withValues(
            alpha: 0.20,
          ),
          backgroundImage:
              widget.club.crestUrl != null
                  ? NetworkImage(
                      widget.club.crestUrl!,
                    )
                  : null,
          child: widget.club.crestUrl == null
              ? Icon(
                  Icons.shield,
                  color: widget.club.accent,
                )
              : null,
        ),
      ],
    );
  }

  // =========================================================
  // NEXT MATCH HERO
  // =========================================================

  Widget _matchHero(
    Map<String, dynamic>? match,
  ) {
    if (match == null) {
      return Container(
        padding: const EdgeInsets.all(22),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(28),
          color: const Color(0xFF111317),
          border: Border.all(
            color: widget.club.accent.withValues(
              alpha: 0.20,
            ),
          ),
        ),
        child: Column(
          children: [
            Icon(
              Icons.sports_soccer,
              size: 42,
              color: widget.club.accent,
            ),
            const SizedBox(height: 12),
            const Text(
              'המשחק הבא',
              style: TextStyle(
                fontSize: 21,
                fontWeight: FontWeight.w900,
              ),
            ),
            const SizedBox(height: 6),
            const Text(
              'עדיין לא הוזן משחק קרוב.',
              style: TextStyle(
                color: Colors.white54,
              ),
            ),
          ],
        ),
      );
    }

    final status =
        match['status']?.toString() ?? 'scheduled';

    final kickoff =
        DateTime.tryParse(
          match['kickoff']?.toString() ?? '',
        )?.toLocal();

    final isLive = status == 'live';
    final isFinished = status == 'finished';

    String label = 'המשחק הבא';

    if (isLive) {
      label = 'LIVE';
    } else if (isFinished) {
      label = 'הסתיים';
    }

    final homeName =
        match['home_name']?.toString() ?? 'בית';

    final awayName =
        match['away_name']?.toString() ?? 'חוץ';

    return Container(
      padding: const EdgeInsets.all(22),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(28),
        gradient: LinearGradient(
          begin: Alignment.topRight,
          end: Alignment.bottomLeft,
          colors: [
            widget.club.accent.withValues(
              alpha: 0.24,
            ),
            const Color(0xFF111317),
            const Color(0xFF090A0C),
          ],
        ),
        border: Border.all(
          color: widget.club.accent.withValues(
            alpha: 0.30,
          ),
        ),
      ),
      child: Column(
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 10,
                  vertical: 6,
                ),
                decoration: BoxDecoration(
                  color: widget.club.accent.withValues(
                    alpha: 0.20,
                  ),
                  borderRadius:
                      BorderRadius.circular(100),
                ),
                child: Text(
                  label,
                  style: TextStyle(
                    color: widget.club.accent,
                    fontSize: 12,
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ),

              const Spacer(),

              Text(
                match['competition']
                        ?.toString() ??
                    '',
                style: const TextStyle(
                  color: Colors.white54,
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ),

          const SizedBox(height: 26),

          Row(
            children: [
              Expanded(
                child: _team(
                  homeName,
                  match['home_club_id'] ==
                      widget.club.id,
                ),
              ),

              Padding(
                padding: const EdgeInsets.symmetric(
                  horizontal: 12,
                ),
                child: _scoreOrTime(
                  match,
                  kickoff,
                  isLive || isFinished,
                ),
              ),

              Expanded(
                child: _team(
                  awayName,
                  match['away_club_id'] ==
                      widget.club.id,
                ),
              ),
            ],
          ),

          const SizedBox(height: 22),

          if (match['stadium'] != null)
            Row(
              mainAxisAlignment:
                  MainAxisAlignment.center,
              children: [
                const Icon(
                  Icons.stadium_outlined,
                  size: 16,
                  color: Colors.white38,
                ),
                const SizedBox(width: 6),
                Flexible(
                  child: Text(
                    match['stadium'].toString(),
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                      color: Colors.white54,
                      fontSize: 12,
                    ),
                  ),
                ),
              ],
            ),

          if (kickoff != null &&
              !isLive &&
              !isFinished) ...[
            const SizedBox(height: 8),
            Text(
              _formatDate(kickoff),
              style: const TextStyle(
                color: Colors.white54,
                fontSize: 12,
              ),
            ),
          ],

          const SizedBox(height: 18),

          SizedBox(
            width: double.infinity,
            child: FilledButton.icon(
              onPressed: () {
                ScaffoldMessenger.of(context)
                    .showSnackBar(
                  const SnackBar(
                    content: Text(
                      'פתח את לשונית משחקים כדי להיכנס ל־Match Center.',
                    ),
                  ),
                );
              },
              icon: const Icon(
                Icons.sports_soccer,
              ),
              label: const Text(
                'MATCH CENTER',
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _team(
    String name,
    bool isMyClub,
  ) {
    return Column(
      children: [
        CircleAvatar(
          radius: 27,
          backgroundColor: isMyClub
              ? widget.club.accent.withValues(
                  alpha: 0.22,
                )
              : Colors.white10,
          backgroundImage:
              isMyClub &&
                      widget.club.crestUrl != null
                  ? NetworkImage(
                      widget.club.crestUrl!,
                    )
                  : null,
          child: isMyClub &&
                  widget.club.crestUrl == null
              ? Icon(
                  Icons.shield,
                  color: widget.club.accent,
                )
              : !isMyClub
                  ? const Icon(
                      Icons.shield_outlined,
                      color: Colors.white54,
                    )
                  : null,
        ),

        const SizedBox(height: 8),

        Text(
          name,
          maxLines: 2,
          overflow: TextOverflow.ellipsis,
          textAlign: TextAlign.center,
          style: TextStyle(
            fontWeight: FontWeight.w900,
            color: isMyClub
                ? Colors.white
                : Colors.white70,
          ),
        ),
      ],
    );
  }

  Widget _scoreOrTime(
    Map<String, dynamic> match,
    DateTime? kickoff,
    bool showScore,
  ) {
    if (showScore) {
      return Text(
        '${match['home_score'] ?? '-'}'
        ' : '
        '${match['away_score'] ?? '-'}',
        textDirection: TextDirection.ltr,
        style: const TextStyle(
          fontSize: 28,
          fontWeight: FontWeight.w900,
        ),
      );
    }

    if (kickoff == null) {
      return const Text(
        'VS',
        style: TextStyle(
          fontSize: 22,
          fontWeight: FontWeight.w900,
        ),
      );
    }

    return Column(
      children: [
        Text(
          '${kickoff.hour.toString().padLeft(2, '0')}:'
          '${kickoff.minute.toString().padLeft(2, '0')}',
          textDirection: TextDirection.ltr,
          style: const TextStyle(
            fontSize: 25,
            fontWeight: FontWeight.w900,
          ),
        ),
        const SizedBox(height: 2),
        const Text(
          'VS',
          style: TextStyle(
            color: Colors.white38,
            fontSize: 11,
            fontWeight: FontWeight.w800,
          ),
        ),
      ],
    );
  }

  // =========================================================
  // 45:45 NOW
  // =========================================================

  Widget _nowCard() {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(22),
        color: widget.club.accent.withValues(
          alpha: 0.10,
        ),
        border: Border.all(
          color: widget.club.accent.withValues(
            alpha: 0.18,
          ),
        ),
      ),
      child: Row(
        crossAxisAlignment:
            CrossAxisAlignment.start,
        children: [
          Container(
            width: 42,
            height: 42,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: widget.club.accent.withValues(
                alpha: 0.20,
              ),
            ),
            child: Icon(
              Icons.bolt_rounded,
              color: widget.club.accent,
            ),
          ),

          const SizedBox(width: 12),

          const Expanded(
            child: Column(
              crossAxisAlignment:
                  CrossAxisAlignment.start,
              children: [
                Text(
                  '45:45 עכשיו',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w900,
                  ),
                ),
                SizedBox(height: 5),
                Text(
                  'העדכונים החשובים ביותר של הקבוצה שלך ירוכזו כאן בזמן אמת.',
                  style: TextStyle(
                    color: Colors.white60,
                    height: 1.4,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // =========================================================
  // NEWS
  // =========================================================

  Widget _newsSection(
    List<Map<String, dynamic>> news,
  ) {
    if (news.isEmpty) {
      return _emptyCard(
        'אין כרגע חדשות שפורסמו.',
      );
    }

    return Column(
      children: news.take(3).map(
        (article) {
          final imageUrl =
              article['image_url']?.toString();

          return Card(
            margin:
                const EdgeInsets.only(bottom: 9),
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Row(
                children: [
                  if (imageUrl != null &&
                      imageUrl.isNotEmpty)
                    ClipRRect(
                      borderRadius:
                          BorderRadius.circular(12),
                      child: Image.network(
                        imageUrl,
                        width: 76,
                        height: 76,
                        fit: BoxFit.cover,
                        errorBuilder:
                            (_, __, ___) =>
                                _newsPlaceholder(),
                      ),
                    )
                  else
                    _newsPlaceholder(),

                  const SizedBox(width: 12),

                  Expanded(
                    child: Column(
                      crossAxisAlignment:
                          CrossAxisAlignment.start,
                      children: [
                        if (article['official'] ==
                            true)
                          Text(
                            'רשמי',
                            style: TextStyle(
                              color:
                                  widget.club.accent,
                              fontSize: 11,
                              fontWeight:
                                  FontWeight.w900,
                            ),
                          ),

                        Text(
                          article['title']
                                  ?.toString() ??
                              '',
                          maxLines: 2,
                          overflow:
                              TextOverflow.ellipsis,
                          style: const TextStyle(
                            fontWeight:
                                FontWeight.w900,
                          ),
                        ),

                        const SizedBox(height: 5),

                        Text(
                          article['source_name']
                                  ?.toString() ??
                              '45:45',
                          style: const TextStyle(
                            color: Colors.white38,
                            fontSize: 11,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      ).toList(),
    );
  }

  Widget _newsPlaceholder() {
    return Container(
      width: 76,
      height: 76,
      decoration: BoxDecoration(
        color: Colors.white10,
        borderRadius: BorderRadius.circular(12),
      ),
      alignment: Alignment.center,
      child: Icon(
        Icons.sports_soccer,
        color: widget.club.accent,
      ),
    );
  }

  // =========================================================
  // POLL
  // =========================================================

  Widget _pollSection(
    Map<String, dynamic>? poll,
  ) {
    if (poll == null) {
      return _emptyCard(
        'אין כרגע סקר פעיל.',
      );
    }

    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(22),
        color: const Color(0xFF111317),
        border: Border.all(
          color: Colors.white.withValues(
            alpha: 0.06,
          ),
        ),
      ),
      child: Column(
        crossAxisAlignment:
            CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                Icons.how_to_vote_outlined,
                color: widget.club.accent,
              ),
              const SizedBox(width: 8),
              const Text(
                'מה אתם אומרים?',
                style: TextStyle(
                  fontWeight: FontWeight.w900,
                ),
              ),
            ],
          ),

          const SizedBox(height: 12),

          Text(
            poll['question']?.toString() ?? '',
            style: const TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w900,
              height: 1.3,
            ),
          ),

          const SizedBox(height: 12),

          const Text(
            'אפשרויות ההצבעה יחוברו למסך הבית בשלב הבא.',
            style: TextStyle(
              color: Colors.white54,
              fontSize: 12,
            ),
          ),
        ],
      ),
    );
  }

  // =========================================================
  // HISTORY
  // =========================================================

  Widget _historySection(
    Map<String, dynamic>? history,
  ) {
    if (history == null) {
      return _emptyCard(
        'עדיין לא הוזן אירוע היסטורי.',
      );
    }

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(17),
        child: Column(
          crossAxisAlignment:
              CrossAxisAlignment.start,
          children: [
            if (history['event_date'] != null)
              Text(
                history['event_date'].toString(),
                style: TextStyle(
                  color: widget.club.accent,
                  fontSize: 12,
                  fontWeight: FontWeight.w900,
                ),
              ),

            const SizedBox(height: 5),

            Text(
              history['title']?.toString() ?? '',
              style: const TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w900,
              ),
            ),

            if (history['body'] != null) ...[
              const SizedBox(height: 8),
              Text(
                history['body'].toString(),
                maxLines: 4,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  color: Colors.white60,
                  height: 1.4,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  // =========================================================
  // CLUB STATUS
  // =========================================================

  Widget _clubStatus() {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(22),
        color: const Color(0xFF0D0F12),
      ),
      child: Row(
        children: [
          CircleAvatar(
            radius: 25,
            backgroundColor:
                widget.club.accent.withValues(
              alpha: 0.18,
            ),
            backgroundImage:
                widget.club.crestUrl != null
                    ? NetworkImage(
                        widget.club.crestUrl!,
                      )
                    : null,
            child: widget.club.crestUrl == null
                ? Icon(
                    Icons.shield,
                    color: widget.club.accent,
                  )
                : null,
          ),

          const SizedBox(width: 13),

          Expanded(
            child: Column(
              crossAxisAlignment:
                  CrossAxisAlignment.start,
              children: [
                Text(
                  widget.club.name,
                  style: const TextStyle(
                    fontSize: 17,
                    fontWeight: FontWeight.w900,
                  ),
                ),
                const SizedBox(height: 3),
                const Text(
                  'הקבוצה שלי • חיים את הקבוצה.',
                  style: TextStyle(
                    color: Colors.white54,
                    fontSize: 12,
                  ),
                ),
              ],
            ),
          ),

          Icon(
            Icons.favorite_rounded,
            color: widget.club.accent,
          ),
        ],
      ),
    );
  }

  // =========================================================
  // HELPERS
  // =========================================================

  Widget _sectionHeader(
    String title,
    IconData icon,
  ) {
    return Row(
      children: [
        Icon(
          icon,
          size: 21,
          color: widget.club.accent,
        ),
        const SizedBox(width: 8),
        Text(
          title,
          style: const TextStyle(
            fontSize: 21,
            fontWeight: FontWeight.w900,
          ),
        ),
      ],
    );
  }

  Widget _emptyCard(
    String text,
  ) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Center(
          child: Text(
            text,
            textAlign: TextAlign.center,
            style: const TextStyle(
              color: Colors.white54,
            ),
          ),
        ),
      ),
    );
  }

  Widget _errorState(
    String error,
  ) {
    return ListView(
      physics:
          const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.all(24),
      children: [
        const SizedBox(height: 100),
        const Icon(
          Icons.error_outline,
          size: 46,
          color: Colors.white54,
        ),
        const SizedBox(height: 14),
        const Text(
          'לא הצלחנו לטעון את מסך הבית.',
          textAlign: TextAlign.center,
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.w900,
          ),
        ),
        const SizedBox(height: 8),
        Text(
          error,
          textAlign: TextAlign.center,
          style: const TextStyle(
            color: Colors.white38,
            fontSize: 11,
          ),
        ),
      ],
    );
  }

  String _formatDate(
    DateTime date,
  ) {
    final day =
        date.day.toString().padLeft(2, '0');

    final month =
        date.month.toString().padLeft(2, '0');

    final hour =
        date.hour.toString().padLeft(2, '0');

    final minute =
        date.minute.toString().padLeft(2, '0');

    return '$day/$month • $hour:$minute';
  }
}
