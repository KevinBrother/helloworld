package main

import (
	"errors"
	"flag"
	"fmt"
	"os"
	"time"
)

func main() {
	if len(os.Args) < 2 {
		printRootUsage()
		os.Exit(2)
	}

	if os.Args[1] == "help" || os.Args[1] == "-h" || os.Args[1] == "--help" {
		printRootUsage()
		return
	}

	cfg, err := loadConfig()
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}

	var runErr error
	switch os.Args[1] {
	case "config":
		runErr = runConfigCommand(cfg)
	case "list":
		runErr = runListCommand(os.Args[2:], cfg)
	case "create":
		runErr = runCreateCommand(os.Args[2:], cfg)
	case "read":
		runErr = runReadCommand(os.Args[2:], cfg)
	case "update":
		runErr = runUpdateCommand(os.Args[2:], cfg)
	case "delete":
		runErr = runDeleteCommand(os.Args[2:], cfg)
	case "smoke-test":
		runErr = runSmokeTestCommand(os.Args[2:], cfg)
	default:
		fmt.Fprintf(os.Stderr, "未知命令: %s\n\n", os.Args[1])
		printRootUsage()
		os.Exit(2)
	}

	if runErr == nil || errors.Is(runErr, flag.ErrHelp) {
		return
	}

	fmt.Fprintln(os.Stderr, describeError(runErr))
	os.Exit(1)
}

func runConfigCommand(cfg appConfig) error {
	fmt.Printf("bucket: %s\n", cfg.Bucket)
	fmt.Printf("region: %s\n", cfg.Region)
	fmt.Printf("endpoint: %s\n", firstNonEmpty(cfg.Endpoint, fmt.Sprintf("oss-%s.aliyuncs.com", cfg.Region)))
	fmt.Printf("access-key-id: %s\n", cfg.maskedAccessKeyID())
	fmt.Printf("session-token-configured: %t\n", cfg.SessionToken != "")
	fmt.Printf("timeout: %s\n", cfg.Timeout)
	fmt.Printf("default-test-object-key: %s\n", firstNonEmpty(cfg.TestObjectKey, "-"))
	return nil
}

func runListCommand(args []string, cfg appConfig) error {
	fs := flag.NewFlagSet("list", flag.ContinueOnError)
	fs.SetOutput(os.Stderr)

	var prefix string
	var maxKeys int
	fs.StringVar(&prefix, "prefix", "", "对象前缀过滤")
	fs.IntVar(&maxKeys, "max-keys", 100, "单次最多返回多少条对象，范围 1-1000")

	if err := fs.Parse(args); err != nil {
		return err
	}
	if err := validateMaxKeys(maxKeys); err != nil {
		return err
	}

	ctx, cancel := newRequestContext(cfg)
	objects, err := ListBucketObjects(ctx, cfg, prefix, int32(maxKeys))
	cancel()
	if err != nil {
		return err
	}

	if len(objects) == 0 {
		fmt.Println("没有查询到对象。")
		return nil
	}

	for index, object := range objects {
		fmt.Printf("%d. %s | size=%s (%d bytes) | class=%s | modified=%s\n", index+1, object.Key, formatBytes(object.Size), object.Size, object.StorageClass, formatTime(object.LastModified))
	}

	return nil
}

func runCreateCommand(args []string, cfg appConfig) error {
	fs := flag.NewFlagSet("create", flag.ContinueOnError)
	fs.SetOutput(os.Stderr)

	var key string
	var content string
	var filePath string
	fs.StringVar(&key, "key", "", "对象 key")
	fs.StringVar(&content, "content", "", "要写入的文本内容")
	fs.StringVar(&filePath, "file", "", "从本地文件读取内容")

	if err := fs.Parse(args); err != nil {
		return err
	}
	if err := requireValue("-key", key); err != nil {
		return err
	}
	if content == "" && filePath == "" {
		return fmt.Errorf("-content 和 -file 至少需要提供一个")
	}

	body, err := readLocalContent(content, filePath)
	if err != nil {
		return err
	}

	ctx, cancel := newRequestContext(cfg)
	result, err := PutObjectContent(ctx, cfg, key, body)
	cancel()
	if err != nil {
		return err
	}

	fmt.Printf("created: bucket=%s key=%s etag=%s\n", cfg.Bucket, key, valueOrDash(result.ETag))
	return nil
}

