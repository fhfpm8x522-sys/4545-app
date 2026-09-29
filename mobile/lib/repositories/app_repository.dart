import 'package:supabase_flutter/supabase_flutter.dart';

class AppRepository {
  final SupabaseClient client = Supabase.instance.client;

  // =========================================================
  // MATCHES
  // =========================================================

  Future<List<Map<String, dynamic>>> matches(
    String clubId,
  ) async {
    final rows = await client
        .from('matches')
        .select()
        .or(
          'home_club_id.eq.$clubId,away_club_id.eq.$clubId',
        )
        .order('kickoff', ascending: true);

    return List<Map<String, dynamic>>.from(rows);
  }

  Future<Map<String, dynamic>?> match(
    String matchId,
  ) async {
    final row = await client
        .from('matches')
        .select()
        .eq('id', matchId)
        .maybeSingle();

    if (row == null) return null;

    return Map<String, dynamic>.from(row);
  }

  // =========================================================
  // MATCH EVENTS
  // =========================================================

  Future<List<Map<String, dynamic>>> events(
    String matchId,
  ) async {
    final rows = await client
        .from('match_events')
        .select(
          '''
          *,
          player:players!match_events_player_ref_id_fkey(
            id,
            name,
            name_he,
            image_url,
            goal_name,
            goal_api_id
          ),
          secondary_player:players!match_events_secondary_player_ref_id_fkey(
            id,
            name,
            name_he,
            image_url,
            goal_name,
            goal_api_id
          )
          ''',
        )
        .eq('match_id', matchId)
        .order('minute', ascending: false);

    return List<Map<String, dynamic>>.from(rows);
  }

  // =========================================================
  // PLAYERS
  // =========================================================

  Future<List<Map<String, dynamic>>> players(
    String clubId,
  ) async {
    final rows = await client
        .from('players')
        .select()
        .eq('club_id', clubId)
        .eq('active', true)
        .order('number', ascending: true);

    return List<Map<String, dynamic>>.from(rows);
  }

  // =========================================================
  // PLAYER STATS
  // =========================================================

  Future<List<Map<String, dynamic>>> stats(
    String clubId,
  ) async {
    final rows = await client
        .from('player_season_stats')
        .select(
          '''
          id,
          player_id,
          season,
          appearances,
          goals,
          assists,
          minutes,
          players!inner(
            id,
            club_id,
            name,
            name_he,
            number,
            position,
            nationality,
            image_url
          )
          ''',
        )
        .eq('players.club_id', clubId)
        .order('goals', ascending: false);

    return List<Map<String, dynamic>>.from(rows);
  }

  // =========================================================
  // NEWS
  // =========================================================

  Future<List<Map<String, dynamic>>> news(
    String clubId,
  ) async {
    final rows = await client
        .from('news_items')
        .select()
        .eq('club_id', clubId)
        .eq('status', 'published')
        .order('published_at', ascending: false);

    return List<Map<String, dynamic>>.from(rows);
  }

  // =========================================================
  // HISTORY
  // =========================================================

  Future<List<Map<String, dynamic>>> history(
    String clubId,
  ) async {
    final rows = await client
        .from('club_history')
        .select()
        .eq('club_id', clubId)
        .order('event_date', ascending: false);

    return List<Map<String, dynamic>>.from(rows);
  }

  // =========================================================
  // CHANTS
  // =========================================================

  Future<List<Map<String, dynamic>>> chants(
    String clubId,
  ) async {
    final rows = await client
        .from('chants')
        .select()
        .eq('club_id', clubId)
        .eq('enabled', true)
        .order('sort_order', ascending: true);

    return List<Map<String, dynamic>>.from(rows);
  }

  // =========================================================
  // COMMUNITY
  // =========================================================

  Future<List<Map<String, dynamic>>> posts(
    String clubId,
  ) async {
    final rows = await client
        .from('community_posts')
        .select()
        .eq('club_id', clubId)
        .isFilter('removed_at', null)
        .order('created_at', ascending: false)
        .limit(100);

    final result =
        List<Map<String, dynamic>>.from(rows);

    await _attachPublicProfiles(
      result,
      authorKey: 'author_id',
    );

    return result;
  }

  Future<void> post(
    String clubId,
    String body,
  ) async {
    final user = client.auth.currentUser;

    if (user == null) {
      throw Exception(
        'צריך להתחבר כדי לפרסם ביציע.',
      );
    }

    final clean = body.trim();

    if (clean.isEmpty) return;

    await client.from('community_posts').insert({
      'club_id': clubId,
      'author_id': user.id,
      'body': clean,
    });
  }

  // =========================================================
  // CHAT
  // =========================================================

