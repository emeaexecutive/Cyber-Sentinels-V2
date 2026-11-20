import { createHmac, timingSafeEqual } from "node:crypto";
import { canonicalize } from "../../src/lib/trust-core/canonicalize.ts";
import { hashCanonical } from "../../src/lib/trust-core/hash.ts";

export const RESTRICTED_PREVIEW_OPERATIONS = [
  "qualification.schema.read",
  "qualification.agent.register",
  "qualification.authority.read",
  "qualification.decision.create",
  "qualification.review.read",
  "qualification.replay.read",
] as const;

export type RestrictedPreviewOperation = (typeof RESTRICTED_PREVIEW_OPERATIONS)[number];

type GatewayClaims = {
  audience: "cyber-sentinels:restricted-preview-gateway:v1";
  operationIds: RestrictedPreviewOperation[];
  runId: string;
  subjectId: string;
  tenantId: string;
  expiresAt: string;
};

export type RestrictedPreviewCapability = {
  claims: GatewayClaims;
  signature: string;
};

export type RestrictedPreviewRequest = {
  requestId: string;
  operation: RestrictedPreviewOperation;
  tenantId: string;
  runId: string;
  subjectId: string;
  destination: string;
  payload: Record<string, unknown>;
  capability: RestrictedPreviewCapability;
};

export type RestrictedPreviewCommand = Omit<
  RestrictedPreviewRequest,
  "capability"
> & {
  issuedAt: string;
};

export type RestrictedPreviewAudit = {
  requestId: string;
  operation: string;
  tenantId: string;
  runId: string;
  subjectId: string;
  decision: "ALLOW" | "DENY";
  reason: string;
  requestDigest: string;
  occurredAt: string;
};

export type RestrictedPreviewExecutionAdapter = {
  execute(command: RestrictedPreviewCommand): Promise<unknown>;
};

export type RestrictedPreviewGatewayOptions = {
  signingKey: string;
  allowedTenantIds: readonly string[];
  allowedSubjectIds: readonly string[];
  allowedRunIds: readonly string[];
  allowedDestinations: readonly string[];
  audit(record: RestrictedPreviewAudit): Promise<void>;
  adapter: RestrictedPreviewExecutionAdapter;
  now?: () => Date;
  maxPayloadBytes?: number;
};

const requestIdPattern = /^[A-Za-z0-9_.:-]{8,180}$/;
const referencePattern = /^[A-Za-z0-9_.:/-]{1,240}$/;
const operationSet = new Set<string>(RESTRICTED_PREVIEW_OPERATIONS);

export class RestrictedPreviewGatewayError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status = 403) {
    super(message);
    this.name = "RestrictedPreviewGatewayError";
    this.code = code;
    this.status = status;
  }
}

function signature(signingKey: string, claims: GatewayClaims) {
  if (Buffer.byteLength(signingKey, "utf8") < 32) {
    throw new RestrictedPreviewGatewayError(
      "GATEWAY_SIGNING_KEY_INVALID",
      "The gateway signing key is unavailable or too short.",
      503,
    );
  }
  return createHmac("sha256", signingKey)
    .update(canonicalize(claims), "utf8")
    .digest("base64url");
}

export function issueRestrictedPreviewCapability(
  signingKey: string,
  claims: GatewayClaims,
): RestrictedPreviewCapability {
  return { claims: structuredClone(claims), signature: signature(signingKey, claims) };
}

function validCapability(
  signingKey: string,
  capability: RestrictedPreviewCapability,
) {
  const claims = capability?.claims;
  if (
    !claims
    || claims.audience !== "cyber-sentinels:restricted-preview-gateway:v1"
    || !Array.isArray(claims.operationIds)
    || claims.operationIds.some((operation) => !operationSet.has(operation))
    || !referencePattern.test(claims.tenantId)
    || !referencePattern.test(claims.subjectId)
    || !referencePattern.test(claims.runId)
    || !Number.isFinite(Date.parse(claims.expiresAt))
    || !/^[A-Za-z0-9_-]{43}$/.test(capability.signature)
  ) {
    throw new RestrictedPreviewGatewayError(
      "GATEWAY_CAPABILITY_INVALID",
      "The gateway capability is invalid.",
    );
  }
  const expected = Buffer.from(signature(signingKey, claims), "base64url");
  const actual = Buffer.from(capability.signature, "base64url");
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    throw new RestrictedPreviewGatewayError(
      "GATEWAY_CAPABILITY_INVALID",
      "The gateway capability is invalid.",
    );
  }
  return claims;
}

