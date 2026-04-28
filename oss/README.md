# Go 版阿里云 OSS CRUD 示例

这个目录现在是一个独立的 Go CLI，固定读取当前目录下的 `.env`，并操作 `OSS_BUCKET` 指定的 bucket。

代码拆分如下：

- `main.go`：命令入口，读取配置并调度命令
- `util.go`：固定 bucket 的对象 CRUD 和公共工具函数
- `test.go`：手动 smoke test 流程
- `.env`：本地配置文件

支持的命令：

- `config`：查看当前加载到的配置，敏感信息会脱敏
- `list`：列出 bucket 下的对象
- `create`：创建对象
- `read`：读取对象
- `update`：更新对象
- `delete`：删除对象
- `smoke-test`：自动走一遍 create/read/update/list/delete

## 1. 配置

程序会自动读取当前目录下的 `.env`。这个项目已经帮你创建好了，包含：

```bash
OSS_ACCESS_KEY_ID=...
OSS_ACCESS_KEY_SECRET=...
OSS_SESSION_TOKEN=
OSS_REGION=cn-shanghai
OSS_ENDPOINT=oss-cn-shanghai.aliyuncs.com
OSS_BUCKET=aientry-test
OSS_TIMEOUT=15s
OSS_TEST_OBJECT_KEY=copilot/manual-smoke-test.txt
```

根目录 `.gitignore` 已经忽略 `.env`，不会默认被提交。

## 2. 安装依赖

```bash
go mod tidy
```

## 3. 运行示例

如果你在 macOS 上使用 Go 1.22.x，运行时遇到 `missing LC_UUID load command`，优先用外部链接方式：

```bash
go run -ldflags='-linkmode=external' . config
```

查看当前配置：

```bash
go run -ldflags='-linkmode=external' . config
```

列对象：

```bash
go run -ldflags='-linkmode=external' . list -prefix copilot/
```

创建对象：

```bash
go run -ldflags='-linkmode=external' . create -key copilot/hello.txt -content 'hello oss'
```

从本地文件创建对象：

```bash
go run -ldflags='-linkmode=external' . create -key copilot/hello.txt -file ./local.txt
```

读取对象：

```bash
go run -ldflags='-linkmode=external' . read -key copilot/hello.txt
```

更新对象：

```bash
go run -ldflags='-linkmode=external' . update -key copilot/hello.txt -content 'updated content'
```

删除对象：

```bash
go run -ldflags='-linkmode=external' . delete -key copilot/hello.txt
```

跑一遍手测流程：

```bash
go run -ldflags='-linkmode=external' . smoke-test
```

## 4. 构建

```bash
go build -ldflags='-linkmode=external' ./...
```

## 说明

这里的 CRUD 指的是 bucket 内对象的增删改查，不是创建或删除 bucket 本身。

如果当前 RAM 策略缺少 `oss:PutObject`、`oss:GetObject`、`oss:DeleteObject` 或 `oss:ListObjects` 权限，对应命令会返回 `AccessDenied`。

如果你还想补对象标签、批量删除或者 Meta Query 版本，我可以继续在这个目录里往下扩。
