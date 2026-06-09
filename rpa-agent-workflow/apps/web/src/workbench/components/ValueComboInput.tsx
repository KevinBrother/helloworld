import { Button, Input } from "@aientry/ui-components";
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
  const [localError, setLocalError] = useState("");
  const activeSource = activeSourceId ? sourceOptions.find((source) => source.id === activeSourceId) : undefined;
  const activeSourceLabel = activeSource ? activeSource.id : activeSourceId;
  const hasLiteralOptions = Boolean(field.options?.length);
  const hasReferenceOptions = field.type !== "unknown" && sourceOptions.length > 0;
  const canOpenMenu = hasLiteralOptions || hasReferenceOptions;
  const [draftValue, setDraftValue] = useState<string | null>(null);
  const displayValue = draftValue ?? String(activeSourceLabel ? `{{${activeSourceLabel}}}` : resolvedValue);
  const visibleError = localError || error;

  const literalOptions = useMemo(() => field.options ?? [], [field.options]);

  useEffect(() => {
    setDraftValue(null);
    setLocalError("");
  }, [field.path, field.value]);

  return (
    <div className={activeSourceId ? "value-combo linked" : "value-combo"}>
      <div className={visibleError ? "value-combo-control invalid" : "value-combo-control"}>
        <Input
          aria-invalid={Boolean(visibleError)}
          aria-describedby={visibleError ? `${field.key}-error` : undefined}
          ref={inputRef}
          aria-label={`${field.label} value`}
          value={displayValue}
          onChange={(event) => {
            const parsed = parseValueComboInput(event.target.value, field.type);
            setDraftValue(event.target.value);
            if (parsed.ok) {
              setLocalError("");
              onFieldChange(field, { kind: "literal", value: parsed.value });
            } else {
              setLocalError(parsed.error);
            }
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
          <Button
            aria-label={`引用 ${field.label}`}
            className={activeSourceId ? "combo-link-button active" : "combo-link-button"}
            variant="ghost"
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              inputRef.current?.focus();
              onOpenChange(hasReferenceOptions ? !isOpen : false);
            }}
          >
            <Link2 size={15} />
          </Button>
        ) : null}
        {canOpenMenu ? (
          <Button
            aria-label={isOpen ? "关闭可选值" : "打开可选值"}
            className="combo-menu-button"
            variant="ghost"
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              inputRef.current?.focus();
              onOpenChange(!isOpen);
            }}
          >
            <ChevronDown size={15} />
          </Button>
        ) : null}
      </div>

      {canOpenMenu && isOpen ? (
        <div className="value-combo-menu" role="listbox">
          {hasLiteralOptions ? (
            <ComboSection title="可选值">
              {literalOptions.map((option) => (
                <Button
                  className={!activeSourceId && String(resolvedValue) === option ? "active" : ""}
                  variant="ghost"
                  key={option}
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    const parsed = parseValueComboInput(option, field.type);
                    if (!parsed.ok) {
                      setLocalError(parsed.error);
                      return;
                    }
                    setDraftValue(null);
                    setLocalError("");
                    onFieldChange(field, { kind: "literal", value: parsed.value });
                    onOpenChange(false);
                  }}
                >
                  <strong>{option}</strong>
                </Button>
              ))}
            </ComboSection>
          ) : null}

          {hasReferenceOptions ? (
            <ComboSection title="引用变量">
              {sourceOptions.map((source) => (
                <Button
                  className={activeSourceId === source.id ? "active" : ""}
                  variant="ghost"
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
                </Button>
              ))}
            </ComboSection>
          ) : null}
        </div>
      ) : null}
      {visibleError ? (
        <span className="field-error" id={`${field.key}-error`}>
          {visibleError}
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

export function parseValueComboInput(value: string, type: WorkbenchField["type"]): { ok: true; value: unknown } | { ok: false; error: string } {
  if (value.trim() === "") {
    return type === "number" ? { ok: false, error: "必须是数字" } : { ok: true, value: "" };
  }
  if (type === "number") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? { ok: true, value: parsed } : { ok: false, error: "必须是数字" };
  }
  if (type === "boolean") return { ok: true, value: value === "true" };
  return { ok: true, value };
}
