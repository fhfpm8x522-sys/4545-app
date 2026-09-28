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
  late Future<List<Map<String, dynamic>>> matchesFuture;

  @override
  void initState() {
    super.initState();
    matchesFuture = AppRepository().matches(widget.club.id);
  }

  String formatDate(dynamic value) {
    final date = DateTime.tryParse('$value')?.toLocal();

    if (date == null) {
      return 'טרם נקבע';
    }

    final hour = date.hour.toString().padLeft(2, '0');
    final minute = date.minute.toString().padLeft(2, '0');

    return '${date.day}/${date.month} • $hour:$minute';
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: FutureBuilder<List<Map<String, dynamic>>>(
        future: matchesFuture,
        builder: (context, snapshot) {
          if (!snapshot.hasData) {
            return const Center(
              child: CircularProgressIndicator(),
            );
          }

          final matches = snapshot.data!;

          return ListView(
            padding: const EdgeInsets.all(18),
            children: [
              const Text(
                'משחקים',
                style: TextStyle(
                  fontSize: 32,
                  fontWeight: FontWeight.w900,
                ),
              ),
              Text(
                'כל המשחקים של ${widget.club.name}',
                style: const TextStyle(
                  color: Colors.white60,
                ),
              ),
              const SizedBox(height: 18),

              if (matches.isEmpty)
                const Card(
                  child: Padding(
                    padding: EdgeInsets.all(20),
                    child: Text(
                      'עדיין לא הוזנו משחקים.',
                    ),
                  ),
                ),

              ...matches.map(
                (match) => Card(
                  child: ListTile(
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
                    title: Text(
                      '${match['home_name'] ?? 'בית'}  '
                      '${match['home_score'] ?? ''} : '
                      '${match['away_score'] ?? ''}  '
                      '${match['away_name'] ?? 'חוץ'}',
                      style: const TextStyle(
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                    subtitle: Text(
                      '${match['competition']} • '
                      '${formatDate(match['kickoff'])}',
                    ),
                    trailing: const Icon(
                      Icons.chevron_left,
                    ),
                  ),
                ),
              ),
            ],
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
  State<MatchCenter> createState() => _MatchCenterState();
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

  @override
  Widget build(BuildContext context) {
    final match = widget.match;

    return Scaffold(
      appBar: AppBar(
        title: const Text('MATCH CENTER'),
      ),
      body: ListView(
        padding: const EdgeInsets.all(18),
        children: [
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(26),
              color: widget.club.accent.withValues(alpha: .15),
            ),
            child: Column(
              children: [
                Text(
                  '${match['competition']}',
                  style: TextStyle(
                    color: widget.club.accent,
                    fontWeight: FontWeight.w900,
                  ),
                ),
                const SizedBox(height: 20),
                Text(
                  '${match['home_name'] ?? 'בית'}   '
                  '${match['home_score'] ?? '–'} : '
                  '${match['away_score'] ?? '–'}   '
                  '${match['away_name'] ?? 'חוץ'}',
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.w900,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  '${match['stadium'] ?? ''}',
                  style: const TextStyle(
                    color: Colors.white60,
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 12),

          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'ניחוש תוצאה',
                    style: TextStyle(
                      fontSize: 19,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      IconButton(
                        onPressed: () {
                          setState(() {
                            homePrediction++;
                          });
                        },
                        icon: const Icon(Icons.add),
                      ),
                      Text(
                        '$homePrediction',
                        style: const TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                      const Text('  :  '),
                      Text(
                        '$awayPrediction',
                        style: const TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                      IconButton(
                        onPressed: () {
                          setState(() {
                            awayPrediction++;
                          });
                        },
                        icon: const Icon(Icons.add),
                      ),
                      const Spacer(),
                      FilledButton(
                        onPressed: () async {
                          await repository.prediction(
                            match['id'],
                            homePrediction,
                            awayPrediction,
                          );

                          if (context.mounted) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(
                                content: Text('הניחוש נשמר 🔥'),
                              ),
                            );
                          }
                        },
                        child: const Text('שלח'),
                      ),
                    ],
                  ),

                  const SizedBox(height: 8),

                  OutlinedButton.icon(
                    onPressed: () async {
                      await repository.attendance(
                        match['id'],
                      );

                      if (context.mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content: Text(
                              'המשחק נוסף לרשימת "הייתי במשחק"',
                            ),
                          ),
                        );
                      }
                    },
                    icon: const Icon(Icons.stadium),
                    label: const Text('הייתי במשחק'),
                  ),
                ],
              ),
            ),
          ),

          FutureBuilder<List<Map<String, dynamic>>>(
            future: repository.events(match['id']),
            builder: (context, snapshot) {
              final events = snapshot.data ?? [];

              return Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'אירועי משחק',
                        style: TextStyle(
                          fontSize: 19,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                      const SizedBox(height: 8),

                      if (events.isEmpty)
                        const Padding(
                          padding: EdgeInsets.symmetric(
                            vertical: 12,
                          ),
                          child: Text(
                            'אין עדיין אירועים למשחק.',
                            style: TextStyle(
                              color: Colors.white54,
                            ),
                          ),
                        ),

                      ...events.map(
                        (event) => ListTile(
                          title: Text(
                            "${event['minute'] ?? ''}' • "
                            "${event['event_type']}",
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
                icon: const Icon(Icons.send),
                onPressed: () async {
                  final message =
                      messageController.text.trim();

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

          FutureBuilder<List<Map<String, dynamic>>>(
            future: repository.chat(
              match: match['id'],
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
