import { consentActions, type ConsentAction, type ConsentChoices } from "./types.ts";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type CookieConsentRequest = {
  consentVersion: string;
  anonymousId: string;
  choices: {
    necessary: true;
    analytics: boolean;
    marketing: boolean;
    preferences: boolean;
    aiImprovements?: boolean;
  };
  source: "cookie_banner" | "cookie_preferences";
  idempotencyKey: string;
  action?: ConsentAction;
};

export function validateCookieConsentRequest(value: unknown): CookieConsentRequest {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw Object.assign(new Error("Consent payload is invalid."), { status: 400, code: "CONSENT_PAYLOAD_INVALID" });
  const body = value as Partial<CookieConsentRequest>;
  const choices = body.choices as Partial<CookieConsentRequest["choices"]> | undefined;
  if (!body.consentVersion || !uuidPattern.test(body.anonymousId ?? "") || !uuidPattern.test(body.idempotencyKey ?? "")) throw Object.assign(new Error("Consent identifiers are invalid."), { status: 400, code: "CONSENT_IDENTIFIERS_INVALID" });
  if (!choices || choices.necessary !== true || typeof choices.analytics !== "boolean" || typeof choices.marketing !== "boolean" || typeof choices.preferences !== "boolean" || (choices.aiImprovements !== undefined && typeof choices.aiImprovements !== "boolean")) throw Object.assign(new Error("Consent choices are invalid."), { status: 400, code: "CONSENT_CHOICES_INVALID" });
  if (!['cookie_banner', 'cookie_preferences'].includes(body.source ?? "")) throw Object.assign(new Error("Consent source is invalid."), { status: 400, code: "CONSENT_SOURCE_INVALID" });
  if (body.action !== undefined && !consentActions.includes(body.action)) throw Object.assign(new Error("Consent action is invalid."), { status: 400, code: "CONSENT_ACTION_INVALID" });
  return body as CookieConsentRequest;
}

export function canonicalCookieChoices(request: CookieConsentRequest): ConsentChoices {
  return {
    essential: true,
    functional: request.choices.preferences,
    analytics: request.choices.analytics,
    ai_improvements: request.choices.aiImprovements === true,
    marketing: request.choices.marketing,
  };
}

export function cookieConsentAction(request: CookieConsentRequest): ConsentAction {
  if (request.action) return request.action;
  const optional = [request.choices.preferences, request.choices.analytics, request.choices.aiImprovements === true, request.choices.marketing];
  if (optional.every(Boolean)) return "ACCEPT_ALL";
  if (optional.every((value) => !value)) return "REJECT_OPTIONAL";
  return "SAVE_PREFERENCES";
}
