import 'package:supabase_flutter/supabase_flutter.dart';

class AuthService {
  SupabaseClient get _db => Supabase.instance.client;
  User? get currentUser => _db.auth.currentUser;

  Future<AuthResponse> signUpEmail(String email, String password) =>
      _db.auth.signUp(email: email.trim(), password: password);
  Future<AuthResponse> signInEmail(String email, String password) =>
      _db.auth.signInWithPassword(email: email.trim(), password: password);
  Future<void> signOut() => _db.auth.signOut();

  Future<void> signInGoogle() => _db.auth.signInWithOAuth(
        OAuthProvider.google,
        redirectTo: 'io.stargoal.4545://login-callback',
      );
  Future<void> signInApple() => _db.auth.signInWithOAuth(
        OAuthProvider.apple,
        redirectTo: 'io.stargoal.4545://login-callback',
      );
}
