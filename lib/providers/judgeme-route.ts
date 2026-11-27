const judgeMeWebhookPath =
  /^\/api\/providers\/judgeme\/webhook\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\/(?:review-created|review-updated|review-created-fail)$/i;

export function isJudgeMeWebhookCallback(pathname: string, method: string) {
  return method === "POST" && judgeMeWebhookPath.test(pathname);
}
