package main

import (
	"context"
	"flag"
	"fmt"
	"os"
	"text/tabwriter"
	"time"

	"kss-agent/internal/mem"
	"kss-agent/internal/memorysession"
	"kss-agent/internal/shared"
)

func main() {
	if err := run(); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}

func run() error {
	shared.LoadDotEnv()
	var opts memorysession.Options
	var list bool
	flag.StringVar(&opts.SessionID, "session", "", "session ID (empty creates a new session)")
	flag.StringVar(&opts.SessionDir, "session-dir", shared.DefaultSessionDir(), "directory for JSONL session files")
	flag.StringVar(&opts.Instruction, "instruction", shared.DefaultInstruction(), "system prompt")
	flag.BoolVar(&list, "list", false, "list saved sessions without contacting the model")
	flag.Parse()
	if flag.NArg() != 0 {
		return fmt.Errorf("请启动后在 you> 输入问题，使用 --session ID 恢复会话")
	}
	if list {
		if opts.SessionID != "" {
			return fmt.Errorf("--list 和 --session 不能同时使用")
		}
		store, err := mem.NewStore(opts.SessionDir)
		if err != nil {
			return err
		}
		sessions, err := store.List()
		if err != nil {
			return err
		}
		if len(sessions) == 0 {
			_, err = fmt.Fprintln(os.Stdout, "暂无已保存的会话。")
			return err
		}
		output := tabwriter.NewWriter(os.Stdout, 0, 4, 2, ' ', 0)
		if _, err := fmt.Fprintln(output, "ID\t创建时间\t标题"); err != nil {
			return err
		}
		for _, session := range sessions {
			if _, err := fmt.Fprintf(output, "%s\t%s\t%s\n", session.ID, session.CreatedAt.Local().Format(time.DateTime), session.Title); err != nil {
				return err
			}
		}
		return output.Flush()
	}
	return memorysession.Run(context.Background(), opts, os.Stdin, os.Stdout)
}
