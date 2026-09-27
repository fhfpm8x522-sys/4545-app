import 'package:supabase_flutter/supabase_flutter.dart';
import '../models/club.dart';

class ClubRepository {
  SupabaseClient get _db => Supabase.instance.client;
  Future<List<Club>> activeClubs() async {
    final rows = await _db.from('clubs').select('id,name_he,short_name_he,accent_color,crest_url').eq('active', true).order('name_he');
    return (rows as List).map((r) => Club.fromMap(Map<String,dynamic>.from(r))).toList();
  }
}

