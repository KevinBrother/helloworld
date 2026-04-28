package main

import (
	"context"
	"errors"
	"fmt"
	"io"
	"os"
	"sort"
	"strings"
	"time"

	"github.com/aliyun/alibabacloud-oss-go-sdk-v2/oss"
	"github.com/aliyun/alibabacloud-oss-go-sdk-v2/oss/credentials"
	"github.com/joho/godotenv"
)

const defaultTimeout = 15 * time.Second

type appConfig struct {
	AccessKeyID     string
	AccessKeySecret string
	SessionToken    string
	Region          string
	Endpoint        string
	Bucket          string
	Timeout         time.Duration
	TestObjectKey   string
}

type ObjectSummary struct {
	Key          string
	Size         int64
	StorageClass string
	LastModified *time.Time
}

type ObjectContent struct {
	Key          string
	Body         string
	Size         int64
	ContentType  string
	ETag         string
	StorageClass string
	LastModified *time.Time
	Metadata     map[string]string
}

func loadConfig() (appConfig, error) {
	var cfg appConfig

	if err := godotenv.Load(".env"); err != nil && !os.IsNotExist(err) {
		return cfg, fmt.Errorf("加载 .env 失败: %w", err)
	}

	timeout := defaultTimeout
	if rawTimeout := strings.TrimSpace(os.Getenv("OSS_TIMEOUT")); rawTimeout != "" {
		parsedTimeout, err := time.ParseDuration(rawTimeout)
		if err != nil {
			return cfg, fmt.Errorf("OSS_TIMEOUT 不是合法时长: %w", err)
		}
		timeout = parsedTimeout
	}

	cfg = appConfig{
		AccessKeyID:     strings.TrimSpace(os.Getenv("OSS_ACCESS_KEY_ID")),
		AccessKeySecret: strings.TrimSpace(os.Getenv("OSS_ACCESS_KEY_SECRET")),
		SessionToken:    strings.TrimSpace(os.Getenv("OSS_SESSION_TOKEN")),
		Region:          strings.TrimSpace(os.Getenv("OSS_REGION")),
		Endpoint:        strings.TrimSpace(os.Getenv("OSS_ENDPOINT")),
		Bucket:          strings.TrimSpace(os.Getenv("OSS_BUCKET")),
		Timeout:         timeout,
		TestObjectKey:   strings.TrimSpace(os.Getenv("OSS_TEST_OBJECT_KEY")),
	}

	if err := cfg.validate(); err != nil {
		return cfg, err
	}

	return cfg, nil
}

func (c appConfig) validate() error {
	missing := make([]string, 0, 4)
	if c.AccessKeyID == "" {
		missing = append(missing, "OSS_ACCESS_KEY_ID")
	}
	if c.AccessKeySecret == "" {
		missing = append(missing, "OSS_ACCESS_KEY_SECRET")
	}
	if c.Region == "" {
		missing = append(missing, "OSS_REGION")
	}
	if c.Bucket == "" {
		missing = append(missing, "OSS_BUCKET")
	}
	if len(missing) > 0 {
		return fmt.Errorf("缺少配置: %s", strings.Join(missing, ", "))
	}
	return nil
}

func (c appConfig) maskedAccessKeyID() string {
	if len(c.AccessKeyID) <= 8 {
		return c.AccessKeyID
	}
	return c.AccessKeyID[:4] + strings.Repeat("*", len(c.AccessKeyID)-8) + c.AccessKeyID[len(c.AccessKeyID)-4:]
}

func newOSSClient(cfg appConfig) *oss.Client {
	provider := credentials.NewStaticCredentialsProvider(cfg.AccessKeyID, cfg.AccessKeySecret, cfg.SessionToken)
	ossConfig := oss.LoadDefaultConfig().
		WithCredentialsProvider(provider).
		WithRegion(cfg.Region)
	if cfg.Endpoint != "" {
		ossConfig = ossConfig.WithEndpoint(cfg.Endpoint)
	}
	return oss.NewClient(ossConfig)
}

func newRequestContext(cfg appConfig) (context.Context, context.CancelFunc) {
	if cfg.Timeout <= 0 {
		return context.Background(), func() {}
	}
	return context.WithTimeout(context.Background(), cfg.Timeout)
}

