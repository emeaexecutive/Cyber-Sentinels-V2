import assert from "node:assert/strict";
import Module from "node:module";
import { mock, test } from "node:test";
import { fileURLToPath } from "node:url";
import pg from "pg";

const databaseUrl = process.env.CONSENT_REHEARSAL_DATABASE_URL;
if (!databaseUrl) {
  throw new Error("CONSENT_REHEARSAL_DATABASE_URL is required");
}

process.env.NODE_PATH = fileURLToPath(new URL("./fixtures", import.meta.url));
Module._initPaths();

const client = new pg.Client({ connectionString: databaseUrl });
await client.connect();
await client.query("select set_config('request.jwt.claim.role', 'service_role', false)");

const repository = {
  async chainHead(enterpriseId) {
    const result = await client.query(
      `select last_sequence::int as "sequence", last_event_hash as "eventHash"
         from public.trust_event_chain_heads
        where enterprise_id = $1 and partition_key = 'default'`,
      [enterpriseId],
    );
    return result.rows[0] ?? { sequence: 0, eventHash: null };
  },
  async persist(input) {
    const result = await client.query(
      `select public.persist_consent_change_v1(
        $1::jsonb, $2::text, $3::text, $4::text, $5::jsonb, $6::uuid
      ) as result`,
      [
        JSON.stringify(input.receipt),
        input.subjectKey,
        input.idempotencyKey,
        input.requestHash,
        JSON.stringify(input.trustEvents),
        input.correlationId,
      ],
    );
    return result.rows[0].result;
  },
};

mock.module(new URL("../src/lib/consent/repository.ts", import.meta.url).href, {
  namedExports: { consentRepository: () => repository },
});

const { persistConsentChoice } = await import("../src/lib/consent/service.ts");

