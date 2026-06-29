# Flutter Demo

一个展示 Flutter 核心概念的入门 Demo 应用。

## 功能页面

| 页面 | 核心知识点 |
|------|-----------|
| 🏠 首页 | StatelessWidget · Card · ListView · Navigator 路由 |
| 🔢 计数器 | StatefulWidget · setState · AnimationController · 隐式动画 |
| 📋 列表展示 | ListView.builder · Future 异步加载 · Dismissible 滑动删除 · 下拉刷新 · SnackBar |
| 📝 表单输入 | Form · FormField 验证 · TextEditingController · DropdownButton · CheckboxListTile |

## 运行方式

```bash
# 确保已安装 Flutter
flutter doctor

# 获取依赖
cd demo
flutter pub get

# 运行（会自动选择可用设备）
flutter run

# 指定平台运行
flutter run -d chrome     # Web
flutter run -d macos       # macOS
flutter run -d ios         # iOS 模拟器
flutter run -d android     # Android 模拟器
```

## 项目结构

```
demo/
├── lib/
│   ├── main.dart              # 入口：MaterialApp · 主题 · 路由
│   └── pages/
│       ├── home_page.dart     # 首页导航
│       ├── counter_page.dart  # 计数器（状态+动画）
│       ├── list_page.dart     # 列表（异步+交互）
│       └── form_page.dart     # 表单（验证+提交）
├── test/
│   └── widget_test.dart       # Widget 测试
├── web/                       # Web 平台配置
├── pubspec.yaml               # 依赖配置
└── analysis_options.yaml      # 代码分析规则
```

## 涵盖知识点

- **Widget 体系**: StatelessWidget / StatefulWidget
- **Material 3**: 最新 Material Design 3 主题系统
- **暗色模式**: 自动跟随系统暗色/亮色模式
- **路由导航**: 命名路由 (Named Routes)
- **状态管理**: setState 基础状态管理
- **异步编程**: Future / async-await 模拟网络请求
- **动画**: AnimationController + ScaleTransition
- **表单**: Form 验证 / TextEditingController
- **交互**: Dismissible 滑动删除 / RefreshIndicator 下拉刷新
- **对话框**: AlertDialog / SnackBar 消息提示
