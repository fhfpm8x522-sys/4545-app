import 'package:flutter/material.dart';
import '../../models/club.dart';
import '../../repositories/home_repository.dart';

class HomeScreen extends StatefulWidget {
  final Club club;
  const HomeScreen({super.key, required this.club});
  @override State<HomeScreen> createState()=>_HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen>{
  late Future<Map<String,dynamic>> data;
  @override void initState(){super.initState();data=HomeRepository().load(widget.club);}
  Future<void> refresh() async {setState(()=>data=HomeRepository().load(widget.club));await data;}

  String fmtKickoff(dynamic value){
    final d=DateTime.tryParse(value?.toString()??'')?.toLocal();
    if(d==null)return 'מועד טרם נקבע';
    String two(int n)=>n.toString().padLeft(2,'0');
    return '${two(d.day)}/${two(d.month)} • ${two(d.hour)}:${two(d.minute)}';
  }

  Widget empty(String title,String text)=>Container(
    padding:const EdgeInsets.all(18),
    decoration:BoxDecoration(color:Colors.white.withValues(alpha:.04),borderRadius:BorderRadius.circular(20)),
    child:Column(crossAxisAlignment:CrossAxisAlignment.start,children:[
      Text(title,style:const TextStyle(fontSize:19,fontWeight:FontWeight.w900)),
      const SizedBox(height:6),Text(text,style:const TextStyle(color:Colors.white60))
    ])
  );

  @override Widget build(BuildContext context)=>SafeArea(child:FutureBuilder<Map<String,dynamic>>(
    future:data,builder:(context,s){
      if(s.connectionState==ConnectionState.waiting)return const Center(child:CircularProgressIndicator());
      if(s.hasError)return RefreshIndicator(onRefresh:refresh,child:ListView(physics:const AlwaysScrollableScrollPhysics(),padding:const EdgeInsets.all(24),children:[
        const SizedBox(height:120),const Icon(Icons.cloud_off_outlined,size:48),const SizedBox(height:16),
        const Text('לא הצלחנו לטעון את הבית',textAlign:TextAlign.center,style:TextStyle(fontSize:22,fontWeight:FontWeight.w900)),
        const SizedBox(height:8),const Text('משוך למטה כדי לנסות שוב.',textAlign:TextAlign.center,style:TextStyle(color:Colors.white60))
      ]));
      final d=s.data!; final match=d['match'] as Map<String,dynamic>?; final news=(d['news'] as List).cast<Map<String,dynamic>>();
      final poll=d['poll'] as Map<String,dynamic>?; final history=d['history'] as Map<String,dynamic>?;
      return RefreshIndicator(onRefresh:refresh,child:ListView(physics:const AlwaysScrollableScrollPhysics(),padding:const EdgeInsets.all(18),children:[
        Row(children:[const Text('45:45',textDirection:TextDirection.ltr,style:TextStyle(fontSize:28,fontWeight:FontWeight.w900)),const Spacer(),IconButton(onPressed:(){},icon:const Icon(Icons.notifications_none)),CircleAvatar(backgroundColor:widget.club.accent,child:Text(widget.club.shortName.characters.first,style:const TextStyle(fontWeight:FontWeight.w900)))]),
        const SizedBox(height:18),Text('הקבוצה שלי',style:TextStyle(color:widget.club.accent,fontWeight:FontWeight.w800)),Text(widget.club.name,style:const TextStyle(fontSize:32,fontWeight:FontWeight.w900)),const SizedBox(height:18),
        if(match!=null)Container(padding:const EdgeInsets.all(20),decoration:BoxDecoration(borderRadius:BorderRadius.circular(24),gradient:LinearGradient(colors:[widget.club.accent.withValues(alpha:.35),const Color(0xFF111317)]),border:Border.all(color:widget.club.accent.withValues(alpha:.35))),child:Column(crossAxisAlignment:CrossAxisAlignment.start,children:[
          const Text('המשחק הבא',style:TextStyle(fontSize:22,fontWeight:FontWeight.w900)),const SizedBox(height:12),
          Text('${match['home_name']??'קבוצת בית'}  VS  ${match['away_name']??'קבוצת חוץ'}',style:const TextStyle(fontSize:18,fontWeight:FontWeight.w800)),
          const SizedBox(height:6),Text('${match['competition']??''} • ${match['round_name']??''}',style:const TextStyle(color:Colors.white60)),
          const SizedBox(height:4),Text('${fmtKickoff(match['kickoff'])}${match['stadium']!=null?' • ${match['stadium']}':''}',style:const TextStyle(color:Colors.white70)),
          const SizedBox(height:16),Text('MATCH CENTER',style:TextStyle(color:widget.club.accent,fontWeight:FontWeight.w900))
        ])) else empty('המשחק הבא','אין כרגע משחק עתידי שפורסם במערכת.'),
        const SizedBox(height:14),empty('45:45 עכשיו','העדכונים החשובים של ${widget.club.name} יופיעו כאן.'),
        const SizedBox(height:18),const Text('חדשות אחרונות',style:TextStyle(fontSize:22,fontWeight:FontWeight.w900)),const SizedBox(height:8),
        if(news.isEmpty) empty('אין חדשות שפורסמו','ברגע שעורך יאשר כתבה במערכת הניהול, היא תופיע כאן.')
        else ...news.map((n)=>Card(child:ListTile(leading:Icon(n['official']==true?Icons.verified:Icons.newspaper),title:Text(n['title']?.toString()??''),subtitle:Text('${n['source_name']??'מקור'}${n['category']!=null?' • ${n['category']}':''}')))),
        const SizedBox(height:14),
        if(poll==null) empty('סקר היציע','אין כרגע סקר פעיל.') else empty('סקר היציע',poll['question']?.toString()??''),
        const SizedBox(height:14),
        if(history==null) empty('היום במועדון','אין אירוע היסטורי שהוגדר לתאריך הזה.') else empty('היום במועדון',history['title']?.toString()??''),
        const SizedBox(height:24),
      ]));
    }
  ));
}
