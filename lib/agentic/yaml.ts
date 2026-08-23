import type { JsonSchema } from "@/lib/agentic/api-catalog";

/**
 * Dependency-free emitter that serializes the OpenAPI object to valid YAML
 * 1.2 (block style). Only the shapes the spec uses are supported: maps, seqs,
 * scalars. Kept pure so tests can assert exact output.
 */

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function needsQuoting(value: string): boolean {
  if (value === "") return true;
  // Leading/trailing space, indicator chars, YAML structural tokens.
  if (/^[\s#&*!|>'"%@`,{}[\]:?-]/.test(value) || /[\s:]$/.test(value)) return true;
  if (/[:#]\s/.test(value)) return true;
  if (/\n|\r|\t/.test(value)) return true;
  // Strings that would parse as another scalar type must be quoted.
  if (/^(true|false|null|~|on|off|yes|no)$/i.test(value)) return true;
  if (!Number.isNaN(Number(value))) return true;
  // ISO-like prefixes can become timestamps under YAML 1.1 resolvers.
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) return true;
  return /^\s*[-?](\s|$)/.test(value);
}

function quoteIfNeeded(value: string): string {
  if (!needsQuoting(value)) return value;
  const escaped = value.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n").replace(/\r/g, "\\r").replace(/\t/g, "\\t");
  return `"${escaped}"`;
}

function scalar(value: unknown): string {
  if (value === null || value === undefined) return "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : quoteIfNeeded(String(value));
  return quoteIfNeeded(String(value));
}

function emitMap(map: Record<string, unknown>, indent: number, lines: string[]): void {
  const pad = " ".repeat(indent);
  for (const [key, value] of Object.entries(map)) {
    if (value === undefined) continue;
    emitKeyValue(`${pad}${quoteIfNeeded(key)}:`, value, indent, lines);
  }
}

function emitSeq(seq: readonly unknown[], indent: number, lines: string[]): void {
  const pad = " ".repeat(indent);
  for (const item of seq) {
    if (isPlainObject(item)) {
      const itemLines: string[] = [];
      emitMap(item as Record<string, unknown>, indent + 2, itemLines);
      // Put the first key on the dash line, e.g. "- operationId: getHealth".
      if (itemLines.length > 0) {
        lines.push(`${pad}- ${itemLines[0].slice(indent + 2)}`);
        lines.push(...itemLines.slice(1));
      } else {
        lines.push(`${pad}- {}`);
      }
    } else if (Array.isArray(item)) {
      lines.push(`${pad}-`);
      emitSeq(item, indent + 2, lines);
    } else {
      lines.push(`${pad}- ${scalar(item)}`);
    }
  }
}

function emitKeyValue(prefix: string, value: unknown, indent: number, lines: string[]): void {
  if (isPlainObject(value)) {
    const entries = Object.entries(value).filter(([, v]) => v !== undefined);
    if (entries.length === 0) {
      lines.push(`${prefix} {}`);
      return;
    }
    lines.push(prefix);
    emitMap(value, indent + 2, lines);
  } else if (Array.isArray(value)) {
    if (value.length === 0) {
      lines.push(`${prefix} []`);
      return;
    }
    lines.push(prefix);
    emitSeq(value, indent + 2, lines);
  } else {
    lines.push(`${prefix} ${scalar(value)}`);
  }
}

/** Serialize a JSON-compatible value to a YAML document string. */
export function toYaml(value: Record<string, unknown>): string {
  const lines: string[] = [];
  emitMap(value, 0, lines);
  return `${lines.join("\n")}\n`;
}

/** Convert a JsonSchema into a plain object ready for YAML/JSON emission. */
export function schemaToObject(schema: JsonSchema): Record<string, unknown> {
  const out: Record<string, unknown> = { type: schema.type };
  if (schema.description) out.description = schema.description;
  if (schema.maxLength !== undefined) out.maxLength = schema.maxLength;
  if (schema.minimum !== undefined) out.minimum = schema.minimum;
  if (schema.maximum !== undefined) out.maximum = schema.maximum;
  if (schema.additionalProperties !== undefined) out.additionalProperties = schema.additionalProperties;
  if (schema.required?.length) out.required = [...schema.required];
  if (schema.items) out.items = schemaToObject(schema.items);
  if (schema.properties) {
    out.properties = Object.fromEntries(Object.entries(schema.properties).map(([key, child]) => [key, schemaToObject(child)]));
  }
  return out;
}
