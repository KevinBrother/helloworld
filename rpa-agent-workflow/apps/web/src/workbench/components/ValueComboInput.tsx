import { ChevronDown, Link2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  makeFieldValueFromSource,
  type WorkbenchField,
  type WorkbenchSource,
} from "../../workbenchModel";

type ValueComboInputProps = {
  activeSourceId?: string;
  error?: string;
  field: WorkbenchField;
  isOpen: boolean;
  resolvedValue: unknown;
  sourceOptions: WorkbenchSource[];
  onFieldChange: (field: WorkbenchField, value: unknown) => void;
  onOpenChange: (nextOpen: boolean) => void;
};

export function ValueComboInput({
  activeSourceId,
  error,
  field,
  isOpen,
  resolvedValue,
  sourceOptions,
  onFieldChange,
  onOpenChange,
}: ValueComboInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const activeSource = activeSourceId ? sourceOptions.find((source) => source.id === activeSourceId) : undefined;
  const activeSourceLabel = activeSource ? activeSource.id : activeSourceId;
  const hasLiteralOptions = Boolean(field.options?.length);
  const hasReferenceOptions = field.type !== "unknown" && sourceOptions.length > 0;
  const canOpenMenu = hasLiteralOptions || hasReferenceOptions;
  const [draftValue, setDraftValue] = useState<string | null>(null);
  const displayValue = draftValue ?? String(activeSourceLabel ? `{{${activeSourceLabel}}}` : resolvedValue);

  const literalOptions = useMemo(() => field.options ?? [], [field.options]);

  useEffect(() => {
    setDraftValue(null);
  }, [field.path, field.value]);

  return (
    <div className={activeSourceId ? "value-combo linked" : "value-combo"}>
      <div className={error ? "value-combo-control invalid" : "value-combo-control"}>
        <input
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${field.key}-error` : undefined}
          ref={inputRef}
          aria-label={`${field.label} value`}
          value={displayValue}
          onChange={(event) => {
            setDraftValue(event.target.value);
            onFieldChange(field, { kind: "literal", value: parseFieldInput(event.target.value, field.type) });
            if (canOpenMenu && event.target.value.includes("{{")) {
              onOpenChange(true);
            }
          }}
          onFocus={(event) => {
            if (activeSourceId) event.currentTarget.select();
            if (canOpenMenu) onOpenChange(true);
          }}
          onClick={(event) => {
            if (activeSourceId) event.currentTarget.select();
          }}
        />
        {activeSourceId || hasReferenceOptions ? (
          <button
            aria-label={`引用 ${field.label}`}
            className={activeSourceId ? "combo-link-button active" : "combo-link-button"}
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              inputRef.current?.focus();
              onOpenChange(hasReferenceOptions ? !isOpen : false);
            }}
          >
            <Link2 size={15} />
          </button>
        ) : null}
        {canOpenMenu ? (
          <button
            aria-label={isOpen ? "关闭可选值" : "打开可选值"}
            className="combo-menu-button"
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              inputRef.current?.focus();
              onOpenChange(!isOpen);
            }}
          >
            <ChevronDown size={15} />
          </button>
        ) : null}
      </div>

      {canOpenMenu && isOpen ? (
        <div className="value-combo-menu" role="listbox">
          {hasLiteralOptions ? (
            <ComboSection title="可选值">
              {literalOptions.map((option) => (
                <button
                  className={!activeSourceId && String(resolvedValue) === option ? "active" : ""}
                  key={option}
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    setDraftValue(null);
                    onFieldChange(field, { kind: "literal", value: parseFieldInput(option, field.type) });
                    onOpenChange(false);
                  }}
                >
                  <strong>{option}</strong>
                </button>
              ))}
            </ComboSection>
          ) : null}

          {hasReferenceOptions ? (
            <ComboSection title="引用变量">
              {sourceOptions.map((source) => (
                <button
                  className={activeSourceId === source.id ? "active" : ""}
                  key={source.id}
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    setDraftValue(null);
                    onFieldChange(field, makeFieldValueFromSource(source.id));
                    onOpenChange(false);
                  }}
                >
                  <span>{source.nodeLabel}</span>
                  <strong>{source.output}</strong>
                  <code>{source.type}</code>
                  <em>{source.displayValue}</em>
                </button>
              ))}
            </ComboSection>
          ) : null}
        </div>
      ) : null}
      {error ? (
        <span className="field-error" id={`${field.key}-error`}>
          {error}
        </span>
      ) : null}
    </div>
  );
}

function ComboSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="combo-section">
      <h4>{title}</h4>
      <div>{children}</div>
    </section>
  );
}

function parseFieldInput(value: string, type: WorkbenchField["type"]) {
  if (value.trim() === "") return "";
  if (type === "number") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : value;
  }
  if (type === "boolean") return value === "true";
  return value;
}
