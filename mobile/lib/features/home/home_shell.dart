import 'package:flutter/material.dart';

import '../../models/club.dart';
import '../games/games_screen.dart';
import '../news/news_screen.dart';
import '../profile/profile_screen.dart';
import '../team/team_screen.dart';
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
  int currentIndex = 0;

  late final List<Widget> pages;

  @override
  void initState() {
    super.initState();

    pages = [
      HomeScreen(
        club: widget.club,
        displayName: widget.displayName,
      ),
      GamesScreen(
        club: widget.club,
      ),
      TeamScreen(
        club: widget.club,
      ),
      NewsScreen(
        club: widget.club,
      ),
      ProfileScreen(
        club: widget.club,
        displayName: widget.displayName,
        username: widget.username,
      ),
    ];
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(
        index: currentIndex,
        children: pages,
      ),
      bottomNavigationBar: SafeArea(
        top: false,
        child: Container(
          decoration: const BoxDecoration(
            color: Color(0xFF090A0C),
            border: Border(
              top: BorderSide(
                color: Color(0xFF1B1D21),
              ),
            ),
          ),
          child: NavigationBar(
            selectedIndex: currentIndex,
            backgroundColor: Colors.transparent,
            indicatorColor:
                widget.club.accent.withValues(alpha: .20),
            elevation: 0,
            height: 68,
            labelBehavior:
                NavigationDestinationLabelBehavior.alwaysShow,
            onDestinationSelected: (index) {
              setState(() {
                currentIndex = index;
              });
            },
            destinations: [
              NavigationDestination(
                icon: const Icon(
                  Icons.home_outlined,
                ),
                selectedIcon: Icon(
                  Icons.home_rounded,
                  color: widget.club.accent,
                ),
                label: 'בית',
              ),
              NavigationDestination(
                icon: const Icon(
                  Icons.sports_soccer_outlined,
                ),
                selectedIcon: Icon(
                  Icons.sports_soccer,
                  color: widget.club.accent,
                ),
                label: 'משחקים',
              ),
              NavigationDestination(
                icon: const Icon(
                  Icons.shield_outlined,
                ),
                selectedIcon: Icon(
                  Icons.shield,
                  color: widget.club.accent,
                ),
                label: 'הקבוצה',
              ),
              NavigationDestination(
                icon: const Icon(
                  Icons.newspaper_outlined,
                ),
                selectedIcon: Icon(
                  Icons.newspaper,
                  color: widget.club.accent,
                ),
                label: 'חדשות',
              ),
              NavigationDestination(
                icon: const Icon(
                  Icons.person_outline,
                ),
                selectedIcon: Icon(
                  Icons.person,
                  color: widget.club.accent,
                ),
                label: 'אני',
              ),
            ],
          ),
        ),
      ),
    );
  }
}
