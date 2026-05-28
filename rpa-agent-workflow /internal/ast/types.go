package ast

type Workflow struct {
	SchemaVersion string `json:"schemaVersion"`
	Workflow      Metadata         `json:"workflow"`
	Inputs        []Port           `json:"inputs,omitempty"`
	Outputs       []Port           `json:"outputs,omitempty"`
	Variables     []Variable       `json:"variables,omitempty"`
	Body          Statement       `json:"body"`
	Policies      *Policies       `json:"policies,omitempty"`
	Metadata      map[string]any   `json:"metadata,omitempty"`
}

type Metadata struct {
	ID    string `json:"id"`
	Name  string `json:"name,omitempty"`
	Label string `json:"label,omitempty"`
}

type Port struct {
	Name string `json:"name"`
	Type Type   `json:"type"`
}

type Variable struct {
	Name string `json:"name"`
	Type Type   `json:"type"`
}

type Policies struct {
	TimeoutMs int64  `json:"timeoutMs,omitempty"`
	OnError   string `json:"onError,omitempty"`
}

type Statement struct {
	ID        string         `json:"id"`
	Kind      string         `json:"kind"`
	Block     string         `json:"block,omitempty"`
	Inputs    map[string]Expression `json:"inputs,omitempty"`
	Statements []Statement   `json:"statements,omitempty"`
	Branches  []Branch       `json:"branches,omitempty"`
	Metadata  map[string]any `json:"metadata,omitempty"`
}

type Branch struct {
	ID    string      `json:"id"`
	Body  []Statement `json:"body,omitempty"`
}

type Type struct {
	Name     string `json:"name"`
	Optional bool   `json:"optional,omitempty"`
}

type Expression struct {
	Kind   string `json:"kind"`
	Value  any    `json:"value,omitempty"`
	Ref    string `json:"ref,omitempty"`
	Op     string `json:"op,omitempty"`
	Left   *Expression `json:"left,omitempty"`
	Right  *Expression `json:"right,omitempty"`
	Items  []Expression `json:"items,omitempty"`
	Fields  map[string]Expression `json:"fields,omitempty"`
}
