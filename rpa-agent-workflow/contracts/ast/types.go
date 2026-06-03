package ast

type Workflow struct {
	SchemaVersion string           `json:"schemaVersion"`
	Workflow      Metadata         `json:"workflow"`
	Inputs        []Port           `json:"inputs,omitempty"`
	Outputs       []Port           `json:"outputs,omitempty"`
	Variables     []Variable       `json:"variables,omitempty"`
	State         map[string]State `json:"state,omitempty"`
	Workflows     []SubWorkflow    `json:"workflows,omitempty"`
	Body          Statement        `json:"body"`
	Policies      *Policies        `json:"policies,omitempty"`
	Metadata      map[string]any   `json:"metadata,omitempty"`
}

type Metadata struct {
	ID          string `json:"id"`
	Name        string `json:"name,omitempty"`
	Label       string `json:"label,omitempty"`
	Description string `json:"description,omitempty"`
}

type SubWorkflow struct {
	ID        string           `json:"id"`
	Inputs    []Port           `json:"inputs,omitempty"`
	Outputs   []Port           `json:"outputs,omitempty"`
	Variables []Variable       `json:"variables,omitempty"`
	State     map[string]State `json:"state,omitempty"`
	Body      Statement        `json:"body"`
	Policies  *Policies        `json:"policies,omitempty"`
	Metadata  map[string]any   `json:"metadata,omitempty"`
}

type Port struct {
	Name string `json:"name"`
	Type Type   `json:"type"`
}

type Variable struct {
	Name    string `json:"name"`
	Type    Type   `json:"type"`
	Scope   string `json:"scope,omitempty"`
	Mutable bool   `json:"mutable,omitempty"`
}

type State struct {
	Type         Type        `json:"type"`
	InitialValue *Expression `json:"initialValue,omitempty"`
}

type Policies struct {
	TimeoutMs int64        `json:"timeoutMs,omitempty"`
	OnError   string       `json:"onError,omitempty"`
	Retry     *RetryPolicy `json:"retry,omitempty"`
}

type RetryPolicy struct {
	MaxAttempts int64 `json:"maxAttempts,omitempty"`
	BackoffMs   int64 `json:"backoffMs,omitempty"`
}

type Statement struct {
	ID         string                `json:"id"`
	Kind       string                `json:"kind"`
	Block      string                `json:"block,omitempty"`
	Workflow   string                `json:"workflow,omitempty"`
	Inputs     map[string]Expression `json:"inputs,omitempty"`
	Outputs    map[string]Expression `json:"outputs,omitempty"`
	Target     string                `json:"target,omitempty"`
	Value      *Expression           `json:"value,omitempty"`
	Condition  *Expression           `json:"condition,omitempty"`
	Iterable   *Expression           `json:"iterable,omitempty"`
	ItemVar    string                `json:"itemVar,omitempty"`
	Statements []Statement           `json:"statements,omitempty"`
	Then       []Statement           `json:"then,omitempty"`
	Else       []Statement           `json:"else,omitempty"`
	Branches   []Branch              `json:"branches,omitempty"`
	Catches    []CatchClause         `json:"catches,omitempty"`
	Finally    []Statement           `json:"finally,omitempty"`
	LoopKind   string                `json:"loopKind,omitempty"`
	Join       *ParallelJoin         `json:"join,omitempty"`
	Returns    map[string]Expression `json:"returns,omitempty"`
	Metadata   map[string]any        `json:"metadata,omitempty"`
}

type Branch struct {
	ID   string      `json:"id"`
	Body []Statement `json:"body,omitempty"`
}

type CatchClause struct {
	Pattern string      `json:"pattern,omitempty"`
	As      string      `json:"as,omitempty"`
	Body    []Statement `json:"body,omitempty"`
}

type ParallelJoin struct {
	Strategy  string `json:"strategy"`
	TimeoutMs int64  `json:"timeoutMs,omitempty"`
	OnError   string `json:"onError,omitempty"`
}

type Type struct {
	Name        string          `json:"name"`
	Optional    bool            `json:"optional,omitempty"`
	Nullable    bool            `json:"nullable,omitempty"`
	Items       *Type           `json:"items,omitempty"`
	Properties  map[string]Type `json:"properties,omitempty"`
	AnyOf       []Type          `json:"anyOf,omitempty"`
	Enum        []string        `json:"enum,omitempty"`
	Description string          `json:"description,omitempty"`
}

type Expression struct {
	Kind     string                `json:"kind"`
	Value    any                   `json:"value,omitempty"`
	Ref      string                `json:"ref,omitempty"`
	Name     string                `json:"name,omitempty"`
	Op       string                `json:"op,omitempty"`
	Left     *Expression           `json:"left,omitempty"`
	Right    *Expression           `json:"right,omitempty"`
	Args     []Expression          `json:"args,omitempty"`
	Items    []Expression          `json:"items,omitempty"`
	Fields   map[string]Expression `json:"fields,omitempty"`
	Selector string                `json:"selector,omitempty"`
}
