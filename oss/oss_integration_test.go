package main

import (
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/aliyun/alibabacloud-oss-go-sdk-v2/oss"
)

func TestReadLocalContent(t *testing.T) {
	t.Parallel()

	filePath := filepath.Join(t.TempDir(), "sample.txt")
	want := "hello from go test"
	if err := os.WriteFile(filePath, []byte(want), 0o600); err != nil {
		t.Fatalf("write temp file: %v", err)
	}

	got, err := readLocalContent("", filePath)
	if err != nil {
		t.Fatalf("readLocalContent returned error: %v", err)
	}
	if got != want {
		t.Fatalf("readLocalContent = %q, want %q", got, want)
	}
}

func TestOSSPutObjectIntegration(t *testing.T) {
	cfg := ossIntegrationTestRequireConfig(t)
	key := ossIntegrationTestNewKey(cfg, "put")
	content := fmt.Sprintf("put at %s", time.Now().UTC().Format(time.RFC3339Nano))

	t.Cleanup(func() {
		ossIntegrationTestCleanupObject(t, cfg, key)
	})

	ctx, cancel := newRequestContext(cfg)
	defer cancel()

	result, err := PutObjectContent(ctx, cfg, key, content)
	if err != nil {
		t.Fatalf("PutObjectContent returned error: %v", err)
	}
	if result == nil {
		t.Fatal("PutObjectContent returned nil result")
	}
	if result.ETag == nil || *result.ETag == "" {
		t.Fatal("PutObjectContent returned empty etag")
	}
}

func TestOSSReadObjectIntegration(t *testing.T) {
	cfg := ossIntegrationTestRequireConfig(t)
	key := ossIntegrationTestNewKey(cfg, "read")
	want := fmt.Sprintf("read at %s", time.Now().UTC().Format(time.RFC3339Nano))

	ossIntegrationTestMustPutObject(t, cfg, key, want)
	t.Cleanup(func() {
		ossIntegrationTestCleanupObject(t, cfg, key)
	})

	ctx, cancel := newRequestContext(cfg)
	defer cancel()

	result, err := ReadObjectContent(ctx, cfg, key)
	if err != nil {
		t.Fatalf("ReadObjectContent returned error: %v", err)
	}
	if result.Body != want {
		t.Fatalf("ReadObjectContent body = %q, want %q", result.Body, want)
	}
}

func TestOSSUpdateObjectIntegration(t *testing.T) {
	cfg := ossIntegrationTestRequireConfig(t)
	key := ossIntegrationTestNewKey(cfg, "update")
	initialContent := fmt.Sprintf("created at %s", time.Now().UTC().Format(time.RFC3339Nano))
	updatedContent := fmt.Sprintf("updated at %s", time.Now().UTC().Format(time.RFC3339Nano))

	ossIntegrationTestMustPutObject(t, cfg, key, initialContent)
	t.Cleanup(func() {
		ossIntegrationTestCleanupObject(t, cfg, key)
	})

	ctx, cancel := newRequestContext(cfg)
	defer cancel()

	result, err := UpdateObjectContent(ctx, cfg, key, updatedContent)
	if err != nil {
		t.Fatalf("UpdateObjectContent returned error: %v", err)
	}
	if result == nil {
		t.Fatal("UpdateObjectContent returned nil result")
	}
	if result.ETag == nil || *result.ETag == "" {
		t.Fatal("UpdateObjectContent returned empty etag")
	}

	ctx, cancel = newRequestContext(cfg)
	defer cancel()

	readResult, err := ReadObjectContent(ctx, cfg, key)
	if err != nil {
		t.Fatalf("ReadObjectContent after update returned error: %v", err)
	}
	if readResult.Body != updatedContent {
		t.Fatalf("ReadObjectContent after update body = %q, want %q", readResult.Body, updatedContent)
	}
}

