import 'package:shared_preferences/shared_preferences.dart';

class SessionStore {
  static const _username = 'username', _club = 'club', _display = 'display_name';
  Future<void> saveProfile({required String username, required String displayName, required String clubId}) async {
    final p = await SharedPreferences.getInstance();
    await Future.wait([p.setString(_username, username), p.setString(_display, displayName), p.setString(_club, clubId)]);
  }
  Future<({String? username, String? displayName, String? clubId})> load() async {
    final p = await SharedPreferences.getInstance();
    return (username:p.getString(_username), displayName:p.getString(_display), clubId:p.getString(_club));
  }
  Future<void> clear() async => (await SharedPreferences.getInstance()).clear();
}
