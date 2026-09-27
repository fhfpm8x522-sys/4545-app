import 'package:flutter/material.dart';

Color colorFromHex(String value) {
  final clean = value.replaceFirst('#', '');
  return Color(int.parse('FF$clean', radix: 16));
}

class Club {
  final String id, name, shortName;
  final Color accent;
  final String? crestUrl;
  const Club(this.id, this.name, this.shortName, this.accent, {this.crestUrl});
  factory Club.fromMap(Map<String,dynamic> m) => Club(
    m['id'] as String,
    m['name_he'] as String,
    (m['short_name_he'] as String?) ?? m['name_he'] as String,
    colorFromHex((m['accent_color'] as String?) ?? '#FFFFFF'),
    crestUrl: m['crest_url'] as String?,
  );
}

// Offline/dev fallback only. Production club data comes from Supabase.
const demoClubs = <Club>[
  Club('hbs', 'הפועל באר שבע', 'ב״ש', Color(0xFFE31E24)),
  Club('mta', 'מכבי תל אביב', 'מכבי ת״א', Color(0xFFF7D117)),
  Club('mha', 'מכבי חיפה', 'מכבי חיפה', Color(0xFF19A34A)),
  Club('bje', 'בית״ר ירושלים', 'בית״ר', Color(0xFFF4D51C)),
  Club('hta', 'הפועל תל אביב', 'הפועל ת״א', Color(0xFFE11B22)),
  Club('mne', 'מכבי נתניה', 'נתניה', Color(0xFFF1D21A)),
  Club('hha', 'הפועל חיפה', 'הפועל חיפה', Color(0xFFE4232A)),
  Club('hje', 'הפועל ירושלים', 'הפועל י-ם', Color(0xFFD9272E)),
  Club('bsa', 'בני סכנין', 'סכנין', Color(0xFFE61E2A)),
  Club('hpt', 'הפועל פתח תקווה', 'הפועל פ״ת', Color(0xFF1B66B1)),
];
