import 'dart:math';
import 'package:flutter/material.dart';

class ListPage extends StatefulWidget {
  const ListPage({super.key});

  @override
  State<ListPage> createState() => _ListPageState();
}

class _ListPageState extends State<ListPage> {
  List<_Item> _items = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadItems();
  }

  Future<void> _loadItems() async {
    setState(() => _isLoading = true);

    // 模拟网络请求延迟
    await Future.delayed(const Duration(seconds: 1));

    final random = Random();
    final icons = [
      Icons.star,
      Icons.favorite,
      Icons.bolt,
      Icons.local_fire_department,
      Icons.emoji_nature,
      Icons.cloud,
      Icons.music_note,
      Icons.palette,
      Icons.rocket_launch,
      Icons.code,
    ];
    final colors = [
      Colors.red,
      Colors.blue,
      Colors.green,
      Colors.orange,
      Colors.purple,
      Colors.teal,
      Colors.pink,
      Colors.indigo,
      Colors.amber,
      Colors.cyan,
    ];

    setState(() {
      _items = List.generate(20, (index) {
        final colorIdx = random.nextInt(colors.length);
        return _Item(
          id: index,
          title: '项目 ${index + 1}',
          subtitle: '这是第 ${index + 1} 个项目的描述',
          icon: icons[random.nextInt(icons.length)],
          color: colors[colorIdx],
        );
      });
      _isLoading = false;
    });
  }

  void _removeItem(int index) {
    final removed = _items[index];
    setState(() => _items.removeAt(index));

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('已删除 "${removed.title}"'),
        action: SnackBarAction(
          label: '撤销',
          onPressed: () {
            setState(() => _items.insert(index, removed));
          },
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('列表展示'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadItems,
            tooltip: '重新加载',
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _loadItems,
              child: _items.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            Icons.inbox_outlined,
                            size: 64,
                            color: Theme.of(context).colorScheme.outline,
                          ),
                          const SizedBox(height: 16),
                          Text(
                            '列表为空',
                            style: Theme.of(context).textTheme.titleMedium,
                          ),
                          const SizedBox(height: 8),
                          FilledButton.tonal(
                            onPressed: _loadItems,
                            child: const Text('重新加载'),
                          ),
                        ],
                      ),
                    )
                  : ListView.builder(
                      padding: const EdgeInsets.all(8),
                      itemCount: _items.length,
                      itemBuilder: (context, index) {
                        final item = _items[index];
                        return Dismissible(
                          key: ValueKey(item.id),
                          direction: DismissDirection.endToStart,
                          background: Container(
                            alignment: Alignment.centerRight,
                            padding: const EdgeInsets.only(right: 20),
                            color: Colors.red,
                            child: const Icon(
                              Icons.delete,
                              color: Colors.white,
                            ),
                          ),
                          onDismissed: (_) => _removeItem(index),
                          child: Card(
                            child: ListTile(
                              leading: CircleAvatar(
                                backgroundColor: item.color.withValues(alpha: 0.15),
                                child: Icon(item.icon, color: item.color),
                              ),
                              title: Text(item.title),
                              subtitle: Text(item.subtitle),
                              trailing: const Icon(Icons.chevron_right),
                              onTap: () {
                                showDialog(
                                  context: context,
                                  builder: (context) => AlertDialog(
                                    title: Text(item.title),
                                    content: Text(
                                      '你点击了 "${item.title}"\n\n'
                                      '这里可以展示详情页面。',
                                    ),
                                    actions: [
                                      TextButton(
                                        onPressed: () =>
                                            Navigator.pop(context),
                                        child: const Text('关闭'),
                                      ),
                                    ],
                                  ),
                                );
                              },
                            ),
                          ),
                        );
                      },
                    ),
            ),
    );
  }
}

class _Item {
  final int id;
  final String title;
  final String subtitle;
  final IconData icon;
  final Color color;

  const _Item({
    required this.id,
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.color,
  });
}
