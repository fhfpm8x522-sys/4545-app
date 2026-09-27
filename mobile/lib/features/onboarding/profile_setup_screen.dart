import 'dart:async';
import 'package:flutter/material.dart';
import '../../core/config.dart';
import '../../repositories/profile_repository.dart';
import 'birth_date_screen.dart';

class ProfileSetupScreen extends StatefulWidget { final bool offlineMode; const ProfileSetupScreen({super.key,this.offlineMode=false}); @override State<ProfileSetupScreen> createState()=>_S(); }
class _S extends State<ProfileSetupScreen>{
  final name=TextEditingController(), user=TextEditingController(); Timer? timer; bool? available; bool checking=false;
  @override void dispose(){timer?.cancel();name.dispose();user.dispose();super.dispose();}
  void check(String raw){timer?.cancel();final v=raw.replaceAll('@','').trim();if(v.length<3){setState(()=>available=null);return;} if(widget.offlineMode||!AppConfig.hasSupabase){setState(()=>available=RegExp(r'^[A-Za-z0-9_.]{3,24}$').hasMatch(v));return;} setState(()=>checking=true);timer=Timer(const Duration(milliseconds:450),()async{try{final ok=await ProfileRepository().usernameAvailable(v);if(mounted)setState((){available=ok;checking=false;});}catch(_){if(mounted)setState((){available=null;checking=false;});}});}
  @override Widget build(BuildContext c)=>Scaffold(appBar:AppBar(title:const Text('הפרופיל שלך')),body:Padding(padding:const EdgeInsets.all(24),child:Column(crossAxisAlignment:CrossAxisAlignment.stretch,children:[
    const Text('איך נכיר אותך?',style:TextStyle(fontSize:30,fontWeight:FontWeight.w900)),const SizedBox(height:8),const Text('ה־@username שלך יופיע ביציע, בצ׳אטים ובפרופיל.',style:TextStyle(color:Colors.white60)),const SizedBox(height:28),
    TextField(controller:name,decoration:const InputDecoration(labelText:'שם תצוגה')),const SizedBox(height:14),
    TextField(controller:user,onChanged:check,textDirection:TextDirection.ltr,decoration:InputDecoration(labelText:'@username',hintText:'neorai18',suffixIcon:checking?const Padding(padding:EdgeInsets.all(12),child:CircularProgressIndicator(strokeWidth:2)):available==true?const Icon(Icons.check_circle,color:Colors.green):available==false?const Icon(Icons.cancel,color:Colors.redAccent):null)),
    if(available==false)const Padding(padding:EdgeInsets.only(top:8),child:Text('השם לא זמין או לא תקין',style:TextStyle(color:Colors.redAccent))),const Spacer(),
    FilledButton(onPressed:available==true&&name.text.trim().isNotEmpty?()=>Navigator.push(c,MaterialPageRoute(builder:(_)=>BirthDateScreen(displayName:name.text.trim(),username:user.text.trim().replaceAll('@',''),offlineMode:widget.offlineMode))):null,child:const Padding(padding:EdgeInsets.all(16),child:Text('המשך')))
  ])));
}
