package uinode

type Document struct {
	SchemaVersion string         `json:"schemaVersion"`
	WorkflowID    string         `json:"workflowId"`
	Root          Node           `json:"root"`
	Nodes         []Node         `json:"nodes,omitempty"`
	Metadata      map[string]any `json:"metadata,omitempty"`
}

type Node struct {
	ID                string             `json:"id"`
	Kind              string             `json:"kind"`
	Label             string             `json:"label,omitempty"`
	Path              string             `json:"path,omitempty"`
	Children          []Node             `json:"children,omitempty"`
	Branches          []Branch           `json:"branches,omitempty"`
	Ports             []Port             `json:"ports,omitempty"`
	Layout            Layout             `json:"layout,omitempty"`
	Collapsed         bool               `json:"collapsed,omitempty"`
	Editable          bool               `json:"editable,omitempty"`
	Operations        []Operation        `json:"operations,omitempty"`
	Inspector         []InspectorField   `json:"inspector,omitempty"`
	ValidationSummary *ValidationSummary `json:"validationSummary,omitempty"`
	Metadata          map[string]any     `json:"metadata,omitempty"`
}

type Branch struct {
	ID       string `json:"id"`
	Label    string `json:"label,omitempty"`
	Kind     string `json:"kind,omitempty"`
	Children []Node `json:"children,omitempty"`
}

type Port struct {
	Name string `json:"name"`
	Kind string `json:"kind,omitempty"`
	Role string `json:"role,omitempty"`
}

type Layout struct {
	Direction string  `json:"direction,omitempty"`
	X         float64 `json:"x,omitempty"`
	Y         float64 `json:"y,omitempty"`
	Width     float64 `json:"width,omitempty"`
	Height    float64 `json:"height,omitempty"`
	Lane      int     `json:"lane,omitempty"`
}

type Operation struct {
	Type    string `json:"type"`
	Label   string `json:"label,omitempty"`
	Enabled bool   `json:"enabled,omitempty"`
}

type InspectorField struct {
	Path     string `json:"path"`
	Label    string `json:"label,omitempty"`
	Control  string `json:"control,omitempty"`
	Value    any    `json:"value,omitempty"`
	Readonly bool   `json:"readonly,omitempty"`
}

type ValidationSummary struct {
	Errors   int `json:"errors,omitempty"`
	Warnings int `json:"warnings,omitempty"`
}
