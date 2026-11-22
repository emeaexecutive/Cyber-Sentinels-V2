import type { RestrictedPreviewCommand, RestrictedPreviewExecutionAdapter } from "./restricted-preview-gateway";

export type RestrictedSqlConnection = { query(sql: string, parameters: readonly unknown[]): Promise<{ rows: { result: unknown }[] }> };
const wrappers = {
  "qualification.schema.read": "schema_read", "qualification.agent.register": "agent_register",
  "qualification.authority.read": "authority_read", "qualification.decision.create": "decision_create",
  "qualification.review.read": "review_read", "qualification.replay.read": "replay_read",
} as const;
/** Host supplies a dedicated restricted LOGIN connection, never a service-role client.
 * Both capability policy and database wrappers independently enforce the run boundary.
 */
export class RestrictedPostgresAdapter implements RestrictedPreviewExecutionAdapter {
  constructor(private readonly connection: RestrictedSqlConnection) {}
  async execute(command: RestrictedPreviewCommand) {
    const wrapper = Object.hasOwn(wrappers, command.operation) ? wrappers[command.operation] : null;
    if (!wrapper) throw new Error("RESTRICTED_OPERATION_DENIED");
    const result = await this.connection.query(`select qualification20.${wrapper}($1,$2,$3,$4::jsonb,$5) as result`, [command.tenantId, command.subjectId, command.runId, JSON.stringify(command.payload), command.requestId]);
    if (result.rows.length !== 1) throw new Error("RESTRICTED_RESULT_INVALID");
    return result.rows[0].result;
  }
}
