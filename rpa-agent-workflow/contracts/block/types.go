package block

type Definition struct {
	SchemaVersion string            `json:"schemaVersion"`
	ID            string            `json:"id"`
	Namespace     string            `json:"namespace"`
	Name          string            `json:"name"`
	Version       string            `json:"version"`
	Display       Display           `json:"display,omitempty"`
	Description   string            `json:"description,omitempty"`
	Runtime       RuntimeBinding    `json:"runtime"`
	Inputs        []Port            `json:"inputs,omitempty"`
	Outputs       []Port            `json:"outputs,omitempty"`
	Config        []Port            `json:"config,omitempty"`
	Permissions   []string          `json:"permissions,omitempty"`
	SideEffects   []string          `json:"sideEffects,omitempty"`
	Errors        []ErrorSpec       `json:"errors,omitempty"`
	Examples      []Example         `json:"examples,omitempty"`
	Compatibility Compatibility     `json:"compatibility,omitempty"`
	Metadata      map[string]any    `json:"metadata,omitempty"`
}

type Display struct {
	Label string `json:"label,omitempty"`
	Icon  string `json:"icon,omitempty"`
	Color string `json:"color,omitempty"`
}

type RuntimeBinding struct {
	Target   string `json:"target"`
	Module   string `json:"module"`
	Callable string `json:"callable"`
	Mode     string `json:"mode"`
}

type Port struct {
	Name string `json:"name"`
	Type Type   `json:"type"`
}

type Type struct {
	Name        string           `json:"name"`
	Optional    bool             `json:"optional,omitempty"`
	Nullable    bool             `json:"nullable,omitempty"`
	Items       *Type            `json:"items,omitempty"`
	Properties  map[string]Type  `json:"properties,omitempty"`
	AnyOf       []Type           `json:"anyOf,omitempty"`
	Enum        []string         `json:"enum,omitempty"`
	Description string           `json:"description,omitempty"`
}

type ErrorSpec struct {
	Code        string `json:"code"`
	Description string `json:"description,omitempty"`
}

type Example struct {
	Name string `json:"name,omitempty"`
	Input string `json:"input,omitempty"`
	Output string `json:"output,omitempty"`
}

type Compatibility struct {
	MinVersion string `json:"minVersion,omitempty"`
	MaxVersion string `json:"maxVersion,omitempty"`
}
