import 'package:flutter/material.dart';

class AppTheme {
  static const bg = Color(0xFF08090B);
  static const surface = Color(0xFF111317);
  static const surface2 = Color(0xFF191C21);
  static const red = Color(0xFFFF3434);
  static const muted = Color(0xFF9499A4);

  static ThemeData dark() => ThemeData(
    brightness: Brightness.dark,
    scaffoldBackgroundColor: bg,
    colorScheme: const ColorScheme.dark(primary: red, surface: surface),
    useMaterial3: true,
    fontFamily: 'Arial',
    cardTheme: CardThemeData(color: surface, elevation: 0, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(22))),
    inputDecorationTheme: InputDecorationTheme(
      filled: true, fillColor: surface2,
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide.none),
      enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide.none),
      focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: const BorderSide(color: red)),
    ),
  );
}
