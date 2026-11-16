# 第三章：Memory 与 Session

目标：延续第二章学习方式，对照用户指定的 CloudWeGo 第三章文档，实现 JSONL 持久化、跨进程顺序恢复，并提供讲解与调试入口。

方案：新增 `cmd/memory-session` 和 `internal/memorysession`；`internal/mem` 实现 Session/Store；抽取第二章已有事件消费代码至 `internal/agentconsole` 供两章复用。独立入口便于比较章节；不把第二章改成持久化，也不复制事件读取逻辑。

业务接口：Store.NewStore/GetOrCreate/List/Delete；Session.Append/GetMessages/Title。采用现有 `schema.Message`；一会话一个 JSONL，首行为类型、ID、创建时间与 message_kind，后续每行一条完整消息。先保存用户消息，再运行 Agent，成功后保存完整回复；失败的用户请求保留，部分助手回复不保存。

交互：默认新建随机 ID 会话；`--session ID` 获取或创建指定会话；`--session-dir`（默认 SESSION_DIR 或 data/sessions）决定目录；支持 `--list` 查找会话 ID。结束时展示可复制的恢复命令，VS Code 提供新建和输入 ID 恢复两种配置。

约束：沿用模型配置、Go/Eino 版本及 CGO_ENABLED=0；不新增依赖，不建 worktree，不 commit/push。数据目录加入 gitignore。只支持同一会话一次一个进程使用，不提供跨进程并发锁、长时记忆提炼、压缩、数据库或工具。

可靠性：拒绝路径穿越 ID、损坏/类型不符的记录与未完整写入的尾行，不默默丢弃历史；写入成功后才更新内存；限制单条记录大小且读取、写入规则一致。测试验证跨 Store 重载、会话隔离、列表删除、写入失败、模型失败及恢复时的真实 Runner 输入。
