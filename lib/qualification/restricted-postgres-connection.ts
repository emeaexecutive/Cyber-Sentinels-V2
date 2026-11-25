import { Client } from "pg";
import { RestrictedPostgresAdapter, type RestrictedSqlConnection } from "./restricted-postgres-adapter";
import type { RestrictedPreviewCommand } from "./restricted-preview-gateway";

export const RESTRICTED_POSTGRES_PRIVILEGE_CHECK = `select current_user=session_user and current_user='execution20_gateway_login'
        and not exists(select 1 from pg_roles where rolname in (current_user,'execution20_gateway_owner') and (rolsuper or rolbypassrls or rolcreatedb or rolcreaterole or rolreplication))
        and not exists(select 1 from pg_auth_members where member in (select oid from pg_roles where rolname in (current_user,'execution20_gateway_owner')))
        and not exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
          where n.nspname not in ('pg_catalog','information_schema')
          and not (n.nspname='qualification20' and p.proname in ('schema_read','agent_register','authority_read','decision_create','review_read','replay_read')
            and p.proargtypes::text='25 25 25 3802 25' and p.prorettype='jsonb'::regtype and p.prosecdef
            and p.proowner=(select oid from pg_roles where rolname='execution20_gateway_owner'))
          and has_schema_privilege(current_user,n.oid,'USAGE') and has_function_privilege(current_user,p.oid,'EXECUTE'))
        and not exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
          where n.nspname not in ('pg_catalog','information_schema') and c.relkind in ('r','v','m','p')
          and has_schema_privilege(current_user,n.oid,'USAGE') and has_table_privilege(current_user,c.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')) as restricted`;

type Connection = { connect(): Promise<void>; query(sql: string, values?: readonly unknown[]): Promise<{ rows: Record<string, unknown>[] }>; end(): Promise<void> };
const stagingRef = "agpyhygpfmppjkxwcpac";
export function restrictedPostgresUrl(value: string) {
  const url = new URL(value);
  const user = decodeURIComponent(url.username);
  if (!["postgres:", "postgresql:"].includes(url.protocol) || url.hash || url.search
    || !url.password || !["", "5432", "6543"].includes(url.port) || url.pathname !== "/postgres"
    || !(url.hostname === `db.${stagingRef}.supabase.co` && user === "execution20_gateway_login"
      || url.hostname.endsWith(".pooler.supabase.com") && user === `execution20_gateway_login.${stagingRef}`)) {
    throw new Error("RESTRICTED_DATABASE_BINDING_INVALID");
  }
  return url.href;
}
/** A concrete TLS driver for the existing fixed wrappers; no general application/service-role fallback. */
export class RestrictedPostgresConnectionAdapter {
  constructor(private readonly url: string, private readonly createClient: (url: string) => Connection = url => new Client({ connectionString: url, ssl: { rejectUnauthorized: true }, connectionTimeoutMillis: 5000, statement_timeout: 3000, query_timeout: 5000 })) {
    restrictedPostgresUrl(url);
  }
  async execute(command: RestrictedPreviewCommand) {
    const client = this.createClient(restrictedPostgresUrl(this.url));
    try {
      await client.connect();
      const check = await client.query(RESTRICTED_POSTGRES_PRIVILEGE_CHECK);
      if (check.rows[0]?.restricted !== true) throw new Error("RESTRICTED_DATABASE_PRIVILEGES_INVALID");
      const connection: RestrictedSqlConnection = { query: async (sql, parameters) => {
        const result = await client.query(sql, parameters);
        return { rows: result.rows.map(row => ({ result: row.result })) };
      } };
      return await new RestrictedPostgresAdapter(connection).execute(command);
    } finally { await client.end(); }
  }
}
