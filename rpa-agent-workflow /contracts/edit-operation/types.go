package editoperation

const (
	OperationTypeToggleCollapsed = "toggleCollapsed"
	OperationTypeUpdateField     = "updateField"
	OperationTypeInsertNode      = "insertNode"
	OperationTypeDeleteNode      = "deleteNode"
	OperationTypeMoveStatement   = "moveStatement"
	OperationTypeDuplicateNode   = "duplicateNode"
	OperationTypeReplaceSubtree  = "replaceSubtree"
)

type Document struct {
	SchemaVersion string         `json:"schemaVersion"`
	OperationID   string         `json:"operationId"`
	Type          string         `json:"type"`
	TargetNodeID  string         `json:"targetNodeId,omitempty"`
	Path          string         `json:"path,omitempty"`
	Payload       map[string]any `json:"payload,omitempty"`
	Actor         *Actor         `json:"actor,omitempty"`
	Metadata      map[string]any `json:"metadata,omitempty"`
}

type Actor struct {
	ID   string `json:"id,omitempty"`
	Name string `json:"name,omitempty"`
	Kind string `json:"kind,omitempty"`
}
