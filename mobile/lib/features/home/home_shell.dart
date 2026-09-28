import 'package:flutter/material.dart';

import '../../models/club.dart';
import '../profile/profile_screen.dart';
import '../games/games_screen.dart';
import '../team/team_screen.dart';
import '../news/news_screen.dart';
import 'home_screen.dart';

class HomeShell extends StatefulWidget {
  final Club club;
  final String displayName;
  final String username;

  const HomeShell({
    super.key,
    required this.club,
    required this.displayName,
    required this.username,
  });

  @override
  State<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends State<HomeShell> {
  int index = 0;

  @override
  Widget build(BuildContext context) {
    final pages = [
      HomeScreen(club: widget.club),
      GamesScreen(club: widget.club),
      TeamScreen(club: widget.club),
      NewsScreen(club: widget.club),
      ProfileScreen(
        club: widget.club,
        displayName: widget.displayName,
        username: widget.username,
      ),
    ];

    return Scaffold(
      body: IndexedStack(
        index: index,
        children: pages,
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: index,
        onDestinationSelected: (value) {
          setState(() => index = value);
        },
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.home_outlined),
            selectedIcon: Icon(Icons.home),
            label: 'בית',
          ),
          NavigationDestination(
            icon: Icon(Icons.sports_soccer),
            label: 'משחקים',
          ),
          NavigationDestination(
            icon: Icon(Icons.shield_outlined),
            label: 'הקבוצה',
          ),
          NavigationDestination(
            icon: Icon(Icons.newspaper),
            label: 'חדשות',
          ),
          NavigationDestination(
            icon: Icon(Icons.person_outline),
            label: 'אני',
          ),
        ],
      ),
    );
  }
}
