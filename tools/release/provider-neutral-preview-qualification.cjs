/* eslint-disable @typescript-eslint/no-require-imports */
const { createHash, randomUUID } = require("node:crypto");
const { Client } = require("pg");

const connectionString = process.env.PROVIDER_NEUTRAL_PREVIEW_DB_URL;
const previewReference = process.env.PROVIDER_NEUTRAL_PREVIEW_REF;

if (!connectionString || !previewReference) {
  throw new Error(
    "PROVIDER_NEUTRAL_PREVIEW_DB_URL and PROVIDER_NEUTRAL_PREVIEW_REF are required.",
  );
}

const digest = (value) => createHash("sha256").update(value).digest("hex");
const assert = (condition, message) => {
  if (!condition) throw new Error(`ASSERTION_FAILED:${message}`);
};

const runKey = Date.now().toString(36);
const ids = {
  run: runKey,
  tenantA: randomUUID(),
  tenantB: randomUUID(),
  userA: randomUUID(),
  userB: randomUUID(),
  actorA: randomUUID(),
  entity: `entity:alpha:${runKey}`,
  externalA: randomUUID(),
  externalACorrection: randomUUID(),
  externalB: randomUUID(),
  relationshipA: randomUUID(),
  relationshipB: randomUUID(),
  transition: randomUUID(),
  change: randomUUID(),
  transaction: randomUUID(),
  decision: randomUUID(),
  correlation: randomUUID(),
  replay: randomUUID(),
  memory: randomUUID(),
  providerA: `qual-provider-a-${runKey}`,
  providerB: `qual-provider-b-${runKey}`,
};

const client = new Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

async function transactionAs(role, userId, callback) {
  await client.query("begin");
  try {
    await client.query(`set local role ${role}`);
    if (userId) {
      await client.query(
        "select set_config('request.jwt.claim.sub',$1,true), set_config('request.jwt.claim.role',$2,true)",
        [userId, role],
      );
    }
    const result = await callback();
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback");
    throw error;
  }
}

async function expectDenied(label, callback, expected = ["42501", "permission denied"]) {
  let denied = false;
  try {
    await callback();
  } catch (error) {
    const text = `${error.code ?? ""} ${error.message ?? ""}`.toLowerCase();
    denied = expected.some((candidate) => text.includes(candidate.toLowerCase()));
    if (!denied) throw error;
  }
  assert(denied, label);
}

