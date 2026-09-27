import 'package:flutter/material.dart';
import 'club.dart';

enum MatchState { upcoming, live, finished }
class MatchItem { final String id,competition,round,stadium,home,away; final DateTime kickoff; final MatchState state; final int? homeScore,awayScore,minute; const MatchItem({required this.id,required this.competition,required this.round,required this.stadium,required this.home,required this.away,required this.kickoff,this.state=MatchState.upcoming,this.homeScore,this.awayScore,this.minute}); }
class NewsItem { final String id,title,summary,source,category; final DateTime publishedAt; final bool official; const NewsItem({required this.id,required this.title,required this.summary,required this.source,required this.category,required this.publishedAt,this.official=false}); }
class PlayerItem { final String name,position,nationality; final int number,apps,goals,assists; const PlayerItem(this.name,this.position,this.number,{this.nationality='ישראל',this.apps=0,this.goals=0,this.assists=0}); }
class ChantItem { final String id,line; final bool enabled; const ChantItem(this.id,this.line,{this.enabled=true}); }
class CommunityPost { final String author,username,text; final DateTime time; final int likes,comments; final bool staff; const CommunityPost(this.author,this.username,this.text,this.time,{this.likes=0,this.comments=0,this.staff=false}); }
class PollItem { final String question; final List<String> options; const PollItem(this.question,this.options); }

List<MatchItem> demoMatches(Club c){final n=DateTime.now();return [
 MatchItem(id:'m1',competition:'ליגת העל',round:'מחזור 6',stadium:'אצטדיון הבית',home:c.name,away:'מכבי חיפה',kickoff:n.add(const Duration(days:2,hours:4))),
 MatchItem(id:'m2',competition:'ליגת העל',round:'מחזור 7',stadium:'בלומפילד',home:'מכבי תל אביב',away:c.name,kickoff:n.add(const Duration(days:9,hours:2))),
 MatchItem(id:'m0',competition:'ליגת העל',round:'מחזור 5',stadium:'אצטדיון הבית',home:c.name,away:'מכבי נתניה',kickoff:n.subtract(const Duration(days:5)),state:MatchState.finished,homeScore:2,awayScore:1),
];}
List<NewsItem> demoNews(Club c)=>[
 NewsItem(id:'n1',title:'עדכון רשמי מ${c.name}',summary:'כאן יופיע תוכן שאושר לפרסום במערכת הניהול של 45:45.',source:'האתר הרשמי',category:'הקבוצה',publishedAt:DateTime.now().subtract(const Duration(minutes:18)),official:true),
 NewsItem(id:'n2',title:'ההכנות למשחק הבא נמשכות',summary:'45:45 מרכזת את הדיווחים, שומרת את המקורות ומציגה רק תוכן שעבר אישור.',source:'מערכת 45:45',category:'הרכבים',publishedAt:DateTime.now().subtract(const Duration(hours:2))),
 NewsItem(id:'n3',title:'חלון ההעברות: כל העדכונים במקום אחד',summary:'שמועות נשארות מסומנות כשמועות עד שיש אישור רשמי.',source:'מספר מקורות',category:'העברות',publishedAt:DateTime.now().subtract(const Duration(hours:5))),
];
List<PlayerItem> demoPlayers()=>const [PlayerItem('שוער ראשון','שוער',1,apps:5),PlayerItem('בלם הקבוצה','הגנה',4,apps:5,goals:1),PlayerItem('קשר מרכזי','קישור',8,apps:5,assists:2),PlayerItem('מלך השערים','התקפה',9,apps:5,goals:4,assists:1),PlayerItem('שחקן כנף','התקפה',11,apps:4,goals:2,assists:2)];