  Future<List<Map<String, dynamic>>> chat({
    String? club,
    String? match,
  }) async {
    dynamic query = client
        .from('chat_messages')
        .select()
        .isFilter('removed_at', null);

    if (match != null) {
      query = query.eq('match_id', match);
    } else if (club != null) {
      query = query
          .eq('club_id', club)
          .isFilter('match_id', null);
    } else {
      return [];
    }

    final rows = await query
        .order(
          'created_at',
          ascending: true,
        )
        .limit(200);

    final messages =
        List<Map<String, dynamic>>.from(rows);

    await _attachPublicProfiles(
      messages,
      authorKey: 'author_id',
    );

    return messages;
  }

  Future<void> message({
    String? club,
    String? match,
    required String body,
  }) async {
    final user = client.auth.currentUser;

    if (user == null) {
      throw Exception(
        'צריך להתחבר כדי לשלוח הודעה.',
      );
    }

    final clean = body.trim();

    if (clean.isEmpty) return;

    if (club == null && match == null) {
      throw Exception('חסר יעד להודעה.');
    }

    await client.from('chat_messages').insert({
      'club_id': club,
      'match_id': match,
      'author_id': user.id,
      'body': clean,
    });
  }

  // =========================================================
  // PREDICTIONS
  // =========================================================

  Future<void> prediction(
    String matchId,
    int homeScore,
    int awayScore,
  ) async {
    final user = client.auth.currentUser;

    if (user == null) {
      throw Exception(
        'צריך להתחבר כדי לשלוח ניחוש.',
      );
    }

    await client.from('predictions').upsert(
      {
        'match_id': matchId,
        'user_id': user.id,
        'home_score': homeScore,
        'away_score': awayScore,
      },
      onConflict: 'match_id,user_id',
    );
  }

  Future<List<Map<String, dynamic>>>
      myPredictions() async {
    final user = client.auth.currentUser;

    if (user == null) return [];

    final rows = await client
        .from('predictions')
        .select(
          '''
          match_id,
          user_id,
          home_score,
          away_score,
          created_at,
          matches(
            id,
            competition,
            home_name,
            away_name,
            home_score,
            away_score,
            kickoff,
            stadium,
            status
          )
          ''',
        )
        .eq('user_id', user.id)
        .order(
          'created_at',
          ascending: false,
        );

    return List<Map<String, dynamic>>.from(rows);
  }

  // =========================================================
  // ATTENDANCE
  // =========================================================

  Future<void> attendance(
    String matchId,
  ) async {
    final user = client.auth.currentUser;

    if (user == null) {
      throw Exception(
        'צריך להתחבר כדי לסמן שהיית במשחק.',
      );
    }

    await client.from('match_attendance').upsert(
      {
        'match_id': matchId,
        'user_id': user.id,
      },
      onConflict: 'match_id,user_id',
    );
  }

  Future<List<Map<String, dynamic>>>
      myAttendance() async {
    final user = client.auth.currentUser;

    if (user == null) return [];

    final rows = await client
        .from('match_attendance')
        .select(
          '''
          match_id,
          user_id,
          created_at,
          matches(
            id,
            competition,
            home_name,
            away_name,
            home_score,
            away_score,
            kickoff,
            stadium,
            status
          )
          ''',
        )
        .eq('user_id', user.id)
        .order(
          'created_at',
          ascending: false,
        );

    return List<Map<String, dynamic>>.from(rows);
  }

  // =========================================================
  // POLLS
  // =========================================================

  Future<void> vote({
    required String pollId,
    required int optionIndex,
  }) async {
    final user = client.auth.currentUser;

    if (user == null) {
      throw Exception(
        'צריך להתחבר כדי להצביע.',
      );
    }

    await client.from('poll_votes').upsert(
      {
        'poll_id': pollId,
        'user_id': user.id,
        'option_index': optionIndex,
      },
      onConflict: 'poll_id,user_id',
    );
  }

  // =========================================================
  // PROFILE
  // =========================================================

  Future<Map<String, dynamic>?> profile() async {
    final user = client.auth.currentUser;

    if (user == null) return null;

    final row = await client
        .from('profiles')
        .select()
        .eq('id', user.id)
        .maybeSingle();

    if (row == null) return null;

    return Map<String, dynamic>.from(row);
  }

  // =========================================================
  // SAFE PUBLIC PROFILES
  // =========================================================

  Future<void> _attachPublicProfiles(
    List<Map<String, dynamic>> items, {
    required String authorKey,
  }) async {
    final ids = items
        .map(
          (item) =>
              item[authorKey]?.toString(),
        )
        .whereType<String>()
        .where((id) => id.isNotEmpty)
        .toSet()
        .toList();

    if (ids.isEmpty) return;

    final result = await client.rpc(
      'get_public_profiles',
      params: {
        'p_user_ids': ids,
      },
    );

    if (result == null) return;

    final profiles =
        List<Map<String, dynamic>>.from(
      result,
    );

    final byId =
        <String, Map<String, dynamic>>{
      for (final profile in profiles)
        profile['id'].toString():
            profile,
    };

    for (final item in items) {
      final id =
          item[authorKey]?.toString();

      if (id != null) {
        item['profiles'] = byId[id];
      }
    }
  }
}
