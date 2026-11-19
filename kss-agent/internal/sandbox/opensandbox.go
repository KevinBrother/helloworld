package sandbox

import (
	"context"
	"fmt"
	"os"
	"strings"
	"sync"
	"time"

	opensandbox "github.com/alibaba/OpenSandbox/sdks/sandbox/go"
)

const (
	DefaultDomain     = "localhost:8080"
	DefaultProtocol   = "http"
	DefaultImage      = "opensandbox/code-interpreter:v1.1.0"
	DefaultTTL        = 15 * time.Minute
	DefaultRunTimeout = 60 * time.Second

	healthCheckTimeout = 5 * time.Second
	closeTimeout       = 10 * time.Second

	execdPort = 44772
)

type Config struct {
	Domain     string
	Protocol   string
	APIKey     string
	Image      string
	TTL        time.Duration
	RunTimeout time.Duration
	OnCreate   func(id, endpoint string)
}

func LoadConfigFromEnv() (Config, error) {
	cfg := Config{
		Domain:     firstNonEmpty(os.Getenv("SANDBOX_DOMAIN"), os.Getenv("OPEN_SANDBOX_DOMAIN"), DefaultDomain),
		Protocol:   firstNonEmpty(os.Getenv("SANDBOX_PROTOCOL"), os.Getenv("OPEN_SANDBOX_PROTOCOL"), DefaultProtocol),
		APIKey:     firstNonEmpty(os.Getenv("SANDBOX_API_KEY"), os.Getenv("OPEN_SANDBOX_API_KEY")),
		Image:      firstNonEmpty(os.Getenv("SANDBOX_IMAGE"), DefaultImage),
		TTL:        DefaultTTL,
		RunTimeout: DefaultRunTimeout,
	}
	if raw := strings.TrimSpace(os.Getenv("SANDBOX_TTL")); raw != "" {
		ttl, err := time.ParseDuration(raw)
		if err != nil {
			return Config{}, fmt.Errorf("invalid SANDBOX_TTL %q: %w", raw, err)
		}
		if ttl <= 0 {
			return Config{}, fmt.Errorf("invalid SANDBOX_TTL %q: must be positive", raw)
		}
		cfg.TTL = ttl
	}
	if raw := strings.TrimSpace(os.Getenv("SANDBOX_RUN_TIMEOUT")); raw != "" {
		timeout, err := time.ParseDuration(raw)
		if err != nil {
			return Config{}, fmt.Errorf("invalid SANDBOX_RUN_TIMEOUT %q: %w", raw, err)
		}
		if timeout <= 0 {
			return Config{}, fmt.Errorf("invalid SANDBOX_RUN_TIMEOUT %q: must be positive", raw)
		}
		cfg.RunTimeout = timeout
	}
	return cfg, nil
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if trimmed := strings.TrimSpace(value); trimmed != "" {
			return trimmed
		}
	}
	return ""
}

type OpenSandboxRunner struct {
	cfg Config

	mu          sync.Mutex
	interpreter *opensandbox.CodeInterpreter
	closed      bool
}

func NewOpenSandboxRunner(cfg Config) (*OpenSandboxRunner, error) {
	cfg.Domain = strings.TrimSpace(cfg.Domain)
	if cfg.Domain == "" {
		return nil, fmt.Errorf("sandbox domain is required")
	}
	cfg.Protocol = strings.ToLower(strings.TrimSpace(cfg.Protocol))
	if cfg.Protocol == "" {
		cfg.Protocol = DefaultProtocol
	}
	if cfg.Protocol != "http" && cfg.Protocol != "https" {
		return nil, fmt.Errorf("invalid sandbox protocol %q: want http or https", cfg.Protocol)
	}
	if strings.TrimSpace(cfg.Image) == "" {
		cfg.Image = DefaultImage
	}
	if cfg.TTL <= 0 {
		cfg.TTL = DefaultTTL
	}
	if cfg.TTL < time.Second {
		return nil, fmt.Errorf("sandbox TTL must be at least 1s, got %s", cfg.TTL)
	}
	if cfg.RunTimeout <= 0 {
		cfg.RunTimeout = DefaultRunTimeout
	}
	cfg.APIKey = strings.TrimSpace(cfg.APIKey)
	return &OpenSandboxRunner{cfg: cfg}, nil
}

func (r *OpenSandboxRunner) Run(ctx context.Context, req Request) (Result, error) {
	if err := Validate(&req); err != nil {
		return Result{}, err
	}
	r.mu.Lock()
	defer r.mu.Unlock()
	if r.closed {
		return Result{}, fmt.Errorf("sandbox runner is closed")
	}
	interpreter, err := r.ensureLocked(ctx)
	if err != nil {
		return Result{}, err
	}
	runCtx, cancel := context.WithTimeout(ctx, r.cfg.RunTimeout)
	defer cancel()
	collector := newExecutionCollector(MaxOutputBytes)
	execution, err := interpreter.Execute(runCtx, req.Language, req.Code, collector.handlers())
	if err != nil {
		return Result{}, fmt.Errorf("sandbox execute: %w", err)
	}
	return mapExecution(execution, collector), nil
}

func (r *OpenSandboxRunner) Close() error {
	r.mu.Lock()
	defer r.mu.Unlock()
	if r.closed {
		return nil
	}
	r.closed = true
	ctx, cancel := context.WithTimeout(context.Background(), closeTimeout)
	defer cancel()
	if err := r.killLocked(ctx); err != nil {
		return fmt.Errorf("close sandbox: %w", err)
	}
	return nil
}

func (r *OpenSandboxRunner) Domain() string { return r.cfg.Domain }