async function insertFixtures() {
  await transactionAs("service_role", null, async () => {
    await client.query(
      `insert into public.trust_workspaces(id,name,slug,description,created_by)
       values($1,'Qualification Tenant A',$2,'synthetic non-production tenant',$3),
             ($4,'Qualification Tenant B',$5,'synthetic non-production tenant',$6)`,
      [
        ids.tenantA,
        `qual-a-${ids.run}`,
        ids.userA,
        ids.tenantB,
        `qual-b-${ids.run}`,
        ids.userB,
      ],
    );
    await client.query(
      `insert into public.workspace_members(workspace_id,user_id,role)
       values($1,$2,'admin'),($3,$4,'admin')`,
      [ids.tenantA, ids.userA, ids.tenantB, ids.userB],
    );

    for (const [providerId, name] of [
      [ids.providerA, "Synthetic Provider A"],
      [ids.providerB, "Synthetic Provider B"],
    ]) {
      await client.query(
        `insert into public.provider_registry(
           provider_id,display_name,adapter_version,api_version,environment,enabled,
           capabilities,evidence_types,callback_mode,polling_supported,configured_state,
           health_status,timeout_ms,retry_policy,retention_classification,data_residency_notes
         ) values(
           $1,$2,'qualification-v1','sandbox-v1','sandbox',true,
           array['identity','evidence'],array['IDENTITY_ASSERTION'],'signed_webhook',false,'CONFIGURED',
           'HEALTHY',8000,'{"maxRetries":0}'::jsonb,'SYNTHETIC_NON_PRODUCTION','No personal data'
         )`,
        [providerId, name],
      );
    }

    await client.query(
      `insert into public.operational_entities(
         entity_id,enterprise_id,entity_type,display_reference,canonical_trust_object_id,
         lifecycle_state,accountable_owner_id,organization_reference,provider_references,
         external_identity_references,identity_profile_reference,current_authority_references,
         environment_references,workflow_references,current_trust_state,current_evidence_state,
         current_consequence_classification,canonical_digest
       ) values(
         $1,$2,'AI_AGENT','Operational Entity Alpha',$3,'active',$4,'synthetic-org-a',
         $5::jsonb,$6::jsonb,'identity-profile-alpha',$7::jsonb,'["staging"]'::jsonb,
         '["qualification"]'::jsonb,'verified','complete','HIGH',$8
       )`,
      [
        ids.entity,
        ids.tenantA,
        `trust-object:${ids.entity}`,
        ids.userA,
        JSON.stringify([ids.providerA, ids.providerB]),
        JSON.stringify([ids.externalA, ids.externalB]),
        JSON.stringify(["authority:alpha:v1"]),
        digest("entity-alpha"),
      ],
    );

    await client.query(
      `insert into public.operational_entity_external_identities(
         external_identity_id,enterprise_id,operational_entity_id,provider,provider_entity_id,
         builder_platform,provider_native_lifecycle,provider_owner,provider_business_purpose,
         certification_state,permissions_summary,observed_at,source_timestamp,evidence_digest
       ) values(
         $1,$2,$3,$4,'provider-a-native-alpha','synthetic-platform-a','active','synthetic-org-a',
         'qualification','provider_reported',array['execute'],now(),now(),$5
       ),(
         $6,$2,$3,$7,'provider-b-native-alpha','synthetic-platform-b','active','synthetic-org-b',
         'qualification','provider_reported',array['execute'],now(),now(),$8
       )`,
      [
        ids.externalA,
        ids.tenantA,
        ids.entity,
        ids.providerA,
        digest("provider-a-evidence-v1"),
        ids.externalB,
        ids.providerB,
        digest("provider-b-evidence-v1"),
      ],
    );

    await client.query(
      `insert into public.provider_relationships(
         relationship_id,enterprise_id,provider_id,provider_type,organization_reference,
         external_provider_reference,service_relationship,operational_entity_id,role,
         effective_from,effective_to,status,source,native_reference,schema_version,
         evidence_responsibilities,control_responsibilities,limitations
       ) values(
         $1,$2,$3,'synthetic_identity_provider','synthetic-org-a','provider-a-contract',
         'identity and evidence',$4,'identity_provider',now()-interval '1 day',now(),'replaced',
         'staging_qualification','provider-a-native-alpha','1.0',array['identity_assertion'],
         array['none'],array['synthetic only']
       ),(
         $5,$2,$6,'synthetic_identity_provider','synthetic-org-b','provider-b-contract',
         'identity and evidence',$4,'identity_provider',now(),null,'active',
         'staging_qualification','provider-b-native-alpha','1.0',array['identity_assertion'],
         array['none'],array['synthetic only']
       )`,
      [
        ids.relationshipA,
        ids.tenantA,
        ids.providerA,
        ids.entity,
        ids.relationshipB,
        ids.providerB,
      ],
    );

    const decisionSnapshot = {
      providerId: ids.providerA,
      providerNativeId: "provider-a-native-alpha",
      policyId: "policy:alpha",
      policyVersion: "1.0.0",
      authorityReference: "authority:alpha:v1",
      evidenceDigest: digest("provider-a-evidence-v1"),
    };
    const responsibilityLineage = {
      controlOwner: "synthetic-owner",
      controlOperator: "synthetic-operator",
      technologyProvider: ids.providerA,
      runtimeProvider: "synthetic-runtime",
      evidenceProvider: ids.providerA,
    };

    await client.query(
      `insert into public.canonical_trust_transactions(
         transaction_id,enterprise_id,actor_id,actor_type,subject_type,subject_id,workflow_id,
         action_type,action_purpose,action_resource,action_environment,request_digest,
         idempotency_key,correlation_id,requested_at,decision,trust_state,decision_id,
         authority_reference,authority_lineage_references,policy_id,policy_version,policy_hash,
         evidence_references,evidence_digest,evidence_complete,evidence_fresh,reason_codes,
         changed_conditions,material_change,operational_entity_id,accountable_owner_id,entity_type,
         entity_lifecycle_state,responsibility_lineage,evidence_independence,decision_time_snapshot,
         external_state
       ) values(
         $1,$2,$3,'ai_agent','AI_AGENT',$4,'qualification-workflow','EXECUTE',
         'provider-neutral staging proof','synthetic-resource','staging',$5,$6,$7,now(),
         'ALLOW','verified',$8,'authority:alpha:v1','["authority:alpha:v1"]'::jsonb,
         'policy:alpha','1.0.0',$9,$10::jsonb,$11,true,true,array['STAGING_QUALIFICATION'],
         array[]::text[],true,$4,$12,'AI_AGENT','active',$13::jsonb,
         'same_party_multi_system',$14::jsonb,'ACKNOWLEDGED'
       )`,
      [
        ids.transaction,
        ids.tenantA,
        ids.actorA,
        ids.entity,
        digest("request-alpha"),
        `qual-${ids.run}`,
        ids.correlation,
        ids.decision,
        digest("policy-alpha-v1"),
        JSON.stringify([`external-identity:${ids.externalA}`]),
        digest("provider-a-evidence-v1"),
        ids.userA,
        JSON.stringify(responsibilityLineage),
        JSON.stringify(decisionSnapshot),
      ],
    );

    await client.query(
      `insert into public.trust_fabric_decisions(
         decision_id,enterprise_id,subject_type,subject_id,workflow_id,decision_type,outcome,
         trust_state,policy_id,policy_version,envelope,correlation_id,deterministic_digest,
         created_at,actor_id
       ) values(
         $1,$2,'AI_AGENT',$3,'qualification-workflow','provider','ALLOW','verified',
         'policy:alpha','1.0.0',$4::jsonb,$5,$6,now(),$7
       )`,
      [
        ids.decision,
        ids.tenantA,
        ids.entity,
        JSON.stringify({ decision: "ALLOW", decisionTimeSnapshot: decisionSnapshot }),
        ids.correlation,
        digest(JSON.stringify(decisionSnapshot)),
        ids.actorA,
      ],
    );

    await client.query(
      `insert into public.provider_transitions(
         transition_id,enterprise_id,operational_entity_id,previous_relationship_id,
         new_relationship_id,state,frozen_historical_evidence_references,
         historical_evidence_digest,old_decision_snapshot_references,migration_gaps,
         resolved_migration_gaps,continuity_result,initiated_at,completed_at
       ) values(
         $1,$2,$3,$4,$5,'completed',$6::jsonb,$7,$8::jsonb,array[]::text[],array[]::text[],
         'CONTINUITY_SUPPORTED',now()-interval '1 hour',now()
       )`,
      [
        ids.transition,
        ids.tenantA,
        ids.entity,
        ids.relationshipA,
        ids.relationshipB,
        JSON.stringify([`external-identity:${ids.externalA}`]),
        digest("provider-a-history"),
        JSON.stringify([`decision:${ids.decision}`]),
      ],
    );

    await client.query(
      `insert into public.provider_change_events(
         event_id,enterprise_id,event_type,provider_id,previous_provider_id,operator_id,
         affected_operational_entity_ids,affected_control_ids,evidence_references,occurred_at,
         correlation_id,event_digest
       ) values(
         $1,$2,'PROVIDER_REPLACED',$3,$4,'synthetic-operator',array[$5],array['control:alpha'],
         array[$6],now(),$7,$8
       )`,
      [
        ids.change,
        ids.tenantA,
        ids.providerB,
        ids.providerA,
        ids.entity,
        `transition:${ids.transition}`,
        ids.correlation,
        digest("provider-replaced"),
      ],
    );

    const enforcementEvents = [
      ["OPERATOR_REQUEST", "OPERATOR_ACTION", "operator_asserted", "requested", "request-native"],
      [
        "PROVIDER_ACKNOWLEDGEMENT",
        "PROVIDER_CLAIM",
        "provider_asserted",
        "acknowledged",
        "provider-event-ack",
      ],
      [
        "PROVIDER_ENFORCEMENT_CLAIM",
        "PROVIDER_CLAIM",
        "provider_asserted",
        "succeeded",
        "provider-event-success",
      ],
      ["RUNTIME_OBSERVATION", "RUNTIME_OBSERVATION", "runtime_observed", "access_still_observed", null],
      [
        "DESTINATION_OBSERVATION",
        "DESTINATION_OBSERVATION",
        "destination_observed",
        "independently_confirmed",
        null,
      ],
    ];
    for (const [stage, attribution, classification, state, nativeId] of enforcementEvents) {
      await client.query(
        `insert into public.canonical_enforcement_events(
           enterprise_id,transaction_id,attribution,enforcement_stage,source_party_id,
           source_classification,claim_state,provider_native_event_id,evidence_digest,
           schema_version,occurred_at
         ) values($1,$2,$3,$4,$5,$6,$7,$8,$9,'1.0',now())`,
        [
          ids.tenantA,
          ids.transaction,
          attribution,
          stage,
          stage.includes("PROVIDER") ? ids.providerA : "synthetic-observer",
          classification,
          state,
          nativeId,
          digest(`${stage}-${ids.run}`),
        ],
      );
    }

    await client.query(
      `insert into public.trust_replay_sessions(
         id,subject_type,subject_id,replay_summary,generated_by,workspace_id,owner_user_id,
         correlation_id,canonical_transaction_id
       ) values(
         $1,'ai_agent',$2,'Provider A decision followed by Provider B transition',
         'staging_qualification',$3,$4,$5,$6
       )`,
      [ids.replay, ids.actorA, ids.tenantA, ids.userA, ids.correlation, ids.transaction],
    );
    await client.query(
      `insert into public.trust_memory_index(
         memory_id,enterprise_id,subject_id,domain_key,memory_type,source_id,occurred_at,
         summary,correlation_id
       ) values(
         $1,$2,$3,'PROVIDER_GOVERNANCE','PROVIDER_REPLACED',$4,now(),$5::jsonb,$6
       )`,
      [
        ids.memory,
        ids.tenantA,
        ids.entity,
        ids.transition,
        JSON.stringify({
          previousProvider: ids.providerA,
          newProvider: ids.providerB,
          continuity: "CONTINUITY_SUPPORTED",
        }),
        ids.correlation,
      ],
    );
  });
}

