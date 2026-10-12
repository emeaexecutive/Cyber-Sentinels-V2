import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveModelApproval } from '../lib/trust-fabric/model-approval.ts';
import { hashCanonical } from '../src/lib/trust-core/hash.ts';
import { modelApprovalFixture } from './fixtures/model-approval.mjs';

test('controlled approval resolves a current matching model independently of runtime action trust', () => {
  const { row, binding } = modelApprovalFixture();
  const result = resolveModelApproval(row, binding);
  assert.equal(result.approval.status, 'APPROVED');
  assert.equal(result.integrity.modelIntegrityState, 'EXACT_MATCH');
  assert.equal(result.approval.provenance, 'CONTROLLED_REGISTRY_NOT_PROVIDER_ATTESTATION');
  assert.ok(result.integrity.providerNeutralEvidence.every(item => item.signingBoundary === 'unsigned'));
});
test('missing evidence remains UNKNOWN', () => {
  assert.equal(resolveModelApproval(null, modelApprovalFixture().binding).approval.status, 'UNKNOWN');
});
for (const state of ['UNAPPROVED', 'REVOKED']) test(`trusted ${state} remains explicit`, () => {
  const { row, binding, facts } = modelApprovalFixture();
  facts.status = state; row.payload_hash = hashCanonical(facts);
  assert.equal(resolveModelApproval(row, binding).approval.status, state);
});
test('expired approval cannot remain approved', () => {
  const { row, binding } = modelApprovalFixture();
  binding.evaluatedAt = row.expires_at;
  assert.equal(resolveModelApproval(row, binding).approval.status, 'EXPIRED');
});
for (const field of ['enterpriseId', 'agentId', 'environment']) test(`approval is bound to ${field}`, () => {
  const { row, binding } = modelApprovalFixture();
  binding[field] = 'other';
  assert.equal(resolveModelApproval(row, binding).approval.status, 'CONFLICTED');
});
for (const field of ['modelId', 'modelProvider', 'modelVersion', 'digest']) test(`manifest ${field} cannot be substituted`, () => {
  const { row, binding } = modelApprovalFixture();
  binding.manifest[field] = 'other';
  assert.equal(resolveModelApproval(row, binding).approval.reason, 'MODEL_APPROVAL_MANIFEST_MISMATCH');
});
for (const field of ['approvalAuthority', 'approvalReference', 'agentId', 'enterpriseId']) test(`tampered ${field} fails digest verification`, () => {
  const { row, binding, facts } = modelApprovalFixture();
  facts[field] = 'caller:forged';
  assert.equal(resolveModelApproval(row, binding).approval.reason, 'MODEL_APPROVAL_EVIDENCE_TAMPERED');
});
for (const field of ['source_type', 'source_key', 'provider_key', 'server_verified']) test(`caller cannot manufacture trusted ${field}`, () => {
  const { row, binding } = modelApprovalFixture();
  row[field] = field === 'server_verified' ? false : 'caller-asserted';
  assert.equal(resolveModelApproval(row, binding).approval.reason, 'MODEL_APPROVAL_SOURCE_UNTRUSTED');
});
test('changed observation and future approval fail closed', () => {
  const { row, binding, facts } = modelApprovalFixture();
  facts.observation.modelId = 'different-model'; row.payload_hash = hashCanonical(facts);
  assert.equal(resolveModelApproval(row, binding).approval.status, 'CONFLICTED');
  facts.approvedAt = facts.validUntil; row.payload_hash = hashCanonical(facts);
  assert.equal(resolveModelApproval(row, binding).approval.reason, 'MODEL_APPROVAL_VALIDITY_INVALID');
});