func runReadCommand(args []string, cfg appConfig) error {
	fs := flag.NewFlagSet("read", flag.ContinueOnError)
	fs.SetOutput(os.Stderr)

	var key string
	fs.StringVar(&key, "key", "", "对象 key")

	if err := fs.Parse(args); err != nil {
		return err
	}
	if err := requireValue("-key", key); err != nil {
		return err
	}

	ctx, cancel := newRequestContext(cfg)
	result, err := ReadObjectContent(ctx, cfg, key)
	cancel()
	if err != nil {
		return err
	}

	fmt.Printf("bucket: %s\n", cfg.Bucket)
	fmt.Printf("key: %s\n", result.Key)
	fmt.Printf("size: %s (%d bytes)\n", formatBytes(result.Size), result.Size)
	fmt.Printf("content-type: %s\n", result.ContentType)
	fmt.Printf("etag: %s\n", result.ETag)
	fmt.Printf("storage-class: %s\n", result.StorageClass)
	fmt.Printf("last-modified: %s\n", formatTime(result.LastModified))
	if len(result.Metadata) > 0 {
		fmt.Println("metadata:")
		for _, key := range sortedMetadataKeys(result.Metadata) {
			fmt.Printf("  %s=%s\n", key, result.Metadata[key])
		}
	}
	fmt.Println("body:")
	fmt.Println(result.Body)

	return nil
}

func runUpdateCommand(args []string, cfg appConfig) error {
	fs := flag.NewFlagSet("update", flag.ContinueOnError)
	fs.SetOutput(os.Stderr)

	var key string
	var content string
	var filePath string
	fs.StringVar(&key, "key", "", "对象 key")
	fs.StringVar(&content, "content", "", "更新后的文本内容")
	fs.StringVar(&filePath, "file", "", "从本地文件读取更新内容")

	if err := fs.Parse(args); err != nil {
		return err
	}
	if err := requireValue("-key", key); err != nil {
		return err
	}
	if content == "" && filePath == "" {
		return fmt.Errorf("-content 和 -file 至少需要提供一个")
	}

	body, err := readLocalContent(content, filePath)
	if err != nil {
		return err
	}

	ctx, cancel := newRequestContext(cfg)
	result, err := UpdateObjectContent(ctx, cfg, key, body)
	cancel()
	if err != nil {
		return err
	}

	fmt.Printf("updated: bucket=%s key=%s etag=%s\n", cfg.Bucket, key, valueOrDash(result.ETag))
	return nil
}

func runDeleteCommand(args []string, cfg appConfig) error {
	fs := flag.NewFlagSet("delete", flag.ContinueOnError)
	fs.SetOutput(os.Stderr)

	var key string
	fs.StringVar(&key, "key", "", "对象 key")

	if err := fs.Parse(args); err != nil {
		return err
	}
	if err := requireValue("-key", key); err != nil {
		return err
	}

	ctx, cancel := newRequestContext(cfg)
	result, err := DeleteObjectByKey(ctx, cfg, key)
	cancel()
	if err != nil {
		return err
	}

	fmt.Printf("deleted: bucket=%s key=%s status=%d delete-marker=%v\n", cfg.Bucket, key, result.StatusCode, result.DeleteMarker)
	return nil
}

func runSmokeTestCommand(args []string, cfg appConfig) error {
	fs := flag.NewFlagSet("smoke-test", flag.ContinueOnError)
	fs.SetOutput(os.Stderr)

	var key string
	fs.StringVar(&key, "key", "", "用于 smoke test 的对象 key，默认读取 OSS_TEST_OBJECT_KEY")

	if err := fs.Parse(args); err != nil {
		return err
	}

	if key == "" {
		key = firstNonEmpty(cfg.TestObjectKey, fmt.Sprintf("copilot/smoke-test-%d.txt", time.Now().Unix()))
	}

	return runSmokeTest(cfg, key)
}

