export interface ConfigSchema {
  NODE_ENV: 'dev' | 'development' | 'test' | 'prod' | 'production';
  HOST: string;
  PORT: number;
  DB_PATH: string;
  DB_BUSY_TIMEOUT_MS: number;
  ASSETS_PATH: string;
  SESSION_LIFETIME_MS: number;
}

export type ConfigName = keyof ConfigSchema;
export type ConfigValue< K extends ConfigName > = ConfigSchema[ K ];

export type ConfigDefinition< T > = {
  default: T;
  desc: string;
} & (
  T extends number
    ? { type: 'integer', min: number, max: number }
    : { type: 'string' | 'path' | 'enum', values?: readonly string[] }
);

export type ConfigTable = {
  [ K in ConfigName ]: ConfigDefinition< ConfigSchema[ K ] >
};
