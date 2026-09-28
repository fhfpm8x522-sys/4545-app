import 'package:supabase_flutter/supabase_flutter.dart';
class AppRepository{
 SupabaseClient get db=>Supabase.instance.client;
 List<Map<String,dynamic>> maps(dynamic x)=>(x as List).map((e)=>Map<String,dynamic>.from(e)).toList();
 Future<List<Map<String,dynamic>>> matches(String club)async=>maps(await db.from('matches').select().or('home_club_id.eq.$club,away_club_id.eq.$club').order('kickoff',ascending:false).limit(100));
 Future<Map<String,dynamic>> match(String id)async=>Map<String,dynamic>.from(await db.from('matches').select().eq('id',id).single());
 Future<List<Map<String,dynamic>>> events(String id)async=>maps(await db.from('match_events').select().eq('match_id',id).order('minute'));
 Future<List<Map<String,dynamic>>> players(String club)async=>maps(await db.from('players').select().eq('club_id',club).eq('active',true).order('number'));
 Future<List<Map<String,dynamic>>> stats(String club)async=>maps(await db.from('player_season_stats').select('*,players!inner(id,name,number,position,club_id)').eq('players.club_id',club).order('goals',ascending:false));
 Future<List<Map<String,dynamic>>> news(String club)async=>maps(await db.from('news_items').select().eq('club_id',club).eq('status','published').order('published_at',ascending:false).limit(100));
 Future<List<Map<String,dynamic>>> history(String club)async=>maps(await db.from('club_history').select().eq('club_id',club).order('event_date',ascending:false));
 Future<List<Map<String,dynamic>>> chants(String club)async=>maps(await db.from('chants').select().eq('club_id',club).eq('enabled',true).order('sort_order'));
 Future<List<Map<String,dynamic>>> posts(String club)async=>maps(await db.from('community_posts').select('*,profiles!community_posts_author_id_fkey(username,display_name)').eq('club_id',club).isFilter('removed_at',null).order('created_at',ascending:false).limit(100));
 Future<List<Map<String,dynamic>>> chat({String? club,String? match})async{var q=db.from('chat_messages').select('*,profiles!chat_messages_author_id_fkey(username,display_name)').isFilter('removed_at',null);if(match!=null)q=q.eq('match_id',match);else q=q.eq('club_id',club!);return maps(await q.order('created_at',ascending:false).limit(150));}
 Future<void> post(String club,String body)async{final u=db.auth.currentUser;if(u==null)throw Exception('צריך להתחבר');await db.from('community_posts').insert({'club_id':club,'author_id':u.id,'body':body.trim()});}
 Future<void> message({String? club,String? match,required String body})async{final u=db.auth.currentUser;if(u==null)throw Exception('צריך להתחבר');await db.from('chat_messages').insert({'club_id':club,'match_id':match,'author_id':u.id,'body':body.trim()});}
 Future<void> prediction(String match,int h,int a)async{final u=db.auth.currentUser;if(u==null)throw Exception('צריך להתחבר');await db.from('predictions').upsert({'match_id':match,'user_id':u.id,'home_score':h,'away_score':a});}
 Future<void> attendance(String match)async{final u=db.auth.currentUser;if(u==null)throw Exception('צריך להתחבר');await db.from('match_attendance').upsert({'match_id':match,'user_id':u.id});}
 Future<void> vote(String poll,int option)async{final u=db.auth.currentUser;if(u==null)throw Exception('צריך להתחבר');await db.from('poll_votes').upsert({'poll_id':poll,'user_id':u.id,'option_index':option});}
 Future<Map<String,dynamic>> profile()async{final u=db.auth.currentUser;if(u==null)return{};return Map<String,dynamic>.from(await db.from('profiles').select().eq('id',u.id).single());}
 Future<List<Map<String,dynamic>>> myPredictions()async{final u=db.auth.currentUser;if(u==null)return[];return maps(await db.from('predictions').select('*,matches(*)').eq('user_id',u.id).order('created_at',ascending:false));}
 Future<List<Map<String,dynamic>>> myAttendance()async{final u=db.auth.currentUser;if(u==null)return[];return maps(await db.from('match_attendance').select('*,matches(*)').eq('user_id',u.id).order('created_at',ascending:false));}
}