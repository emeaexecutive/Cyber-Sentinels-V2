export type TrustRuleOperator = "EQUALS" | "NOT_EQUALS" | "IN" | "EXISTS";

export type TrustRule = {
  id: string;
  field: string;
  operator: TrustRuleOperator;
  value?: string | number | boolean | Array<string | number | boolean>;
  message: string;
};

export type TrustPolicy = {
  id: string;
  version: string;
  name: string;
  effect: "ALLOW" | "DENY" | "REVIEW";
  rules: TrustRule[];
};

export type TrustPolicyResult = {
  policyId: string;
  policyVersion: string;
  matched: boolean;
  effect: TrustPolicy["effect"] | "NOT_APPLICABLE";
  evaluations: Array<{ ruleId: string; matched: boolean; message: string }>;
};

function valueAt(facts: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>(
    (current, key) =>
      current && typeof current === "object" && !Array.isArray(current)
        ? (current as Record<string, unknown>)[key]
        : undefined,
    facts,
  );
}

export class TrustPolicyEvaluator {
  evaluate(policy: TrustPolicy, facts: Record<string, unknown>): TrustPolicyResult {
    const evaluations = policy.rules.map((rule) => {
      const actual = valueAt(facts, rule.field);
      let matched = false;
      if (rule.operator === "EXISTS") matched = actual !== undefined && actual !== null;
      if (rule.operator === "EQUALS") matched = actual === rule.value;
      if (rule.operator === "NOT_EQUALS") matched = actual !== rule.value;
      if (rule.operator === "IN") {
        matched = Array.isArray(rule.value) && rule.value.includes(actual as never);
      }
      return { ruleId: rule.id, matched, message: rule.message };
    });
    const matched = evaluations.length > 0 && evaluations.every((item) => item.matched);
    return {
      policyId: policy.id,
      policyVersion: policy.version,
      matched,
      effect: matched ? policy.effect : "NOT_APPLICABLE",
      evaluations,
    };
  }
}