func ListBucketObjects(ctx context.Context, cfg appConfig, prefix string, maxKeys int32) ([]ObjectSummary, error) {
	client := newOSSClient(cfg)
	request := &oss.ListObjectsV2Request{
		Bucket:  oss.Ptr(cfg.Bucket),
		MaxKeys: maxKeys,
	}
	if prefix != "" {
		request.Prefix = oss.Ptr(prefix)
	}

	result, err := client.ListObjectsV2(ctx, request)
	if err != nil {
		return nil, err
	}

	objects := make([]ObjectSummary, 0, len(result.Contents))
	for _, obj := range result.Contents {
		objects = append(objects, ObjectSummary{
			Key:          valueOrDash(obj.Key),
			Size:         obj.Size,
			StorageClass: valueOrDash(obj.StorageClass),
			LastModified: obj.LastModified,
		})
	}

	sort.Slice(objects, func(i, j int) bool {
		return objects[i].Key < objects[j].Key
	})

	return objects, nil
}

func PutObjectContent(ctx context.Context, cfg appConfig, key, content string) (*oss.PutObjectResult, error) {
	client := newOSSClient(cfg)
	return client.PutObject(ctx, &oss.PutObjectRequest{
		Bucket: oss.Ptr(cfg.Bucket),
		Key:    oss.Ptr(key),
		Body:   strings.NewReader(content),
	})
}

func UpdateObjectContent(ctx context.Context, cfg appConfig, key, content string) (*oss.PutObjectResult, error) {
	return PutObjectContent(ctx, cfg, key, content)
}

func ReadObjectContent(ctx context.Context, cfg appConfig, key string) (*ObjectContent, error) {
	client := newOSSClient(cfg)
	result, err := client.GetObject(ctx, &oss.GetObjectRequest{
		Bucket: oss.Ptr(cfg.Bucket),
		Key:    oss.Ptr(key),
	})
	if err != nil {
		return nil, err
	}
	defer result.Body.Close()

	body, err := io.ReadAll(result.Body)
	if err != nil {
		return nil, fmt.Errorf("读取对象内容失败: %w", err)
	}

	return &ObjectContent{
		Key:          key,
		Body:         string(body),
		Size:         result.ContentLength,
		ContentType:  valueOrDash(result.ContentType),
		ETag:         valueOrDash(result.ETag),
		StorageClass: valueOrDash(result.StorageClass),
		LastModified: result.LastModified,
		Metadata:     cloneMetadata(result.Metadata),
	}, nil
}

func DeleteObjectByKey(ctx context.Context, cfg appConfig, key string) (*oss.DeleteObjectResult, error) {
	client := newOSSClient(cfg)
	return client.DeleteObject(ctx, &oss.DeleteObjectRequest{
		Bucket: oss.Ptr(cfg.Bucket),
		Key:    oss.Ptr(key),
	})
}

func readLocalContent(content, filePath string) (string, error) {
	if filePath == "" {
		return content, nil
	}

	data, err := os.ReadFile(filePath)
	if err != nil {
		return "", fmt.Errorf("读取文件失败: %w", err)
	}

	return string(data), nil
}

func cloneMetadata(source map[string]string) map[string]string {
	if len(source) == 0 {
		return nil
	}

	metadata := make(map[string]string, len(source))
	for key, value := range source {
		metadata[key] = value
	}
	return metadata
}

func sortedMetadataKeys(metadata map[string]string) []string {
	keys := make([]string, 0, len(metadata))
	for key := range metadata {
		keys = append(keys, key)
	}
	sort.Strings(keys)
	return keys
}

func validateMaxKeys(maxKeys int) error {
	if maxKeys < 1 || maxKeys > 1000 {
		return fmt.Errorf("-max-keys 必须在 1 到 1000 之间")
	}
	return nil
}

func requireValue(name, value string) error {
	if strings.TrimSpace(value) == "" {
		return fmt.Errorf("缺少必填参数 %s", name)
	}
	return nil
}

func formatBytes(size int64) string {
	if size < 0 {
		return "-"
	}
	if size < 1024 {
		return fmt.Sprintf("%d B", size)
	}

	units := []string{"KB", "MB", "GB", "TB", "PB", "EB"}
	value := float64(size)
	unitIndex := -1
	for value >= 1024 && unitIndex < len(units)-1 {
		value /= 1024
		unitIndex++
	}

	return fmt.Sprintf("%.2f %s", value, units[unitIndex])
}

func formatTime(value *time.Time) string {
	if value == nil {
		return "-"
	}
	return value.UTC().Format(time.RFC3339)
}

func valueOrDash(value *string) string {
	if value == nil || *value == "" {
		return "-"
	}
	return *value
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if value != "" {
			return value
		}
	}
	return ""
}

func describeError(err error) string {
	var serviceError *oss.ServiceError
	if errors.As(err, &serviceError) {
		return fmt.Sprintf(
			"OSS 请求失败: code=%s status=%d message=%s request-id=%s",
			serviceError.Code,
			serviceError.StatusCode,
			serviceError.Message,
			serviceError.RequestID,
		)
	}
	return err.Error()
}
