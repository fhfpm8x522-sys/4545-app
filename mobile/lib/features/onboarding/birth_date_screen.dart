import 'package:flutter/material.dart';
import 'team_select_screen.dart';

class BirthDateScreen extends StatefulWidget {
  final String displayName, username; final bool offlineMode;
  const BirthDateScreen({super.key,required this.displayName,required this.username,this.offlineMode=false});
  @override State<BirthDateScreen> createState()=>_BirthDateScreenState();
}
class _BirthDateScreenState extends State<BirthDateScreen>{
  DateTime? date;
  @override Widget build(BuildContext context)=>Scaffold(appBar:AppBar(title:const Text('תאריך לידה')),body:Padding(padding:const EdgeInsets.all(24),child:Column(crossAxisAlignment:CrossAxisAlignment.stretch,children:[
    const Text('מתי נולדת?',style:TextStyle(fontSize:30,fontWeight:FontWeight.w900)),const SizedBox(height:8),
    const Text('התאריך נשאר פרטי ולא יוצג בפרופיל.',style:TextStyle(color:Colors.white60)),const SizedBox(height:28),
    OutlinedButton(onPressed:()async{final d=await showDatePicker(context:context,firstDate:DateTime(1940),lastDate:DateTime.now(),initialDate:DateTime(2005));if(d!=null)setState(()=>date=d);},child:Padding(padding:const EdgeInsets.all(18),child:Text(date==null?'בחירת תאריך':'${date!.day}/${date!.month}/${date!.year}'))),
    const Spacer(),FilledButton(onPressed:date==null?null:()=>Navigator.push(context,MaterialPageRoute(builder:(_)=>TeamSelectScreen(displayName:widget.displayName,username:widget.username,birthDate:date!,offlineMode:widget.offlineMode))),child:const Padding(padding:EdgeInsets.all(16),child:Text('המשך')))
  ])));
}
