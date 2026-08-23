import { getAgentCallableOperations, type ApiOperation } from "@/lib/agentic/api-catalog";
import { schemaToObject } from "@/lib/agentic/yaml";

/**
 * Builds LLM function-calling definitions (OpenAI-compatible shape) from the
 * API catalog. Only zero-auth or explicitly agent-callable operations are
 * exposed as callable functions.
 */

function parametersFor(operation: ApiOperation): Record<string, unknown> {
  const properties: Record<string, unknown> = {};
  const required: string[] = [];

  for (const parameter of operation.parameters ?? []) {
    if (parameter.in !== "query") continue;
    properties[parameter.name] = {
      type: parameter.schema.type,
      description: parameter.description,
      ...(parameter.schema.enum ? { enum: [...parameter.schema.enum] } : {}),
      ...(parameter.schema.default !== undefined ? { default: parameter.schema.default } : {})
    };
    if (parameter.required) required.push(parameter.name);
  }

  if (operation.requestBody) {
    const body = schemaToObject(operation.requestBody.schema);
    if (body.properties && typeof body.properties === "object") Object.assign(properties, body.properties);
    if (Array.isArray(body.required)) required.push(...(body.required as string[]));
  }

  return { type: "object", properties, ...(required.length > 0 ? { required } : {}), additionalProperties: false };
}

export function buildFunctionCallingTools(baseUrl: string): Array<Record<string, unknown>> {
  const seen = new Set<string>();
  const tools: Array<Record<string, unknown>> = [];
  for (const operation of getAgentCallableOperations()) {
    if (seen.has(operation.operationId)) continue;
    seen.add(operation.operationId);
    tools.push({
      type: "function",
      function: {
        name: operation.operationId,
        description: `${operation.summary}. ${operation.description} Endpoint: ${operation.method} ${baseUrl}${operation.path}`,
        parameters: parametersFor(operation)
      }
    });
  }
  return tools;
}
