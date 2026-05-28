package block

type Definition struct {
	SchemaVersion string            `json:"schemaVersion"`
	ID            string            `json:"id"`
	Namespace     string            `json:"namespace"`
	Name          string            `json:"name"`
	Version       string            `json:"version"`
	Runtime       RuntimeBinding    `json:"runtime"`
	Inputs        []Port            `json:"inputs,omitempty"`
	Outputs       []Port            `json:"outputs,omitempty"`
	Config        []Port            `json:"config,omitempty"`
	Metadata      map[string]any    `json:"metadata,omitempty"`
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
	Name     string `json:"name"`
	Optional bool   `json:"optional,omitempty"`
}
