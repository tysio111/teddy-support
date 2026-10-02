import { z } from 'zod';
import { ActionParameter } from '../../action-parameters/domain/action-parameter';

// enumValues is stored as a string: accept a JSON array or a comma-separated
// list.
export function parseEnumValues(
  enumValues: ActionParameter['enumValues'],
): string[] {
  if (!enumValues?.trim()) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(enumValues);
    if (Array.isArray(parsed)) {
      return parsed.map(String).filter((value) => value.length > 0);
    }
  } catch {
    // Not JSON, fall through to comma-separated.
  }

  return enumValues
    .split(',')
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}

function baseSchema(parameter: ActionParameter): z.ZodType {
  const enumValues = parseEnumValues(parameter.enumValues);
  if (enumValues.length) {
    return z.enum(enumValues as [string, ...string[]]);
  }

  switch (parameter.type?.toLowerCase()) {
    case 'number':
    case 'integer':
    case 'float':
      return z.number();
    case 'boolean':
      return z.boolean();
    default:
      return z.string();
  }
}

// Every field is nullable (even required ones) so the model can report a
// missing value instead of inventing one.
export function buildParameterSchema(parameters: ActionParameter[]) {
  const shape: Record<string, z.ZodType> = {};
  for (const parameter of parameters) {
    shape[parameter.name] = baseSchema(parameter)
      .nullable()
      .describe(parameter.description);
  }

  return z.object(shape);
}
