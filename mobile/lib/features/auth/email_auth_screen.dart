import 'package:flutter/material.dart';
import '../../core/config.dart';
import '../../services/auth_service.dart';
import '../onboarding/profile_setup_screen.dart';

class EmailAuthScreen extends StatefulWidget {
  final bool login;
  const EmailAuthScreen({super.key, this.login = false});
  @override State<EmailAuthScreen> createState() => _EmailAuthScreenState();
}
class _EmailAuthScreenState extends State<EmailAuthScreen> {
  final email = TextEditingController(), password = TextEditingController(), confirm = TextEditingController();
  bool busy = false;
  String? error;
  Future<void> submit() async {
    if (!AppConfig.hasSupabase) { setState(() => error='יש להגדיר SUPABASE_URL ו־SUPABASE_ANON_KEY בקובץ .env'); return; }
    if (!widget.login && password.text != confirm.text) { setState(() => error='הסיסמאות לא תואמות'); return; }
    setState(() {busy=true; error=null;});
    try {
      if (widget.login) {
        await AuthService().signInEmail(email.text, password.text);
        if (mounted) Navigator.pushReplacement(context, MaterialPageRoute(builder: (_) => const ProfileSetupScreen()));
      } else {
        final res = await AuthService().signUpEmail(email.text, password.text);
        if (!mounted) return;
        if (res.session == null) {
          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('שלחנו אימות למייל. אחרי האימות חזור להתחברות.')));
        } else {
          Navigator.pushReplacement(context, MaterialPageRoute(builder: (_) => const ProfileSetupScreen()));
        }
      }
    } catch (e) { setState(() => error='לא הצלחנו להתחבר. בדוק את הפרטים ונסה שוב.'); }
    finally { if (mounted) setState(() => busy=false); }
  }
  @override Widget build(BuildContext context) => Scaffold(appBar: AppBar(), body: SafeArea(child: ListView(padding: const EdgeInsets.all(24), children: [
    Text(widget.login?'חזרה ל־45:45':'פותחים חשבון', style: const TextStyle(fontSize:32,fontWeight:FontWeight.w900)),
    const SizedBox(height:24), TextField(controller:email,keyboardType:TextInputType.emailAddress,textDirection:TextDirection.ltr,decoration:const InputDecoration(labelText:'אימייל')),
    const SizedBox(height:12), TextField(controller:password,obscureText:true,textDirection:TextDirection.ltr,decoration:const InputDecoration(labelText:'סיסמה')),
    if(!widget.login)...[const SizedBox(height:12),TextField(controller:confirm,obscureText:true,textDirection:TextDirection.ltr,decoration:const InputDecoration(labelText:'אימות סיסמה'))],
    if(error!=null)...[const SizedBox(height:12),Text(error!,style:const TextStyle(color:Colors.redAccent))],
    const SizedBox(height:22), FilledButton(onPressed:busy?null:submit,child:Padding(padding:const EdgeInsets.all(16),child:Text(busy?'רגע...':widget.login?'התחברות':'הרשמה'))),
  ])));
}
