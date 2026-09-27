import 'package:flutter/material.dart';
import '../../core/config.dart';
import '../../services/auth_service.dart';
import '../onboarding/profile_setup_screen.dart';
import 'email_auth_screen.dart';

class StartScreen extends StatelessWidget {
  const StartScreen({super.key});
  @override Widget build(BuildContext context) => Scaffold(body:SafeArea(child:Padding(padding:const EdgeInsets.all(24),child:Column(children:[
    const Spacer(),
    const Text('45:45',textDirection:TextDirection.ltr,style:TextStyle(fontSize:64,fontWeight:FontWeight.w900,letterSpacing:-4)),
    const SizedBox(height:8),const Text('חיים את הקבוצה.',style:TextStyle(fontSize:22,fontWeight:FontWeight.w700)),
    const SizedBox(height:8),const Text('הקבוצה שלי. המשחקים שלי. החדשות שלי. היציע שלי.',textAlign:TextAlign.center,style:TextStyle(color:Colors.white60)),
    const Spacer(),
    _social(context,'המשך עם Apple',Colors.white,Colors.black,()=>_oauth(context,true)),const SizedBox(height:10),
    _social(context,'המשך עם Google',const Color(0xFF1A1C20),Colors.white,()=>_oauth(context,false)),const SizedBox(height:10),
    _social(context,'הרשמה עם אימייל',const Color(0xFFFF3434),Colors.white,()=>Navigator.push(context,MaterialPageRoute(builder:(_)=>const EmailAuthScreen()))),
    const SizedBox(height:18),TextButton(onPressed:()=>Navigator.push(context,MaterialPageRoute(builder:(_)=>const EmailAuthScreen(login:true))),child:const Text('כבר יש לי חשבון')),
    if(!AppConfig.hasSupabase) TextButton(onPressed:()=>Navigator.push(context,MaterialPageRoute(builder:(_)=>const ProfileSetupScreen(offlineMode:true))),child:const Text('מצב פיתוח מקומי',style:TextStyle(color:Colors.white38))),
  ]))));
  Widget _social(BuildContext c,String t,Color bg,Color fg,VoidCallback tap)=>SizedBox(width:double.infinity,height:56,child:FilledButton(style:FilledButton.styleFrom(backgroundColor:bg,foregroundColor:fg),onPressed:tap,child:Text(t,style:const TextStyle(fontWeight:FontWeight.w800))));
  Future<void> _oauth(BuildContext c,bool apple) async { if(!AppConfig.hasSupabase){ScaffoldMessenger.of(c).showSnackBar(const SnackBar(content:Text('חבר Supabase כדי להפעיל התחברות חברתית')));return;} apple?await AuthService().signInApple():await AuthService().signInGoogle(); }
}