test("backup-derived database persists actual application consent events", async (t) => {
  t.after(() => client.end());

  const enterpriseId = crypto.randomUUID();
  const subjectKey = `anonymous:${crypto.randomUUID().replaceAll("-", "").padEnd(64, "0")}`;
  await client.query(
    `insert into public.trust_workspaces(id, name, slug, description, is_demo)
     values ($1, 'Synthetic consent repair rehearsal', $2,
       'Backup-derived disposable database only', true)`,
    [enterpriseId, `consent-repair-${enterpriseId}`],
  );

  const context = {
    enterpriseId,
    userId: null,
    anonymousToken: crypto.randomUUID(),
    anonymousIdHash: subjectKey.slice("anonymous:".length),
    subjectKey,
    relatedSubjectKeys: [subjectKey],
    regionProfile: "GLOBAL_DEFAULT",
    coarseCountry: null,
    language: "en",
    userAgentHash: null,
  };
  const cases = [
    ["ACCEPT_ALL", { essential: true, functional: true, analytics: true, ai_improvements: true, marketing: true }],
    ["REJECT_OPTIONAL", { essential: true, functional: false, analytics: false, ai_improvements: false, marketing: false }],
    ["SAVE_PREFERENCES", { essential: true, functional: true, analytics: false, ai_improvements: true, marketing: false }],
    ["WITHDRAW", { essential: true, functional: false, analytics: false, ai_improvements: false, marketing: false }],
  ];
  const created = [];
  const firstIdempotencyKey = crypto.randomUUID();

  for (const [index, [action, choices]] of cases.entries()) {
    const idempotencyKey = index === 0 ? firstIdempotencyKey : crypto.randomUUID();
    const result = await persistConsentChoice({
      context,
      action,
      choices,
      policyVersion: "2026-07-20.1",
      idempotencyKey,
      correlationId: crypto.randomUUID(),
      source: "cookie_banner",
    });
    created.push({ action, idempotencyKey, ...result });
    assert.equal(result.replayed, false);
  }

  const duplicate = await persistConsentChoice({
    context,
    action: "ACCEPT_ALL",
    choices: cases[0][1],
    policyVersion: "2026-07-20.1",
    idempotencyKey: firstIdempotencyKey,
    correlationId: crypto.randomUUID(),
    source: "cookie_banner",
  });
  assert.equal(duplicate.replayed, true);
  assert.equal(duplicate.receiptReference, created[0].receiptReference);

  await assert.rejects(
    persistConsentChoice({
      context,
      action: "REJECT_OPTIONAL",
      choices: cases[1][1],
      policyVersion: "2026-07-20.1",
      idempotencyKey: firstIdempotencyKey,
      correlationId: crypto.randomUUID(),
      source: "cookie_banner",
    }),
    (error) => error.code === "IDEMPOTENCY_KEY_CONFLICT",
  );

  const counts = await client.query(
    `select
       (select count(*)::int from public.consent_receipts where enterprise_id = $1) as receipts,
       (select count(*)::int from public.trust_events where enterprise_id = $1) as events,
       (select last_sequence::int from public.trust_event_chain_heads
         where enterprise_id = $1 and partition_key = 'default') as head_sequence,
       (select count(*)::int
          from public.trust_event_links l
          join public.consent_receipts r
            on l.target_id = 'consent-receipt:' || r.receipt_id::text
           and r.enterprise_id = l.enterprise_id
         where l.enterprise_id = $1 and l.link_type = 'EVIDENCE') as evidence_links,
       (select count(*)::int from (
          select sequence, previous_hash,
                 lag(event_hash) over (order by sequence) as expected_previous
            from public.trust_events where enterprise_id = $1
        ) chain where coalesce(previous_hash, '') = coalesce(expected_previous, '')) as valid_chain_rows`,
    [enterpriseId],
  );
  assert.deepEqual(counts.rows[0], {
    receipts: 4,
    events: 8,
    head_sequence: 8,
    evidence_links: 8,
    valid_chain_rows: 8,
  });

  const persistedEvents = await client.query(
    `select event_id as "eventId", event_type as "eventType"
       from public.trust_events where enterprise_id = $1 order by sequence`,
    [enterpriseId],
  );
  assert.deepEqual(
    persistedEvents.rows.map((row) => row.eventType),
    [
      "consent.accept_all", "consent.receipt.created",
      "consent.reject_optional", "consent.receipt.created",
      "consent.preferences.saved", "consent.receipt.created",
      "consent.withdrawn", "consent.receipt.created",
    ],
  );

  const malformedReceiptId = crypto.randomUUID();
  const malformedEvent = {
    ...(await client.query(
      `select canonical_event from public.trust_events
        where enterprise_id = $1 order by sequence desc limit 1`,
      [enterpriseId],
    )).rows[0].canonical_event,
    eventId: crypto.randomUUID(),
    eventType: "consent.Invalid",
    sequence: 9,
    previousHash: (await repository.chainHead(enterpriseId)).eventHash,
    eventHash: "f".repeat(64),
  };
  malformedEvent.provider.eventId = malformedReceiptId;
  malformedEvent.normalizedFacts.receiptReference = `consent-receipt:${malformedReceiptId}`;
  const malformedReceipt = {
    ...(await client.query(
      `select canonical_receipt from public.consent_receipts
        where enterprise_id = $1 order by occurred_at desc limit 1`,
      [enterpriseId],
    )).rows[0].canonical_receipt,
    receiptId: malformedReceiptId,
  };

  await assert.rejects(
    client.query(
      `select public.persist_consent_change_v1(
        $1::jsonb, $2::text, $3::text, $4::text, $5::jsonb, $6::uuid
      )`,
      [JSON.stringify(malformedReceipt), subjectKey, crypto.randomUUID(), "e".repeat(64), JSON.stringify([malformedEvent]), crypto.randomUUID()],
    ),
    (error) => error.code === "P0001" && error.message === "Invalid canonical event metadata",
  );
  const malformedCount = await client.query(
    "select count(*)::int as count from public.consent_receipts where receipt_id = $1",
    [malformedReceiptId],
  );
  assert.equal(malformedCount.rows[0].count, 0);

  console.log(`REHEARSAL_RESULT=${JSON.stringify({
    enterpriseId,
    receiptIds: created.map((item) => item.receiptReference),
    eventIds: persistedEvents.rows.map((item) => item.eventId),
    duplicate: "PASS",
    conflictingIdempotency: "PASS",
    malformedMetadataRejected: "PASS",
    hashChain: "PASS",
    evidenceReferences: "PASS",
  })}`);
});
