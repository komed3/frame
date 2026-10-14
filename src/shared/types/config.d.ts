export type ConfigDefinition =
  | { type: 'string' | 'path'; default: string; description: string }
  | { type: 'integer'; default: number; min: number; max?: number; description: string }
  | { type: 'enum'; default: string; values: readonly string[]; description: string };

export type ConfigName < T extends Record < string, ConfigDefinition > > = keyof T & string;

export type ConfigValue < T extends ConfigDefinition > =
  T extends { type: 'integer' } ? number :
  T extends { type: 'enum'; values: readonly ( infer V )[] } ? V :
  string;
