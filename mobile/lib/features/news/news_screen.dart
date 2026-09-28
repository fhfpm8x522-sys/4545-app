import 'package:flutter/material.dart';

import '../../models/club.dart';
import '../../repositories/app_repository.dart';

class NewsScreen extends StatefulWidget {
  final Club club;

  const NewsScreen({
    super.key,
    required this.club,
  });

  @override
  State<NewsScreen> createState() => _NewsScreenState();
}

class _NewsScreenState extends State<NewsScreen> {
  final repository = AppRepository();

  String selectedFilter = 'הכול';

  final filters = const [
    'הכול',
    'הקבוצה',
    'העברות',
    'פציעות',
    'הרכבים',
    'ראיונות',
  ];

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: FutureBuilder<List<Map<String, dynamic>>>(
        future: repository.news(widget.club.id),
        builder: (context, snapshot) {
          if (snapshot.connectionState ==
              ConnectionState.waiting) {
            return const Center(
              child: CircularProgressIndicator(),
            );
          }

          if (snapshot.hasError) {
            return _errorState(
              snapshot.error.toString(),
            );
          }

          final allNews = snapshot.data ?? [];

          final filteredNews = allNews.where((item) {
            if (selectedFilter == 'הכול') {
              return true;
            }

            return item['category'] == selectedFilter;
          }).toList();

          return RefreshIndicator(
            onRefresh: () async {
              setState(() {});
            },
            child: ListView(
              physics:
                  const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.all(18),
              children: [
                _header(),

                const SizedBox(height: 16),

                _filters(),

                const SizedBox(height: 16),

                _shortSummary(),

                const SizedBox(height: 18),

                if (filteredNews.isEmpty)
                  _emptyState()
                else ...[
                  if (filteredNews.isNotEmpty)
                    _mainStory(filteredNews.first),

                  if (filteredNews.length > 1) ...[
                    const SizedBox(height: 20),

                    const Text(
                      'עוד חדשות',
                      style: TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.w900,
                      ),
                    ),

                    const SizedBox(height: 10),

                    ...filteredNews
                        .skip(1)
                        .map(_newsCard),
                  ],
                ],
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _header() {
    return Row(
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment:
                CrossAxisAlignment.start,
            children: [
              const Text(
                'חדשות',
                style: TextStyle(
                  fontSize: 32,
                  fontWeight: FontWeight.w900,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                'כל מה שקורה ב${widget.club.name}',
                style: const TextStyle(
                  color: Colors.white60,
                ),
              ),
            ],
          ),
        ),

        Container(
          width: 46,
          height: 46,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color:
                widget.club.accent.withValues(
              alpha: .15,
            ),
          ),
          child: Icon(
            Icons.newspaper,
            color: widget.club.accent,
          ),
        ),
      ],
    );
  }

  Widget _filters() {
    return SizedBox(
      height: 42,
      child: ListView(
        scrollDirection: Axis.horizontal,
        children: filters.map(
          (filter) {
            return Padding(
              padding:
                  const EdgeInsets.only(left: 7),
              child: ChoiceChip(
                label: Text(filter),
                selected:
                    selectedFilter == filter,
                selectedColor:
                    widget.club.accent.withValues(
                  alpha: .35,
                ),
                onSelected: (_) {
                  setState(() {
                    selectedFilter = filter;
                  });
                },
              ),
            );
          },
        ).toList(),
      ),
    );
  }

  Widget _shortSummary() {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color:
            widget.club.accent.withValues(
          alpha: .12,
        ),
        borderRadius:
            BorderRadius.circular(22),
        border: Border.all(
          color:
              widget.club.accent.withValues(
            alpha: .25,
          ),
        ),
      ),
      child: Row(
        crossAxisAlignment:
            CrossAxisAlignment.start,
        children: [
          Icon(
            Icons.auto_awesome,
            color: widget.club.accent,
          ),

          const SizedBox(width: 12),

          const Expanded(
            child: Column(
              crossAxisAlignment:
                  CrossAxisAlignment.start,
              children: [
                Text(
                  '45:45 בקצרה',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight:
                        FontWeight.w900,
                  ),
                ),
                SizedBox(height: 5),
                Text(
                  'כאן יופיעו תקצירים של דיווחים ממספר מקורות. '
                  'חדשות מתפרסמות באפליקציה רק לאחר אישור אנושי במערכת הניהול.',
                  style: TextStyle(
                    color: Colors.white70,
                    height: 1.4,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _mainStory(
    Map<String, dynamic> article,
  ) {
    final imageUrl =
        article['image_url']?.toString();

    return GestureDetector(
      onTap: () {
        _openArticle(article);
      },
      child: Container(
        clipBehavior: Clip.antiAlias,
        decoration: BoxDecoration(
          color: const Color(0xFF111317),
          borderRadius:
              BorderRadius.circular(26),
        ),
        child: Column(
          crossAxisAlignment:
              CrossAxisAlignment.start,
          children: [
            if (imageUrl != null &&
                imageUrl.isNotEmpty)
              AspectRatio(
                aspectRatio: 16 / 9,
                child: Image.network(
                  imageUrl,
                  fit: BoxFit.cover,
                  errorBuilder:
                      (_, __, ___) =>
                          _imagePlaceholder(),
                ),
              )
            else
              _imagePlaceholder(),

            Padding(
              padding:
                  const EdgeInsets.all(18),
              child: Column(
                crossAxisAlignment:
                    CrossAxisAlignment.start,
                children: [
                  _articleLabels(article),

                  const SizedBox(height: 8),

                  Text(
                    article['title']
                            ?.toString() ??
                        '',
                    style: const TextStyle(
                      fontSize: 22,
                      fontWeight:
                          FontWeight.w900,
                      height: 1.2,
                    ),
                  ),

                  if (article['summary'] !=
                      null) ...[
                    const SizedBox(height: 10),
                    Text(
                      article['summary']
                          .toString(),
                      maxLines: 4,
                      overflow:
                          TextOverflow.ellipsis,
                      style:
                          const TextStyle(
                        color:
                            Colors.white70,
                        height: 1.4,
                      ),
                    ),
                  ],

                  const SizedBox(height: 12),

                  _source(article),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _newsCard(
    Map<String, dynamic> article,
  ) {
    final imageUrl =
        article['image_url']?.toString();

    return Card(
      margin:
          const EdgeInsets.only(bottom: 10),
      child: InkWell(
        borderRadius:
            BorderRadius.circular(22),
        onTap: () {
          _openArticle(article);
        },
        child: Padding(
          padding:
              const EdgeInsets.all(14),
          child: Row(
            crossAxisAlignment:
                CrossAxisAlignment.start,
            children: [
              if (imageUrl != null &&
                  imageUrl.isNotEmpty)
                ClipRRect(
                  borderRadius:
                      BorderRadius.circular(14),
                  child: Image.network(
                    imageUrl,
                    width: 92,
                    height: 92,
                    fit: BoxFit.cover,
                    errorBuilder:
                        (_, __, ___) =>
                            _smallPlaceholder(),
                  ),
                )
              else
                _smallPlaceholder(),

              const SizedBox(width: 13),

              Expanded(
                child: Column(
                  crossAxisAlignment:
                      CrossAxisAlignment.start,
                  children: [
                    _articleLabels(article),

                    const SizedBox(height: 6),

                    Text(
                      article['title']
                              ?.toString() ??
                          '',
                      maxLines: 3,
                      overflow:
                          TextOverflow.ellipsis,
                      style:
                          const TextStyle(
                        fontSize: 16,
                        fontWeight:
                            FontWeight.w900,
                      ),
                    ),

                    const SizedBox(height: 8),

                    _source(article),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _articleLabels(
    Map<String, dynamic> article,
  ) {
    return Wrap(
      spacing: 6,
      runSpacing: 6,
      children: [
        if (article['official'] == true)
          _label(
            'הודעה רשמית',
            widget.club.accent,
          ),

        if (article['category'] != null)
          _label(
            article['category'].toString(),
            Colors.white24,
          ),
      ],
    );
  }

  Widget _label(
    String text,
    Color color,
  ) {
    return Container(
      padding:
          const EdgeInsets.symmetric(
        horizontal: 9,
        vertical: 5,
      ),
      decoration: BoxDecoration(
        color: color.withValues(alpha: .20),
        borderRadius:
            BorderRadius.circular(100),
      ),
      child: Text(
        text,
        style: TextStyle(
          color: color == Colors.white24
              ? Colors.white70
              : color,
          fontSize: 11,
          fontWeight: FontWeight.w900,
        ),
      ),
    );
  }

  Widget _source(
    Map<String, dynamic> article,
  ) {
    return Row(
      children: [
        const Icon(
          Icons.public,
          size: 14,
          color: Colors.white38,
        ),
        const SizedBox(width: 5),
        Expanded(
          child: Text(
            article['source_name']
                    ?.toString() ??
                '45:45',
            maxLines: 1,
            overflow:
                TextOverflow.ellipsis,
            style: const TextStyle(
              color: Colors.white38,
              fontSize: 12,
            ),
          ),
        ),
      ],
    );
  }

  void _openArticle(
    Map<String, dynamic> article,
  ) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => NewsArticleScreen(
          article: article,
          club: widget.club,
        ),
      ),
    );
  }

  Widget _imagePlaceholder() {
    return Container(
      height: 190,
      color: Colors.white10,
      alignment: Alignment.center,
      child: Icon(
        Icons.sports_soccer,
        size: 52,
        color: widget.club.accent,
      ),
    );
  }

  Widget _smallPlaceholder() {
    return Container(
      width: 92,
      height: 92,
      decoration: BoxDecoration(
        color: Colors.white10,
        borderRadius:
            BorderRadius.circular(14),
      ),
      alignment: Alignment.center,
      child: Icon(
        Icons.sports_soccer,
        color: widget.club.accent,
      ),
    );
  }

  Widget _emptyState() {
    return const Card(
      child: Padding(
        padding: EdgeInsets.all(24),
        child: Column(
          children: [
            Icon(
              Icons.newspaper_outlined,
              size: 42,
              color: Colors.white38,
            ),
            SizedBox(height: 10),
            Text(
              'אין כרגע חדשות שפורסמו.',
              style: TextStyle(
                fontWeight: FontWeight.w800,
              ),
            ),
            SizedBox(height: 5),
            Text(
              'כתבות שאושרו ופורסמו דרך ה־Admin יופיעו כאן.',
              textAlign: TextAlign.center,
              style: TextStyle(
                color: Colors.white54,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _errorState(
    String error,
  ) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize:
              MainAxisSize.min,
          children: [
            const Icon(
              Icons.error_outline,
              size: 42,
            ),
            const SizedBox(height: 10),
            const Text(
              'לא הצלחנו לטעון את החדשות.',
              style: TextStyle(
                fontWeight: FontWeight.w900,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              error,
              textAlign: TextAlign.center,
              style: const TextStyle(
                color: Colors.white38,
                fontSize: 12,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class NewsArticleScreen
    extends StatelessWidget {
  final Map<String, dynamic> article;
  final Club club;

  const NewsArticleScreen({
    super.key,
    required this.article,
    required this.club,
  });

  @override
  Widget build(BuildContext context) {
    final imageUrl =
        article['image_url']?.toString();

    return Scaffold(
      appBar: AppBar(
        title: const Text('45:45'),
      ),
      body: ListView(
        padding:
            const EdgeInsets.only(
          bottom: 30,
        ),
        children: [
          if (imageUrl != null &&
              imageUrl.isNotEmpty)
            Image.network(
              imageUrl,
              height: 230,
              width: double.infinity,
              fit: BoxFit.cover,
              errorBuilder:
                  (_, __, ___) =>
                      const SizedBox(),
            ),

          Padding(
            padding:
                const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment:
                  CrossAxisAlignment.start,
              children: [
                if (article['official'] ==
                    true)
                  Container(
                    padding:
                        const EdgeInsets.symmetric(
                      horizontal: 10,
                      vertical: 6,
                    ),
                    decoration:
                        BoxDecoration(
                      color: club.accent
                          .withValues(
                        alpha: .18,
                      ),
                      borderRadius:
                          BorderRadius.circular(
                        100,
                      ),
                    ),
                    child: Text(
                      'הודעה רשמית',
                      style: TextStyle(
                        color: club.accent,
                        fontWeight:
                            FontWeight.w900,
                      ),
                    ),
                  ),

                const SizedBox(height: 12),

                Text(
                  article['title']
                          ?.toString() ??
                      '',
                  style: const TextStyle(
                    fontSize: 28,
                    height: 1.2,
                    fontWeight:
                        FontWeight.w900,
                  ),
                ),

                const SizedBox(height: 10),

                Text(
                  article['source_name']
                          ?.toString() ??
                      '',
                  style: TextStyle(
                    color: club.accent,
                    fontWeight:
                        FontWeight.w800,
                  ),
                ),

                const SizedBox(height: 20),

                Text(
                  article['summary']
                          ?.toString() ??
                      'אין תקציר לכתבה.',
                  style: const TextStyle(
                    fontSize: 17,
                    height: 1.6,
                    color: Colors.white70,
                  ),
                ),

                if (article['source_url'] !=
                    null) ...[
                  const SizedBox(height: 24),

                  const Card(
                    child: Padding(
                      padding:
                          EdgeInsets.all(16),
                      child: Row(
                        children: [
                          Icon(
                            Icons.link,
                          ),
                          SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              'קישור המקור נשמר עם הכתבה במערכת.',
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}