function validatePayload(request: RestrictedPreviewRequest) {
  const payload = request.payload;
  if (!payload || Array.isArray(payload) || typeof payload !== "object") {
    throw new RestrictedPreviewGatewayError(
      "GATEWAY_PAYLOAD_INVALID",
      "The gateway payload must be an object.",
      400,
    );
  }
  const identifiers = ["agentId", "transactionId", "authorityId"];
  for (const field of identifiers) {
    if (field in payload && (typeof payload[field] !== "string" || !referencePattern.test(payload[field]))) {
      throw new RestrictedPreviewGatewayError(
        "GATEWAY_PAYLOAD_INVALID",
        `${field} is invalid.`,
        400,
      );
    }
  }
  const permitted: Record<RestrictedPreviewOperation, readonly string[]> = {
    "qualification.schema.read": [],
    "qualification.agent.register": ["agentId", "identityDigest"],
    "qualification.authority.read": ["agentId", "authorityId"],
    "qualification.decision.create": [
      "agentId",
      "authorityId",
      "action",
      "target",
      "purpose",
      "consequence",
    ],
    "qualification.review.read": ["transactionId"],
    "qualification.replay.read": ["transactionId"],
  };
  const extra = Object.keys(payload).filter((field) => !permitted[request.operation].includes(field));
  if (extra.length) {
    throw new RestrictedPreviewGatewayError(
      "GATEWAY_PAYLOAD_FIELD_NOT_ALLOWED",
      "The operation received a field outside its fixed contract.",
      400,
    );
  }
  if (request.operation === "qualification.decision.create") {
    const action = payload.action;
    const target = payload.target;
    const purpose = payload.purpose;
    const consequence = payload.consequence;
    if (
      typeof action !== "string" || !/^[A-Z][A-Z0-9_]{0,63}$/.test(action)
      || typeof target !== "string" || !referencePattern.test(target)
      || typeof purpose !== "string" || !referencePattern.test(purpose)
      || !["LOW", "MODERATE", "HIGH"].includes(String(consequence))
    ) {
      throw new RestrictedPreviewGatewayError(
        "GATEWAY_DECISION_INPUT_INVALID",
        "The decision operation input is invalid.",
        400,
      );
    }
    if (
      action.startsWith("DELETE")
      || action.startsWith("WIPE")
      || action.startsWith("DESTROY")
      || target.startsWith("production:")
    ) {
      throw new RestrictedPreviewGatewayError(
        "GATEWAY_DESTRUCTIVE_OPERATION_DENIED",
        "Destructive and Production-targeted qualification operations are forbidden.",
      );
    }
  }
  if ("identityDigest" in payload && (
    typeof payload.identityDigest !== "string"
    || !/^[a-f0-9]{64}$/.test(payload.identityDigest)
  )) {
    throw new RestrictedPreviewGatewayError(
      "GATEWAY_IDENTITY_DIGEST_INVALID",
      "The identity digest is invalid.",
      400,
    );
  }
}

export class RestrictedPreviewGateway {
  private readonly options: RestrictedPreviewGatewayOptions;

  constructor(options: RestrictedPreviewGatewayOptions) {
    this.options = options;
  }

