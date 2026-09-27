import 'package:supabase_flutter/supabase_flutter.dart';

class ProfileRepository {
  SupabaseClient get _db => Supabase.instance.client;

  Future<bool> usernameAvailable(String raw) async {
    final username = raw.toLowerCase().replaceAll('@', '').trim();
    if (!RegExp(r'^[a-z0-9_.]{3,24}$').hasMatch(username)) return false;
    final rows = await _db.from('profiles').select('id').eq('username', username).limit(1);
    return (rows as List).isEmpty;
  }

  Future<void> completeProfile({
    required String username,
    required String displayName,
    required DateTime birthDate,
    required String clubId,
    int? fanSinceYear,
  }) async {
    final user = _db.auth.currentUser;
    if (user == null) throw StateError('Not authenticated');
    await _db.from('profiles').upsert({
      'id': user.id,
      'username': username.toLowerCase().replaceAll('@', '').trim(),
      'display_name': displayName.trim(),
      'birth_date': birthDate.toIso8601String().substring(0, 10),
      'favorite_club_id': clubId,
      'fan_since_year': fanSinceYear,
    });
  }

  Future<Map<String, dynamic>?> myProfile() async {
    final id = _db.auth.currentUser?.id;
    if (id == null) return null;
    return _db.from('profiles').select().eq('id', id).maybeSingle();
  }

  Future<void> changeFavoriteClub(String clubId) async {
    await _db.rpc('change_favorite_club', params: {'new_club_id': clubId});
  }
}