func runSmokeTest(cfg appConfig, key string) error {
	createdContent := fmt.Sprintf("created at %s", time.Now().UTC().Format(time.RFC3339))
	updatedContent := fmt.Sprintf("updated at %s", time.Now().UTC().Format(time.RFC3339))

	ctx, cancel := newRequestContext(cfg)
	createResult, err := PutObjectContent(ctx, cfg, key, createdContent)
	cancel()
	if err != nil {
		return fmt.Errorf("smoke test create 失败: %w", err)
	}
	fmt.Printf("create ok: key=%s etag=%s\n", key, valueOrDash(createResult.ETag))

	ctx, cancel = newRequestContext(cfg)
	readResult, err := ReadObjectContent(ctx, cfg, key)
	cancel()
	if err != nil {
		return fmt.Errorf("smoke test read 失败: %w", err)
	}
	fmt.Printf("read ok: size=%d body=%q\n", readResult.Size, readResult.Body)

	ctx, cancel = newRequestContext(cfg)
	updateResult, err := UpdateObjectContent(ctx, cfg, key, updatedContent)
	cancel()
	if err != nil {
		return fmt.Errorf("smoke test update 失败: %w", err)
	}
	fmt.Printf("update ok: key=%s etag=%s\n", key, valueOrDash(updateResult.ETag))

	ctx, cancel = newRequestContext(cfg)
	objects, err := ListBucketObjects(ctx, cfg, key, 10)
	cancel()
	if err != nil {
		return fmt.Errorf("smoke test list 失败: %w", err)
	}
	fmt.Printf("list ok: prefix=%s matched=%d\n", key, len(objects))

	ctx, cancel = newRequestContext(cfg)
	deleteResult, err := DeleteObjectByKey(ctx, cfg, key)
	cancel()
	if err != nil {
		return fmt.Errorf("smoke test delete 失败: %w", err)
	}
	fmt.Printf("delete ok: key=%s status=%d delete-marker=%v\n", key, deleteResult.StatusCode, deleteResult.DeleteMarker)

	return nil
}

func printRootUsage() {
	fmt.Fprintf(os.Stderr, "阿里云 OSS bucket CRUD 示例\n\n")
	fmt.Fprintf(os.Stderr, "用法:\n  %s <command> [flags]\n\n", os.Args[0])
	fmt.Fprintln(os.Stderr, "程序会自动读取当前目录下的 .env 配置，并固定操作 OSS_BUCKET 指定的 bucket。")
	fmt.Fprintln(os.Stderr)
	fmt.Fprintln(os.Stderr, "命令:")
	fmt.Fprintln(os.Stderr, "  config       查看已加载的配置（脱敏显示）")
	fmt.Fprintln(os.Stderr, "  list         列出当前 bucket 下的对象")
	fmt.Fprintln(os.Stderr, "  create       创建对象")
	fmt.Fprintln(os.Stderr, "  read         读取对象")
	fmt.Fprintln(os.Stderr, "  update       更新对象")
	fmt.Fprintln(os.Stderr, "  delete       删除对象")
	fmt.Fprintln(os.Stderr, "  smoke-test   走一遍 create/read/update/list/delete 手测流程")
	fmt.Fprintln(os.Stderr)
	fmt.Fprintln(os.Stderr, "示例:")
	fmt.Fprintf(os.Stderr, "  %s config\n", os.Args[0])
	fmt.Fprintf(os.Stderr, "  %s list -prefix copilot/\n", os.Args[0])
	fmt.Fprintf(os.Stderr, "  %s create -key copilot/hello.txt -content 'hello oss'\n", os.Args[0])
	fmt.Fprintf(os.Stderr, "  %s read -key copilot/hello.txt\n", os.Args[0])
	fmt.Fprintf(os.Stderr, "  %s update -key copilot/hello.txt -content 'updated content'\n", os.Args[0])
	fmt.Fprintf(os.Stderr, "  %s delete -key copilot/hello.txt\n", os.Args[0])
	fmt.Fprintf(os.Stderr, "  %s smoke-test\n", os.Args[0])
}
