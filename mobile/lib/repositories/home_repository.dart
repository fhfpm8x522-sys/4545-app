import 'package:supabase_flutter/supabase_flutter.dart';
import '../models/club.dart';

class HomeRepository {
  SupabaseClient get _db => Supabase.instance.client;

  Future<Map<String, dynamic>?> nextMatch(Club club) async {
    final now = DateTime.now().toUtc().toIso8601String();
    final rows = await _db.from('matches').select().or('home_club_id.eq.${club.id},away_club_id.eq.${club.id}').gte('kickoff', now).inFilter('status', ['scheduled','live']).order('kickoff').limit(1);
    return (rows as List).isEmpty ? null : Map<String,dynamic>.from(rows.first);
  }

  Future<List<Map<String, dynamic>>> latestNews(Club club) async {
    final rows = await _db.from('news_items').select().eq('club_id', club.id).eq('status','published').order('published_at', ascending:false).limit(4);
    return (rows as List).map((x)=>Map<String,dynamic>.from(x)).toList();
  }

  Future<Map<String, dynamic>?> activePoll(Club club) async {
    final rows = await _db.from('polls').select().eq('club_id',club.id).eq('status','published').order('created_at',ascending:false).limit(1);
    return (rows as List).isEmpty ? null : Map<String,dynamic>.from(rows.first);
  }

  Future<Map<String, dynamic>?> todayHistory(Club club) async {
    final now=DateTime.now();
    final rows=await _db.from('club_history').select().eq('club_id',club.id).order('event_date',ascending:false).limit(50);
    for(final raw in (rows as List)){
      final x=Map<String,dynamic>.from(raw);
      final d=DateTime.tryParse(x['event_date']?.toString()??'');
      if(d!=null && d.month==now.month && d.day==now.day) return x;
    }
    return null;
  }

  Future<Map<String,dynamic>> load(Club club) async {
    final result=await Future.wait([nextMatch(club),latestNews(club),activePoll(club),todayHistory(club)]);
    return {'match':result[0],'news':result[1],'poll':result[2],'history':result[3]};
  }
}