  async execute(request: RestrictedPreviewRequest) {
    const now = this.options.now?.() ?? new Date();
    const requestDigest = hashCanonical({
      requestId: typeof request?.requestId === "string" ? request.requestId : "",
      operation: typeof request?.operation === "string" ? request.operation : "",
      tenantId: typeof request?.tenantId === "string" ? request.tenantId : "",
      runId: typeof request?.runId === "string" ? request.runId : "",
      subjectId: typeof request?.subjectId === "string" ? request.subjectId : "",
      payload: request?.payload ?? null,
    });
    try {
      if (!request || !requestIdPattern.test(request.requestId)) {
        throw new RestrictedPreviewGatewayError(
          "GATEWAY_REQUEST_ID_INVALID",
          "The request identifier is invalid.",
          400,
        );
      }
      if (!operationSet.has(request.operation)) {
        throw new RestrictedPreviewGatewayError(
          "GATEWAY_OPERATION_NOT_ALLOWED",
          "The requested operation is not allowlisted.",
        );
      }
      if (
        !this.options.allowedTenantIds.includes(request.tenantId)
        || !this.options.allowedSubjectIds.includes(request.subjectId)
        || !this.options.allowedRunIds.includes(request.runId)
      ) {
        throw new RestrictedPreviewGatewayError(
          "GATEWAY_SYNTHETIC_SCOPE_REQUIRED",
          "The request is outside the approved synthetic tenant, subject and run scope.",
        );
      }
      if (!this.options.allowedDestinations.includes(request.destination)) {
        throw new RestrictedPreviewGatewayError(
          "GATEWAY_DESTINATION_NOT_ALLOWED",
          "The destination is not allowlisted.",
        );
      }
      const payloadBytes = Buffer.byteLength(JSON.stringify(request.payload), "utf8");
      if (payloadBytes > (this.options.maxPayloadBytes ?? 16_384)) {
        throw new RestrictedPreviewGatewayError(
          "GATEWAY_PAYLOAD_TOO_LARGE",
          "The gateway payload is too large.",
          413,
        );
      }
      const claims = validCapability(this.options.signingKey, request.capability);
      if (Date.parse(claims.expiresAt) <= now.getTime()) {
        throw new RestrictedPreviewGatewayError(
          "GATEWAY_CAPABILITY_EXPIRED",
          "The gateway capability has expired.",
        );
      }
      if (
        claims.tenantId !== request.tenantId
        || claims.subjectId !== request.subjectId
        || claims.runId !== request.runId
        || !claims.operationIds.includes(request.operation)
      ) {
        throw new RestrictedPreviewGatewayError(
          "GATEWAY_CAPABILITY_SCOPE_MISMATCH",
          "The capability does not authorize this exact request scope.",
        );
      }
      validatePayload(request);
      await this.options.audit({
        requestId: request.requestId,
        operation: request.operation,
        tenantId: request.tenantId,
        runId: request.runId,
        subjectId: request.subjectId,
        decision: "ALLOW",
        reason: "GATEWAY_OPERATION_ALLOWED",
        requestDigest,
        occurredAt: now.toISOString(),
      });
      return await this.options.adapter.execute({
        requestId: request.requestId,
        operation: request.operation,
        tenantId: request.tenantId,
        runId: request.runId,
        subjectId: request.subjectId,
        destination: request.destination,
        payload: structuredClone(request.payload),
        issuedAt: now.toISOString(),
      });
    } catch (error) {
      const safe = error instanceof RestrictedPreviewGatewayError
        ? error
        : new RestrictedPreviewGatewayError(
          "GATEWAY_ADAPTER_UNAVAILABLE",
          "The restricted qualification operation could not be completed safely.",
          503,
        );
      await this.options.audit({
        requestId: typeof request?.requestId === "string" ? request.requestId : "invalid",
        operation: typeof request?.operation === "string" ? request.operation : "invalid",
        tenantId: typeof request?.tenantId === "string" ? request.tenantId : "invalid",
        runId: typeof request?.runId === "string" ? request.runId : "invalid",
        subjectId: typeof request?.subjectId === "string" ? request.subjectId : "invalid",
        decision: "DENY",
        reason: safe.code,
        requestDigest,
        occurredAt: now.toISOString(),
      });
      throw safe;
    }
  }
}

export class RestrictedPreviewTestAdapter implements RestrictedPreviewExecutionAdapter {
  readonly commands: RestrictedPreviewCommand[] = [];

  async execute(command: RestrictedPreviewCommand) {
    this.commands.push(structuredClone(command));
    return {
      status: "VERIFIED",
      operation: command.operation,
      tenantId: command.tenantId,
      runId: command.runId,
      destination: command.destination,
    };
  }
}

