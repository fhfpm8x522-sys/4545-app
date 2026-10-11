import 'package:flutter/material.dart';
import '../../models/club.dart';
import '../../repositories/app_repository.dart';

class CommunityScreen extends StatefulWidget {
  final Club club;
  final bool embedded;
  const CommunityScreen({super.key, required this.club, this.embedded = false});
  @override
  State<CommunityScreen> createState() => _CommunityScreenState();
}

class _CommunityScreenState extends State<CommunityScreen> {
  final repository = AppRepository();
  final post = TextEditingController();
  final message = TextEditingController();
  late Future<List<Map<String, dynamic>>> postsFuture;
  late Future<List<Map<String, dynamic>>> chatFuture;
  bool sending = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  void _load() {
    postsFuture = repository.posts(widget.club.id);
    chatFuture = repository.chat(club: widget.club.id);
  }

  Future<void> _refresh() async {
    setState(_load);
    await Future.wait([postsFuture, chatFuture]);
  }

  @override
  void dispose() {
    post.dispose();
    message.dispose();
    super.dispose();
  }

  Future<void> _send(TextEditingController controller, {required bool isPost}) async {
    final text = controller.text.trim();
    if (text.isEmpty || sending) return;
    setState(() => sending = true);
    try {
      if (isPost) {
        await repository.post(widget.club.id, text);
      } else {
        await repository.message(club: widget.club.id, body: text);
      }
      if (!mounted) return;
      controller.clear();
      await _refresh();
    } catch (_) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('הפעולה נכשלה. בדוק שאתה מחובר ונסה שוב.')),
      );
    } finally {
      if (mounted) setState(() => sending = false);
    }
  }

  Widget _items(Future<List<Map<String, dynamic>>> future, {required bool cards}) {
    return FutureBuilder<List<Map<String, dynamic>>>(
      future: future,
      builder: (context, snapshot) {
        if (snapshot.hasError) return const Padding(
          padding: EdgeInsets.all(16),
          child: Text('לא הצלחנו לטעון. משוך למטה כדי לנסות שוב.'),
        );
        if (!snapshot.hasData) return const Center(child: CircularProgressIndicator());
        final items = snapshot.data!;
        if (items.isEmpty) return const Padding(
          padding: EdgeInsets.all(16), child: Text('עדיין אין תוכן ביציע.'),
        );
        return Column(children: items.map((item) {
          final profile = item['profiles'] as Map<String, dynamic>?;
          final tile = ListTile(
            title: Text((profile?['display_name'] ?? profile?['username'] ?? 'אוהד').toString()),
            subtitle: Text(item['body']?.toString() ?? ''),
          );
          return cards ? Card(child: tile) : tile;
        }).toList());
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final body = RefreshIndicator(
      onRefresh: _refresh,
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(18),
        children: [
          if (!widget.embedded) const Text('היציע שלנו',
            style: TextStyle(fontSize: 32, fontWeight: FontWeight.w900)),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: widget.club.accent.withValues(alpha: .14),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Text('הקהילה של אוהדי ${widget.club.name}',
              style: const TextStyle(fontWeight: FontWeight.w800)),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: post, maxLines: 3,
            decoration: InputDecoration(
              hintText: 'מה קורה ביציע?',
              suffixIcon: IconButton(
                icon: const Icon(Icons.send),
                onPressed: sending ? null : () => _send(post, isPost: true),
              ),
            ),
          ),
          _items(postsFuture, cards: true),
          const SizedBox(height: 20),
          const Text('Club Chat', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w900)),
          TextField(
            controller: message,
            decoration: InputDecoration(
              hintText: 'הודעה ליציע...',
              suffixIcon: IconButton(
                icon: const Icon(Icons.send),
                onPressed: sending ? null : () => _send(message, isPost: false),
              ),
            ),
          ),
          _items(chatFuture, cards: false),
        ],
      ),
    );
    return widget.embedded ? body : SafeArea(child: body);
  }
}