func (r *OpenSandboxRunner) Image() string { return r.cfg.Image }

func (r *OpenSandboxRunner) ensureLocked(ctx context.Context) (*opensandbox.CodeInterpreter, error) {
	if r.interpreter != nil {
		healthCtx, cancel := context.WithTimeout(ctx, healthCheckTimeout)
		healthy := r.interpreter.IsHealthy(healthCtx)
		cancel()
		if healthy {
			return r.interpreter, nil
		}
		if err := r.killLocked(ctx); err != nil {
			return nil, fmt.Errorf("replace unhealthy sandbox: %w", err)
		}
	}
	ttlSeconds := int(r.cfg.TTL.Seconds())
	interpreter, err := opensandbox.CreateCodeInterpreter(ctx, opensandbox.ConnectionConfig{
		Domain:   r.cfg.Domain,
		Protocol: r.cfg.Protocol,
		APIKey:   r.cfg.APIKey,
	}, opensandbox.CodeInterpreterCreateOptions{
		Image:          r.cfg.Image,
		TimeoutSeconds: &ttlSeconds,
	})
	if err != nil {
		return nil, fmt.Errorf("create sandbox: %w", err)
	}
	r.interpreter = interpreter
	r.notifyCreatedLocked(ctx, interpreter)
	return interpreter, nil
}

func (r *OpenSandboxRunner) notifyCreatedLocked(ctx context.Context, interpreter *opensandbox.CodeInterpreter) {
	if r.cfg.OnCreate == nil {
		return
	}
	endpoint := ""
	epCtx, cancel := context.WithTimeout(ctx, healthCheckTimeout)
	defer cancel()
	if ep, err := interpreter.GetEndpoint(epCtx, execdPort); err == nil {
		endpoint = endpointURL(r.cfg.Protocol, ep.Endpoint)
	}
	r.cfg.OnCreate(interpreter.ID(), endpoint)
}

func endpointURL(protocol, endpoint string) string {
	endpoint = strings.TrimSpace(endpoint)
	if endpoint == "" {
		return ""
	}
	if strings.Contains(endpoint, "://") {
		return endpoint
	}
	return strings.TrimSuffix(protocol, "://") + "://" + endpoint
}

func (r *OpenSandboxRunner) killLocked(ctx context.Context) error {
	if r.interpreter == nil {
		return nil
	}
	if err := r.interpreter.Kill(ctx); err != nil {
		return err
	}
	r.interpreter = nil
	return nil
}

func mapExecution(execution *opensandbox.Execution, collector *executionCollector) Result {
	if execution == nil {
		return Result{}
	}
	res := Result{}
	if collector != nil {
		stdout, stderr, result, truncated := collector.snapshot()
		res.Stdout = stdout
		res.Stderr = stderr
		res.Result = result
		res.Truncated = truncated
	} else {
		res.Stdout = execution.Text()
		res.Stderr = messagesText(execution.Stderr)
		for _, result := range execution.Results {
			if text := result.Text(); text != "" {
				res.Result = text
				break
			}
		}
	}
	if execution.Error != nil {
		if res.Stderr != "" && !strings.HasSuffix(res.Stderr, "\n") {
			res.Stderr += "\n"
		}
		res.Stderr += execution.Error.Name + ": " + execution.Error.Value
		for _, line := range execution.Error.Traceback {
			res.Stderr += "\n" + line
		}
	}
	res.ExitCode = execution.ExitCode
	if res.ExitCode == nil && execution.Error != nil {
		res.ExitCode = execution.Error.ExitCode
	}
	return res
}

func messagesText(messages []opensandbox.OutputMessage) string {
	var b strings.Builder
	for i, message := range messages {
		if i > 0 && !strings.HasSuffix(b.String(), "\n") {
			b.WriteByte('\n')
		}
		b.WriteString(message.Text)
	}
	return b.String()
}

type executionCollector struct {
	mu        sync.Mutex
	limit     int
	stdout    strings.Builder
	stderr    strings.Builder
	result    string
	truncated bool
}

func newExecutionCollector(limit int) *executionCollector {
	if limit <= 0 {
		limit = MaxOutputBytes
	}
	return &executionCollector{limit: limit}
}

func (c *executionCollector) handlers() *opensandbox.ExecutionHandlers {
	return &opensandbox.ExecutionHandlers{
		SkipAccumulation: true,
		OnStdout: func(message opensandbox.OutputMessage) error {
			c.appendText(&c.stdout, message.Text)
			return nil
		},
		OnStderr: func(message opensandbox.OutputMessage) error {
			c.appendText(&c.stderr, message.Text)
			return nil
		},
		OnResult: func(result opensandbox.ExecutionResult) error {
			c.mu.Lock()
			defer c.mu.Unlock()
			if c.result == "" {
				c.result = result.Text()
			}
			return nil
		},
	}
}

func (c *executionCollector) appendText(buf *strings.Builder, text string) {
	if text == "" {
		return
	}
	c.mu.Lock()
	defer c.mu.Unlock()
	if c.truncated {
		return
	}
	if buf.Len() > 0 && !strings.HasSuffix(buf.String(), "\n") {
		buf.WriteString("\n")
	}
	remain := c.limit - c.stdout.Len() - c.stderr.Len()
	if remain <= 0 {
		c.truncated = true
		return
	}
	if len(text) > remain {
		buf.WriteString(truncateUTF8(text, remain))
		c.truncated = true
		return
	}
	buf.WriteString(text)
}

func (c *executionCollector) snapshot() (stdout, stderr, result string, truncated bool) {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.stdout.String(), c.stderr.String(), c.result, c.truncated
}
