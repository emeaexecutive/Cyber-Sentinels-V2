import { clampScore } from "../scoring/index.ts";

export const signalSources = [
  "IDENTITY",
  "DEVICE",
  "EMAIL",
  "PHONE",
  "PROVIDER",
  "BROWSER",
  "LOCATION",
  "BEHAVIOUR",
  "ENTERPRISE_POLICY",
  "AI_AGENT",
] as const;
export type SignalSource = (typeof signalSources)[number];

export type Signal = {
  id: string;
  tenantId: string;
  identityId: string;
  source: SignalSource;
  type: string;
  value: number;
  confidence: number;
  observedAt: string;
  provider: string | null;
  evidenceIds: string[];
};

export type SignalWeights = Record<SignalSource, number>;

export type TrustUpdate = {
  id: string;
  tenantId: string;
  identityId: string;
  signalId: string;
  priorTrust: number;
  resultingTrust: number;
  delta: number;
  confidence: number;
  reason: string;
  occurredAt: string;
};

export const defaultSignalWeights: SignalWeights = {
  IDENTITY: 1,
  DEVICE: 0.75,
  EMAIL: 0.6,
  PHONE: 0.6,
  PROVIDER: 0.9,
  BROWSER: 0.5,
  LOCATION: 0.55,
  BEHAVIOUR: 0.7,
  ENTERPRISE_POLICY: 1,
  AI_AGENT: 0.8,
};

export class SignalProcessor {
  process(signal: Signal): Signal {
    if (!signalSources.includes(signal.source)) throw new TypeError("Signal source is invalid.");
    if (!Number.isFinite(signal.value) || signal.value < -100 || signal.value > 100) {
      throw new TypeError("Signal value must be between -100 and 100.");
    }
    if (!Number.isFinite(signal.confidence) || signal.confidence < 0 || signal.confidence > 1) {
      throw new TypeError("Signal confidence must be between 0 and 1.");
    }
    return { ...signal, observedAt: new Date(signal.observedAt).toISOString() };
  }
}

export class SignalPipeline {
  private readonly weights: SignalWeights;
  private readonly processor: SignalProcessor;

  constructor(
    weights: SignalWeights = defaultSignalWeights,
    processor = new SignalProcessor(),
  ) {
    this.weights = weights;
    this.processor = processor;
  }

  apply(priorTrust: number, rawSignal: Signal): TrustUpdate {
    const signal = this.processor.process(rawSignal);
    const delta = Math.round(signal.value * this.weights[signal.source] * signal.confidence * 100) / 100;
    const resultingTrust = clampScore(priorTrust + delta);
    return {
      id: signal.id,
      tenantId: signal.tenantId,
      identityId: signal.identityId,
      signalId: signal.id,
      priorTrust: clampScore(priorTrust),
      resultingTrust,
      delta: Math.round((resultingTrust - clampScore(priorTrust)) * 100) / 100,
      confidence: signal.confidence,
      reason: `${signal.source}:${signal.type}`,
      occurredAt: signal.observedAt,
    };
  }
}