async function main() {
  await client.connect();

  if (process.env.PROVIDER_NEUTRAL_POLICY_INSPECT === "true") {
    const tables = await client.query(
      `select c.relname,c.relrowsecurity,c.relforcerowsecurity,pg_get_userbyid(c.relowner) table_owner
       from pg_class c join pg_namespace n on n.oid=c.relnamespace
       where n.nspname='public' and c.relname in ('trust_workspaces','workspace_members')`,
    );
    const functions = await client.query(
      `select p.proname,pg_get_userbyid(p.proowner) function_owner,p.prosecdef,pg_get_functiondef(p.oid) definition
       from pg_proc p join pg_namespace n on n.oid=p.pronamespace
       where n.nspname='public' and p.proname='user_can_access_trust_workspace'`,
    );
    const policies = await client.query(
      `select tablename,policyname,cmd,roles,qual,with_check from pg_policies
       where schemaname='public' and tablename in ('trust_workspaces','workspace_members')
       order by tablename,policyname`,
    );
    console.log(JSON.stringify({ tables: tables.rows, functions: functions.rows, policies: policies.rows }));
    return;
  }

  const targetTables = [
    "operational_entities",
    "operational_entity_external_identities",
    "provider_relationships",
    "provider_transitions",
    "provider_change_events",
    "canonical_enforcement_events",
  ];
  const controls = await client.query(
    `select c.relname,c.relrowsecurity,
            has_table_privilege('anon',c.oid,'select') anon_select,
            has_table_privilege('authenticated',c.oid,'select') authenticated_select,
            has_table_privilege('authenticated',c.oid,'insert,update,delete') authenticated_write,
            has_table_privilege('service_role',c.oid,'insert,select,update,delete') service_all
     from pg_class c join pg_namespace n on n.oid=c.relnamespace
     where n.nspname='public' and c.relname=any($1)
     order by c.relname`,
    [targetTables],
  );
  assert(controls.rowCount === targetTables.length, "target table inventory");
  for (const row of controls.rows) {
    assert(row.relrowsecurity, `${row.relname} RLS enabled`);
    assert(!row.anon_select, `${row.relname} anon denied`);
    assert(row.authenticated_select, `${row.relname} authenticated select`);
    assert(!row.authenticated_write, `${row.relname} authenticated writes denied`);
    assert(row.service_all, `${row.relname} service writes`);
  }

  await insertFixtures();

  const visibleTables = [
    "operational_entities",
    "operational_entity_external_identities",
    "provider_relationships",
    "provider_transitions",
    "provider_change_events",
    "canonical_trust_transactions",
    "trust_fabric_decisions",
    "trust_replay_sessions",
    "trust_memory_index",
  ];
  const tenantCounts = (userId) =>
    transactionAs("authenticated", userId, async () => {
      const counts = {};
      for (const table of visibleTables) {
        counts[table] = Number(
          (await client.query(`select count(*)::int count from public.${table}`)).rows[0].count,
        );
      }
      return counts;
    });
  const tenantAVisible = await tenantCounts(ids.userA);
  const tenantBVisible = await tenantCounts(ids.userB);
  for (const table of visibleTables) {
    assert(tenantAVisible[table] >= 1, `Tenant A reads ${table}`);
    assert(tenantBVisible[table] === 0, `Tenant B denied ${table}`);
  }

  await expectDenied("anon denied target read", () =>
    transactionAs("anon", null, () =>
      client.query("select count(*) from public.operational_entities"),
    ),
  );
  const spoofEntity = `entity:spoof:${ids.run}`;
  await expectDenied("authenticated cannot spoof enterprise or owner", () =>
    transactionAs("authenticated", ids.userB, () =>
      client.query(
        `insert into public.operational_entities(
           entity_id,enterprise_id,entity_type,display_reference,canonical_trust_object_id,
           lifecycle_state,accountable_owner_id,organization_reference,identity_profile_reference,
           current_trust_state,current_evidence_state,current_consequence_classification,canonical_digest
         ) values(
           $1,$2,'AI_AGENT','spoof',$3,'active',$4,'spoof','spoof','verified','complete','LOW',$5
         )`,
        [spoofEntity, ids.tenantA, `trust:${spoofEntity}`, ids.userB, digest("spoof")],
      ),
    ),
  );
  await expectDenied("authenticated cannot spoof provider relationship", () =>
    transactionAs("authenticated", ids.userB, () =>
      client.query(
        `insert into public.provider_relationships(
           enterprise_id,provider_id,provider_type,organization_reference,
           external_provider_reference,service_relationship,operational_entity_id,role,
           effective_from,status,source,native_reference,schema_version
         ) values(
           $1,$2,'spoof','spoof','spoof','spoof',$3,'identity_provider',now(),
           'active','spoof','spoof','1'
         )`,
        [ids.tenantA, ids.providerB, ids.entity],
      ),
    ),
  );
  await expectDenied("authenticated cannot use service decision path", () =>
    transactionAs("authenticated", ids.userB, () =>
      client.query(
        "select public.persist_canonical_trust_transaction_decision_v1('{}'::jsonb,'{}'::jsonb)",
      ),
    ),
  );

  const before = (
    await client.query(
      `select deterministic_digest,envelope,created_at
       from public.trust_fabric_decisions where enterprise_id=$1 and decision_id=$2`,
      [ids.tenantA, ids.decision],
    )
  ).rows[0];
  await expectDenied(
    "decision snapshot immutable",
    () =>
      transactionAs("service_role", null, () =>
        client.query(
          `update public.canonical_trust_transactions
           set decision_time_snapshot='{"changed":true}'::jsonb
           where enterprise_id=$1 and transaction_id=$2`,
          [ids.tenantA, ids.transaction],
        ),
      ),
    ["immutable", "snapshot"],
  );
  await expectDenied(
    "provider evidence append only",
    () =>
      transactionAs("service_role", null, () =>
        client.query(
          `update public.operational_entity_external_identities
           set certification_state='corrected' where external_identity_id=$1`,
          [ids.externalA],
        ),
      ),
    ["append-only", "immutable", "historical"],
  );
  await transactionAs("service_role", null, () =>
    client.query(
      `insert into public.operational_entity_external_identities(
         external_identity_id,enterprise_id,operational_entity_id,provider,provider_entity_id,
         builder_platform,provider_native_lifecycle,provider_owner,provider_business_purpose,
         certification_state,permissions_summary,observed_at,source_timestamp,evidence_digest,
         supersedes_reference_id
       ) values(
         $1,$2,$3,$4,'provider-a-native-alpha','synthetic-platform-a','active','synthetic-org-a',
         'qualification','corrected',array['execute'],now(),now(),$5,$6
       )`,
      [
        ids.externalACorrection,
        ids.tenantA,
        ids.entity,
        ids.providerA,
        digest("provider-a-evidence-correction"),
        ids.externalA,
      ],
    ),
  );
  await expectDenied(
    "provider transition inventory immutable",
    () =>
      transactionAs("service_role", null, () =>
        client.query(
          "update public.provider_transitions set historical_evidence_digest=$1 where transition_id=$2",
          [digest("rewrite"), ids.transition],
        ),
      ),
    ["immutable", "historical"],
  );
  await expectDenied(
    "enforcement evidence append only",
    () =>
      transactionAs("service_role", null, () =>
        client.query(
          `update public.canonical_enforcement_events set claim_state='confirmed'
           where enterprise_id=$1 and transaction_id=$2
             and enforcement_stage='PROVIDER_ACKNOWLEDGEMENT'`,
          [ids.tenantA, ids.transaction],
        ),
      ),
    ["append-only", "immutable", "historical"],
  );
  await expectDenied(
    "Trust Memory append only",
    () =>
      transactionAs("service_role", null, () =>
        client.query("update public.trust_memory_index set summary='{}'::jsonb where memory_id=$1", [
          ids.memory,
        ]),
      ),
    ["append-only", "immutable", "historical"],
  );

  const after = (
    await client.query(
      `select deterministic_digest,envelope,created_at
       from public.trust_fabric_decisions where enterprise_id=$1 and decision_id=$2`,
      [ids.tenantA, ids.decision],
    )
  ).rows[0];
  assert(JSON.stringify(before) === JSON.stringify(after), "decision digest unchanged");

  const providerHistory = await client.query(
    `select provider,provider_entity_id,evidence_digest,supersedes_reference_id
     from public.operational_entity_external_identities
     where enterprise_id=$1 and operational_entity_id=$2 order by created_at,external_identity_id`,
    [ids.tenantA, ids.entity],
  );
  assert(providerHistory.rowCount === 3, "provider evidence history count");
  assert(
    providerHistory.rows.filter((row) => row.provider === ids.providerA).length === 2,
    "Provider A original plus correction",
  );
  assert(
    providerHistory.rows.filter((row) => row.provider === ids.providerB).length === 1,
    "Provider B appended",
  );

  const acknowledgement = (
    await client.query(
      `select claim_state,source_classification from public.canonical_enforcement_events
       where enterprise_id=$1 and transaction_id=$2
         and enforcement_stage='PROVIDER_ACKNOWLEDGEMENT'`,
      [ids.tenantA, ids.transaction],
    )
  ).rows[0];
  assert(acknowledgement.claim_state === "acknowledged", "acknowledgement not upgraded");
  assert(
    acknowledgement.source_classification === "provider_asserted",
    "acknowledgement attribution",
  );

  const memoryCount = Number(
    (
      await client.query(
        `select count(*)::int count from public.trust_memory_index
         where enterprise_id=$1 and memory_type='PROVIDER_REPLACED' and source_id=$2`,
        [ids.tenantA, ids.transition],
      )
    ).rows[0].count,
  );
  assert(memoryCount === 1, "Trust Memory exactly once");
  const replay = (
    await client.query(
      `select id,canonical_transaction_id,correlation_id
       from public.trust_replay_sessions where id=$1`,
      [ids.replay],
    )
  ).rows[0];
  assert(replay.canonical_transaction_id === ids.transaction, "Replay transaction link");

  const exitPackage = (
    await client.query(
      `select jsonb_build_object(
         'providerHistory',(select jsonb_agg(jsonb_build_object(
            'provider',provider,'nativeId',provider_entity_id,'digest',evidence_digest
          )) from public.operational_entity_external_identities
          where enterprise_id=$1 and operational_entity_id=$2),
         'operatorHistory',(select jsonb_agg(jsonb_build_object(
            'operator',operator_id,'event',event_type
          )) from public.provider_change_events
          where enterprise_id=$1 and $2=any(affected_operational_entity_ids)),
         'operationalEntity',$2,'policyVersions',jsonb_build_array('1.0.0'),
         'authorityReferences',jsonb_build_array('authority:alpha:v1'),
         'historicalDecisions',jsonb_build_array($3::text),
         'replayReferences',jsonb_build_array($4::text),
         'trustMemoryReferences',jsonb_build_array($5::text),
         'unresolvedContradictions',jsonb_build_array(
           'provider_success_without_destination','runtime_observation_preserved'
         ),'migrationGaps','[]'::jsonb
       ) package`,
      [ids.tenantA, ids.entity, ids.decision, ids.replay, ids.memory],
    )
  ).rows[0].package;
  const packageText = JSON.stringify(exitPackage).toLowerCase();
  for (const forbidden of [
    "token",
    "secret",
    "credential",
    "password",
    "privatekey",
    "biometric",
  ]) {
    assert(!packageText.includes(forbidden), `exit package forbidden ${forbidden}`);
  }

  console.log(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      environment: "Supabase Preview",
      previewReference,
      tenantA: ids.tenantA,
      tenantB: ids.tenantB,
      operationalEntity: ids.entity,
      providers: [ids.providerA, ids.providerB],
      transaction: ids.transaction,
      decision: ids.decision,
      decisionDigest: before.deterministic_digest,
      replay: ids.replay,
      trustMemory: ids.memory,
      transition: ids.transition,
      externalIdentities: [ids.externalA, ids.externalACorrection, ids.externalB],
      rlsTables: controls.rows.map((row) => row.relname),
      tenantAVisible,
      tenantBVisible,
      providerEvidenceRows: providerHistory.rowCount,
      trustMemoryCount: memoryCount,
      acknowledgementState: acknowledgement.claim_state,
      exitPackageSanitized: true,
      status: "PASS",
    }),
  );
}

main()
  .then(() => client.end())
  .catch(async (error) => {
    console.error(error.message);
    try {
      await client.end();
    } catch {}
    process.exit(1);
  });
