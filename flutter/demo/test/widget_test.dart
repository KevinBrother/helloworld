import 'package:flutter_test/flutter_test.dart';
import 'package:demo/main.dart';

void main() {
  testWidgets('App launches and shows home page', (WidgetTester tester) async {
    await tester.pumpWidget(const MyApp());
    expect(find.text('Flutter Demo'), findsOneWidget);
    expect(find.text('欢迎来到 Flutter!'), findsOneWidget);
  });

  testWidgets('Navigate to counter page', (WidgetTester tester) async {
    await tester.pumpWidget(const MyApp());
    await tester.tap(find.text('计数器'));
    await tester.pumpAndSettle();
    expect(find.text('当前计数'), findsOneWidget);
    expect(find.text('0'), findsOneWidget);
  });
}
