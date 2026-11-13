package main

import (
	"context"
	"flag"
	"fmt"
	"os"

	"kss-agent/internal/newchatmodelagent"
	"kss-agent/internal/shared"
)

func main() {
	shared.LoadDotEnv()
	var instruction string
	flag.StringVar(&instruction, "instruction", shared.DefaultInstruction(), "system prompt")
	flag.Parse()
	if flag.NArg() != 0 {
		fmt.Fprintln(os.Stderr, "第二章使用交互输入，请启动后在 you> 后输入问题；可用 --instruction 设置系统提示词。")
		os.Exit(2)
	}
	if err := newchatmodelagent.Run(context.Background(), instruction, os.Stdin, os.Stdout); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}
