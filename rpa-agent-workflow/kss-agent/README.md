# README

├── api/             # API 定义文件（如 Protobuf, OpenAPI 声明）
├── cmd/             # 项目的各个入口程序
│   └── app/
│       └── main.go  # 程序主入口
├── configs/         # 配置文件（如 yaml, toml 等）
├── deployments/     # 部署配置文件（如 Dockerfile, Docker-compose）
├── internal/        # 私有应用代码（外部无法 import）
│   ├── conf/        # 配置加载
│   ├── handler/     # 路由层/控制器层
│   ├── repository/  # 数据库/数据持久化层
│   └── service/     # 核心业务逻辑层（你写 Eino Agent 的核心地方）
├── pkg/             # 公共可导出的工具库
│   └── utils/
├── scripts/         # 运维、编译等自动化脚本
├── test/            # 额外的集成测试
├── Makefile         # 快捷构建命令
└── go.mod

``` bash
# go layout
mkdir -p cmd/app internal/{conf,handler,service,repository} pkg/utils configs api/proto deployments scripts test && touch cmd/app/main.go go.mod Makefile README.md
```

``` bash
# run
make run
```
