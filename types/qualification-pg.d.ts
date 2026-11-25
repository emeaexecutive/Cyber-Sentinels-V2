declare module "pg" {
  export class Client {
    constructor(config: { connectionString: string; ssl: { rejectUnauthorized: boolean }; connectionTimeoutMillis: number; statement_timeout: number; query_timeout: number });
    connect(): Promise<void>;
    query(sql: string, values?: readonly unknown[]): Promise<{ rows: Record<string, unknown>[] }>;
    end(): Promise<void>;
  }
}
