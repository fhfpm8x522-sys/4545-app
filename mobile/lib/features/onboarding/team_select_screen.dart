import 'package:flutter/material.dart';
import '../../core/config.dart';
import '../../models/club.dart';
import '../../data/session_store.dart';
import '../../repositories/club_repository.dart';
import '../../repositories/profile_repository.dart';
import '../home/home_shell.dart';

class TeamSelectScreen extends StatefulWidget{
  final String displayName,username; final DateTime birthDate; final bool offlineMode;
  const TeamSelectScreen({super.key,required this.displayName,required this.username,required this.birthDate,this.offlineMode=false});
  @override State<TeamSelectScreen> createState()=>_S();
}
class _S extends State<TeamSelectScreen>{
  Club? selected; int? fanSince; bool busy=false; late Future<List<Club>> clubs;
  @override void initState(){super.initState();clubs=(widget.offlineMode||!AppConfig.hasSupabase)?Future.value(demoClubs):ClubRepository().activeClubs();}
  Future<void> finish() async { if(selected==null)return;setState(()=>busy=true);try{
    if(widget.offlineMode||!AppConfig.hasSupabase){await SessionStore().saveProfile(username:widget.username,displayName:widget.displayName,clubId:selected!.id);}
    else {await ProfileRepository().completeProfile(username:widget.username,displayName:widget.displayName,birthDate:widget.birthDate,clubId:selected!.id,fanSinceYear:fanSince);}
    if(mounted)Navigator.pushAndRemoveUntil(context,MaterialPageRoute(builder:(_)=>HomeShell(club:selected!,displayName:widget.displayName,username:widget.username)),(_)=>false);
  }catch(e){if(mounted)ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content:Text('לא הצלחנו לשמור את הפרופיל. נסה שוב.')));}finally{if(mounted)setState(()=>busy=false);}}
  @override Widget build(BuildContext c)=>Scaffold(appBar:AppBar(),body:Padding(padding:const EdgeInsets.all(20),child:Column(children:[
    const Text('איזו קבוצה אתה חי?',style:TextStyle(fontSize:30,fontWeight:FontWeight.w900)),const SizedBox(height:6),const Text('הבחירה הראשונה חופשית. אחר כך ניתן לשנות קבוצה פעם ב־30 יום.',textAlign:TextAlign.center,style:TextStyle(color:Colors.white60)),const SizedBox(height:18),
    Expanded(child:FutureBuilder<List<Club>>(future:clubs,builder:(c,s){if(!s.hasData)return const Center(child:CircularProgressIndicator());return GridView.builder(itemCount:s.data!.length,gridDelegate:const SliverGridDelegateWithFixedCrossAxisCount(crossAxisCount:2,childAspectRatio:1.35,crossAxisSpacing:12,mainAxisSpacing:12),itemBuilder:(_,i){final x=s.data![i];final on=x.id==selected?.id;return InkWell(borderRadius:BorderRadius.circular(20),onTap:()=>setState(()=>selected=x),child:Container(decoration:BoxDecoration(color:const Color(0xFF111317),borderRadius:BorderRadius.circular(20),border:Border.all(color:on?x.accent:Colors.white10,width:on?2:1)),child:Column(mainAxisAlignment:MainAxisAlignment.center,children:[CircleAvatar(backgroundColor:x.accent,radius:20,child:Text(x.shortName.characters.first,style:const TextStyle(color:Colors.white,fontWeight:FontWeight.bold))),const SizedBox(height:9),Text(x.name,textAlign:TextAlign.center,style:const TextStyle(fontWeight:FontWeight.w800))])));});})),
    if(selected!=null)Padding(padding:const EdgeInsets.only(top:12,bottom:10),child:DropdownButtonFormField<int>(decoration:const InputDecoration(labelText:'ממתי אתה אוהד? (אופציונלי)'),value:fanSince,items:[for(int y=DateTime.now().year;y>=1950;y--)DropdownMenuItem(value:y,child:Text('$y'))],onChanged:(v)=>setState(()=>fanSince=v))),
    SizedBox(width:double.infinity,child:FilledButton(onPressed:selected==null||busy?null:finish,child:Padding(padding:const EdgeInsets.all(16),child:Text(busy?'שומר...':'זאת הקבוצה שלי'))))
  ])));
}
