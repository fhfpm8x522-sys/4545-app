import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'core/config.dart';
import 'core/theme/app_theme.dart';
import 'features/auth/start_screen.dart';
import 'data/session_store.dart';
import 'models/club.dart';
import 'features/home/home_shell.dart';
import 'repositories/club_repository.dart';
import 'repositories/profile_repository.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await dotenv.load(fileName: '.env');
  if (AppConfig.hasSupabase) {
    await Supabase.initialize(url: AppConfig.supabaseUrl, anonKey: AppConfig.supabaseAnonKey);
  }
  runApp(const App());
}
class App extends StatelessWidget{const App({super.key});@override Widget build(BuildContext context)=>MaterialApp(debugShowCheckedModeBanner:false,title:'45:45',theme:AppTheme.dark(),locale:const Locale('he'),supportedLocales:const [Locale('he'),Locale('en')],localizationsDelegates:const [GlobalMaterialLocalizations.delegate,GlobalWidgetsLocalizations.delegate,GlobalCupertinoLocalizations.delegate],home:const Bootstrap());}
class Bootstrap extends StatelessWidget{const Bootstrap({super.key});
  Future<Widget> resolve() async {
    if(AppConfig.hasSupabase && Supabase.instance.client.auth.currentUser!=null){
      final p=await ProfileRepository().myProfile();
      if(p!=null && p['favorite_club_id']!=null){
        final clubs=await ClubRepository().activeClubs();
        final club=clubs.firstWhere((x)=>x.id==p['favorite_club_id'],orElse:()=>clubs.first);
        return HomeShell(club:club,displayName:p['display_name'] as String,username:p['username'] as String);
      }
    }
    final d=await SessionStore().load();
    if(d.username!=null&&d.clubId!=null){final club=demoClubs.firstWhere((x)=>x.id==d.clubId,orElse:()=>demoClubs.first);return HomeShell(club:club,displayName:d.displayName??d.username!,username:d.username!);}
    return const StartScreen();
  }
  @override Widget build(BuildContext c)=>FutureBuilder<Widget>(future:resolve(),builder:(c,s){if(!s.hasData)return const Scaffold(body:Center(child:CircularProgressIndicator()));return s.data!;});
}