func TestOSSDeleteObjectIntegration(t *testing.T) {
	cfg := ossIntegrationTestRequireConfig(t)
	key := ossIntegrationTestNewKey(cfg, "delete")
	content := fmt.Sprintf("delete at %s", time.Now().UTC().Format(time.RFC3339Nano))
	deleted := false

	ossIntegrationTestMustPutObject(t, cfg, key, content)
	t.Cleanup(func() {
		if deleted {
			return
		}
		ossIntegrationTestCleanupObject(t, cfg, key)
	})

	ctx, cancel := newRequestContext(cfg)
	defer cancel()

	result, err := DeleteObjectByKey(ctx, cfg, key)
	if err != nil {
		var serviceErr *oss.ServiceError
		if errors.As(err, &serviceErr) {
			t.Fatalf("DeleteObjectByKey returned service error: code=%s status=%d message=%s; 当前凭证可能缺少 oss:DeleteObject 权限", serviceErr.Code, serviceErr.StatusCode, serviceErr.Message)
		}
		t.Fatalf("DeleteObjectByKey returned error: %v", err)
	}
	if result == nil {
		t.Fatal("DeleteObjectByKey returned nil result")
	}
	deleted = true

	ctx, cancel = newRequestContext(cfg)
	defer cancel()

	_, err = ReadObjectContent(ctx, cfg, key)
	if err == nil {
		t.Fatal("ReadObjectContent after delete returned nil error, want not found error")
	}

	var serviceErr *oss.ServiceError
	if !errors.As(err, &serviceErr) {
		t.Fatalf("ReadObjectContent after delete error type = %T, want *oss.ServiceError", err)
	}
	if serviceErr.Code != "NoSuchKey" && serviceErr.StatusCode != 404 {
		t.Fatalf("ReadObjectContent after delete error = code=%s status=%d, want NoSuchKey/404", serviceErr.Code, serviceErr.StatusCode)
	}
}

func ossIntegrationTestRequireConfig(t *testing.T) appConfig {
	t.Helper()

	if testing.Short() {
		t.Skip("跳过 OSS 集成测试: short 模式")
	}
	if os.Getenv("OSS_RUN_INTEGRATION_TEST") == "" {
		t.Skip("跳过 OSS 集成测试: 设置 OSS_RUN_INTEGRATION_TEST=1 后再运行")
	}

	cfg, err := loadConfig()
	if err != nil {
		t.Fatalf("loadConfig returned error: %v", err)
	}

	return cfg
}

func ossIntegrationTestNewKey(cfg appConfig, action string) string {
	key := fmt.Sprintf("copilot/go-test-%s-%d.txt", action, time.Now().UnixNano())
	if cfg.TestObjectKey != "" {
		key = fmt.Sprintf("%s-%s-%d", cfg.TestObjectKey, action, time.Now().UnixNano())
	}
	return key
}

func ossIntegrationTestMustPutObject(t *testing.T, cfg appConfig, key, content string) {
	t.Helper()

	ctx, cancel := newRequestContext(cfg)
	defer cancel()

	result, err := PutObjectContent(ctx, cfg, key, content)
	if err != nil {
		t.Fatalf("PutObjectContent returned error: %v", err)
	}
	if result == nil {
		t.Fatal("PutObjectContent returned nil result")
	}
	if result.ETag == nil || *result.ETag == "" {
		t.Fatal("PutObjectContent returned empty etag")
	}
}

func ossIntegrationTestCleanupObject(t *testing.T, cfg appConfig, key string) {
	t.Helper()

	ctx, cancel := newRequestContext(cfg)
	defer cancel()

	if _, err := DeleteObjectByKey(ctx, cfg, key); err != nil {
		var serviceErr *oss.ServiceError
		if errors.As(err, &serviceErr) {
			t.Logf("cleanup delete %q skipped: code=%s status=%d message=%s", key, serviceErr.Code, serviceErr.StatusCode, serviceErr.Message)
			return
		}
		t.Logf("cleanup delete %q failed: %v", key, err)
	}
}
