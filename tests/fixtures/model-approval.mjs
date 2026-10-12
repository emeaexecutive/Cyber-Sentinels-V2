import { hashCanonical } from '../../src/lib/trust-core/hash.ts';
import { MODEL_APPROVAL_SOURCE, MODEL_APPROVAL_EVIDENCE } from '../../lib/trust-fabric/model-approval.ts';

export function modelApprovalFixture({ enterpriseId = '10000000-0000-4000-8000-000000000001', agentId = '10000000-0000-4000-8000-000000000003', environment = 'sandbox', at = '2026-08-06T10:00:00.000Z' } = {}) {
  const measuredAt = new Date(Date.parse(at) - 60000).toISOString();
  const validUntil = new Date(Date.parse(at) + 3600000).toISOString();
  const digest = hashCanonical({ controlledFixture: 'model-config-v1' });
  const common = {
    enterpriseId, agentId, modelProvider: 'controlled-test-registry', modelId: 'qualification-model', modelVersion: '1.0',
    modelArtifactReference: 'fixture:model-config-v1', modelArtifactDigest: digest,
    runtimeProvider: 'controlled-configuration', runtimeImageReference: 'fixture:runtime', runtimeImageDigest: digest,
    inferenceServer: 'fixture:inference', inferenceServerVersion: '1', configurationDigest: digest,
    adapterConfigurationDigest: digest, inferenceConfigurationDigest: digest, toolParserConfigurationDigest: digest,
    templates: { agentSystemPromptDigest: digest, modelTemplateDigest: digest, runtimeInferenceConfigurationDigest: digest, sourceReference: 'fixture:configuration', verificationMechanism: 'operator-reviewed-configuration-digest' },
    networkPosture: 'PRIVATE_NETWORK', authenticationPosture: 'AUTHENTICATED', runtimeEnvironment: environment,
    evidenceProvider: MODEL_APPROVAL_SOURCE, evidenceReferences: ['controlled-registry:qualification'], measuredAt,
    limitations: ['Controlled configuration approval; no live model inference or third-party attestation is claimed.'],
    endpointLineage: { endpointReference: 'fixture:inference', routingProvider: 'controlled-test-registry', intermediaryReference: null, finalInferenceServer: 'fixture:inference' },
  };
  const baseline = { ...common, agentPassportVersion: 'manifest:v1', policyVersion: '1.0', authorityReference: 'controlled-registry:qualification' };
  const facts = { version: '1.0', enterpriseId, agentId, environment, status: 'APPROVED', approvalAuthority: 'operator:release-qualification', approvalReference: 'controlled-registry:qualification', approvedAt: measuredAt, validUntil, manifestDigest: digest, baseline, observation: { ...common, expiresAt: validUntil } };
  const row = { enterprise_id: enterpriseId, subject_id: agentId, evidence_id: '10000000-0000-4000-8000-000000000099', evidence_type: MODEL_APPROVAL_EVIDENCE, provider_key: 'cyber_sentinels_native', source_type: MODEL_APPROVAL_SOURCE, source_key: MODEL_APPROVAL_SOURCE, server_verified: true, payload_hash: hashCanonical(facts), normalized_facts: facts, observed_at: measuredAt, expires_at: validUntil };
  const binding = { enterpriseId, agentId, environment, evaluatedAt: at, manifest: { digest, modelId: common.modelId, modelProvider: common.modelProvider, modelVersion: common.modelVersion } };
  return { row, binding, facts };
}
