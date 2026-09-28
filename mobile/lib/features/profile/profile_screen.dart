import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../models/club.dart';
import '../../repositories/app_repository.dart';
import '../../data/session_store.dart';
import '../auth/start_screen.dart';

class ProfileScreen extends StatefulWidget {
  final Club club;
  final String displayName;
  final String username;

  const ProfileScreen({
    super.key,
    required this.club,
    required this.displayName,
    required this.username,
  });

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  final repository = AppRepository();

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: RefreshIndicator(
        onRefresh: () async {
          setState(() {});
        },
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(18),
          children: [
            const Text(
              'אני',
              style: TextStyle(
                fontSize: 32,
                fontWeight: FontWeight.w900,
              ),
            ),

            const SizedBox(height: 18),

            _profileHeader(),

            const SizedBox(height: 18),

            FutureBuilder<List<Map<String, dynamic>>>(
              future: repository.myAttendance(),
              builder: (context, snapshot) {
                return _menuCard(
                  icon: Icons.stadium_rounded,
                  title: 'הייתי במשחק',
                  subtitle: 'המשחקים שהיית בהם',
                  trailing: '${snapshot.data?.length ?? 0}',
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => MyAttendanceScreen(
                          club: widget.club,
                        ),
                      ),
                    );
                  },
                );
              },
            ),

            FutureBuilder<List<Map<String, dynamic>>>(
              future: repository.myPredictions(),
              builder: (context, snapshot) {
                return _menuCard(
                  icon: Icons.auto_graph_rounded,
                  title: 'הניחושים שלי',
                  subtitle: 'היסטוריית ניחושי התוצאות',
                  trailing: '${snapshot.data?.length ?? 0}',
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) =>
                            const MyPredictionsScreen(),
                      ),
                    );
                  },
                );
              },
            ),

            _menuCard(
              icon: Icons.widgets_outlined,
              title: 'Widget שירי אוהדים',
              subtitle:
                  'שירי היציע של ${widget.club.name}',
              onTap: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => WidgetSongsScreen(
                      club: widget.club,
                    ),
                  ),
                );
              },
            ),

            _menuCard(
              icon: Icons.notifications_outlined,
              title: 'התראות',
              subtitle:
                  'משחקים, חדשות, הרכבים ועדכונים',
              onTap: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) =>
                        const NotificationSettingsScreen(),
                  ),
                );
              },
            ),

            _menuCard(
              icon: Icons.shield_outlined,
              title: 'הקבוצה שלי',
              subtitle: widget.club.name,
              onTap: () {
                _showClubInfo();
              },
            ),

            _menuCard(
              icon: Icons.badge_outlined,
              title: 'תעודת אוהד',
              subtitle: 'Fan Card של 45:45',
              onTap: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => FanCardScreen(
                      club: widget.club,
                      displayName: widget.displayName,
                      username: widget.username,
                    ),
                  ),
                );
              },
            ),

            const SizedBox(height: 18),

            OutlinedButton.icon(
              onPressed: _logout,
              icon: const Icon(Icons.logout),
              label: const Text('התנתקות'),
            ),

            const SizedBox(height: 30),
          ],
        ),
      ),
    );
  }

  Widget _profileHeader() {
    final firstLetter = widget.displayName.isNotEmpty
        ? widget.displayName.characters.first
        : '?';

    return Container(
      padding: const EdgeInsets.all(22),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(28),
        color: widget.club.accent.withValues(alpha: .13),
        border: Border.all(
          color: widget.club.accent.withValues(alpha: .25),
        ),
      ),
      child: Row(
        children: [
          CircleAvatar(
            radius: 38,
            backgroundColor:
                widget.club.accent.withValues(alpha: .25),
            child: Text(
              firstLetter,
              style: TextStyle(
                color: widget.club.accent,
                fontSize: 27,
                fontWeight: FontWeight.w900,
              ),
            ),
          ),

          const SizedBox(width: 16),

          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  widget.displayName,
                  style: const TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.w900,
                  ),
                ),

                const SizedBox(height: 3),

                Text(
                  '@${widget.username}',
                  textDirection: TextDirection.ltr,
                  style: const TextStyle(
                    color: Colors.white54,
                  ),
                ),

                const SizedBox(height: 8),

                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 10,
                    vertical: 5,
                  ),
                  decoration: BoxDecoration(
                    color:
                        widget.club.accent.withValues(alpha: .18),
                    borderRadius: BorderRadius.circular(100),
                  ),
                  child: Text(
                    widget.club.name,
                    style: TextStyle(
                      color: widget.club.accent,
                      fontSize: 12,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _menuCard({
    required IconData icon,
    required String title,
    required String subtitle,
    required VoidCallback onTap,
    String? trailing,
  }) {
    return Card(
      margin: const EdgeInsets.only(bottom: 9),
      child: ListTile(
        onTap: onTap,
        leading: Container(
          width: 43,
          height: 43,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(13),
            color: widget.club.accent.withValues(alpha: .12),
          ),
          child: Icon(
            icon,
            color: widget.club.accent,
          ),
        ),
        title: Text(
          title,
          style: const TextStyle(
            fontWeight: FontWeight.w900,
          ),
        ),
        subtitle: Text(subtitle),
        trailing: trailing != null
            ? Text(
                trailing,
                style: TextStyle(
                  color: widget.club.accent,
                  fontSize: 20,
                  fontWeight: FontWeight.w900,
                ),
              )
            : const Icon(Icons.chevron_left),
      ),
    );
  }

  void _showClubInfo() {
    showModalBottomSheet(
      context: context,
      showDragHandle: true,
      builder: (context) {
        return Padding(
          padding: const EdgeInsets.fromLTRB(
            20,
            5,
            20,
            30,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                Icons.shield,
                color: widget.club.accent,
                size: 45,
              ),
              const SizedBox(height: 10),
              Text(
                widget.club.name,
                style: const TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.w900,
                ),
              ),
              const SizedBox(height: 8),
              const Text(
                'אחרי שינוי קבוצה קיימת תקופת המתנה של 30 יום לפני שינוי נוסף.',
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: Colors.white60,
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Future<void> _logout() async {
    if (Supabase.instance.client.auth.currentUser != null) {
      await Supabase.instance.client.auth.signOut();
    }

    await SessionStore().clear();

    if (!mounted) return;

    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute(
        builder: (_) => const StartScreen(),
      ),
      (_) => false,
    );
  }
}

class MyAttendanceScreen extends StatelessWidget {
  final Club club;

  const MyAttendanceScreen({
    super.key,
    required this.club,
  });

  @override
  Widget build(BuildContext context) {
    final repository = AppRepository();

    return Scaffold(
      appBar: AppBar(
        title: const Text('הייתי במשחק'),
      ),
      body: FutureBuilder<List<Map<String, dynamic>>>(
        future: repository.myAttendance(),
        builder: (context, snapshot) {
          if (!snapshot.hasData) {
            return const Center(
              child: CircularProgressIndicator(),
            );
          }

          final items = snapshot.data!;

          if (items.isEmpty) {
            return const Center(
              child: Text(
                'עדיין לא סימנת שהיית במשחק.',
              ),
            );
          }

          return ListView.builder(
            padding: const EdgeInsets.all(18),
            itemCount: items.length,
            itemBuilder: (context, index) {
              final attendance = items[index];

              final match =
                  attendance['matches']
                      as Map<String, dynamic>? ??
                  {};

              return Card(
                child: ListTile(
                  leading: Icon(
                    Icons.stadium,
                    color: club.accent,
                  ),
                  title: Text(
                    '${match['home_name'] ?? 'בית'}'
                    ' - '
                    '${match['away_name'] ?? 'חוץ'}',
                    style: const TextStyle(
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                  subtitle: Text(
                    '${match['competition'] ?? ''}'
                    '${match['stadium'] != null ? ' • ${match['stadium']}' : ''}',
                  ),
                  trailing: Text(
                    '${match['home_score'] ?? '-'}'
                    ':'
                    '${match['away_score'] ?? '-'}',
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                ),
              );
            },
          );
        },
      ),
    );
  }
}

class MyPredictionsScreen extends StatelessWidget {
  const MyPredictionsScreen({
    super.key,
  });

  @override
  Widget build(BuildContext context) {
    final repository = AppRepository();

    return Scaffold(
      appBar: AppBar(
        title: const Text('הניחושים שלי'),
      ),
      body: FutureBuilder<List<Map<String, dynamic>>>(
        future: repository.myPredictions(),
        builder: (context, snapshot) {
          if (!snapshot.hasData) {
            return const Center(
              child: CircularProgressIndicator(),
            );
          }

          final predictions = snapshot.data!;

          if (predictions.isEmpty) {
            return const Center(
              child: Text(
                'עדיין לא שלחת ניחושים.',
              ),
            );
          }

          return ListView.builder(
            padding: const EdgeInsets.all(18),
            itemCount: predictions.length,
            itemBuilder: (context, index) {
              final prediction = predictions[index];

              final match =
                  prediction['matches']
                      as Map<String, dynamic>? ??
                  {};

              return Card(
                child: ListTile(
                  title: Text(
                    '${match['home_name'] ?? 'בית'}'
                    ' - '
                    '${match['away_name'] ?? 'חוץ'}',
                    style: const TextStyle(
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                  subtitle: Text(
                    match['competition']?.toString() ?? '',
                  ),
                  trailing: Text(
                    '${prediction['home_score'] ?? 0}'
                    ':'
                    '${prediction['away_score'] ?? 0}',
                    style: const TextStyle(
                      fontSize: 21,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                ),
              );
            },
          );
        },
      ),
    );
  }
}

class WidgetSongsScreen extends StatelessWidget {
  final Club club;

  const WidgetSongsScreen({
    super.key,
    required this.club,
  });

  @override
  Widget build(BuildContext context) {
    final repository = AppRepository();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Widget שירי אוהדים'),
      ),
      body: FutureBuilder<List<Map<String, dynamic>>>(
        future: repository.chants(club.id),
        builder: (context, snapshot) {
          if (!snapshot.hasData) {
            return const Center(
              child: CircularProgressIndicator(),
            );
          }

          final songs = snapshot.data!;

          return ListView(
            padding: const EdgeInsets.all(18),
            children: [
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: club.accent.withValues(alpha: .14),
                  borderRadius: BorderRadius.circular(24),
                ),
                child: Column(
                  children: [
                    const Icon(
                      Icons.widgets,
                      size: 42,
                    ),
                    const SizedBox(height: 10),
                    const Text(
                      '45:45 Widget',
                      style: TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                    const SizedBox(height: 5),
                    const Text(
                      'ה־Widget מציג רק שירי אוהדים אמיתיים שהוזנו למערכת.',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        color: Colors.white60,
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 20),

              const Text(
                'שירים פעילים',
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.w900,
                ),
              ),

              const SizedBox(height: 10),

              if (songs.isEmpty)
                const Card(
                  child: Padding(
                    padding: EdgeInsets.all(20),
                    child: Text(
                      'עדיין לא הוזנו שירים לקבוצה.',
                    ),
                  ),
                ),

              ...songs.map(
                (song) => Card(
                  child: Padding(
                    padding: const EdgeInsets.all(17),
                    child: Text(
                      song['line']?.toString() ?? '',
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                      ),
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

class NotificationSettingsScreen extends StatefulWidget {
  const NotificationSettingsScreen({
    super.key,
  });

  @override
  State<NotificationSettingsScreen> createState() =>
      _NotificationSettingsScreenState();
}

class _NotificationSettingsScreenState
    extends State<NotificationSettingsScreen> {
  bool matchReminder = true;
  bool kickoff = true;
  bool goals = true;
  bool lineup = true;
  bool news = true;
  bool official = true;
  bool transfers = true;
  bool injuries = true;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('התראות'),
      ),
      body: ListView(
        padding: const EdgeInsets.all(18),
        children: [
          const Text(
            'משחקים',
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.w900,
            ),
          ),

          _toggle(
            'תזכורת לפני משחק',
            matchReminder,
            (value) {
              setState(() {
                matchReminder = value;
              });
            },
          ),

          _toggle(
            'שריקת פתיחה',
            kickoff,
            (value) {
              setState(() {
                kickoff = value;
              });
            },
          ),

          _toggle(
            'שערים',
            goals,
            (value) {
              setState(() {
                goals = value;
              });
            },
          ),

          _toggle(
            'פרסום הרכב',
            lineup,
            (value) {
              setState(() {
                lineup = value;
              });
            },
          ),

          const SizedBox(height: 18),

          const Text(
            'חדשות',
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.w900,
            ),
          ),

          _toggle(
            'חדשות חשובות',
            news,
            (value) {
              setState(() {
                news = value;
              });
            },
          ),

          _toggle(
            'הודעות רשמיות',
            official,
            (value) {
              setState(() {
                official = value;
              });
            },
          ),

          _toggle(
            'העברות',
            transfers,
            (value) {
              setState(() {
                transfers = value;
              });
            },
          ),

          _toggle(
            'פציעות',
            injuries,
            (value) {
              setState(() {
                injuries = value;
              });
            },
          ),

          const SizedBox(height: 16),

          const Text(
            'שמירת ההעדפות וחיבורן ל־Push יופעלו עם שירות ההתראות.',
            style: TextStyle(
              color: Colors.white38,
              fontSize: 12,
            ),
          ),
        ],
      ),
    );
  }

  Widget _toggle(
    String title,
    bool value,
    ValueChanged<bool> onChanged,
  ) {
    return SwitchListTile(
      contentPadding: EdgeInsets.zero,
      title: Text(title),
      value: value,
      onChanged: onChanged,
    );
  }
}

class FanCardScreen extends StatelessWidget {
  final Club club;
  final String displayName;
  final String username;

  const FanCardScreen({
    super.key,
    required this.club,
    required this.displayName,
    required this.username,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('תעודת אוהד'),
      ),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(22),
          child: AspectRatio(
            aspectRatio: .72,
            child: Container(
              padding: const EdgeInsets.all(25),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(32),
                gradient: LinearGradient(
                  begin: Alignment.topRight,
                  end: Alignment.bottomLeft,
                  colors: [
                    club.accent.withValues(alpha: .65),
                    const Color(0xFF111317),
                    const Color(0xFF050607),
                  ],
                ),
                border: Border.all(
                  color: club.accent.withValues(alpha: .45),
                ),
              ),
              child: Column(
                children: [
                  const Text(
                    '45:45',
                    textDirection: TextDirection.ltr,
                    style: TextStyle(
                      fontSize: 30,
                      fontWeight: FontWeight.w900,
                    ),
                  ),

                  const Spacer(),

                  CircleAvatar(
                    radius: 52,
                    backgroundColor:
                        Colors.white.withValues(alpha: .12),
                    child: Text(
                      displayName.isNotEmpty
                          ? displayName.characters.first
                          : '?',
                      style: const TextStyle(
                        fontSize: 38,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                  ),

                  const SizedBox(height: 18),

                  Text(
                    displayName,
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                      fontSize: 28,
                      fontWeight: FontWeight.w900,
                    ),
                  ),

                  const SizedBox(height: 5),

                  Text(
                    '@$username',
                    textDirection: TextDirection.ltr,
                    style: const TextStyle(
                      color: Colors.white60,
                    ),
                  ),

                  const SizedBox(height: 16),

                  Text(
                    club.name,
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      color: club.accent,
                      fontSize: 20,
                      fontWeight: FontWeight.w900,
                    ),
                  ),

                  const Spacer(),

                  const Text(
                    'חיים את הקבוצה.',
                    style: TextStyle(
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
