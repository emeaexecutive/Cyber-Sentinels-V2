export const DEFAULT_AUTH_REDIRECT = "/operational-entities";

const rawControlCharacter = /[\u0000-\u001f\u007f-\u009f]/;
const malformedPercentEncoding = /%(?![0-9a-f]{2})/i;
const encodedPathDelimiter = /%(?:25)*(?:2f|5c)/i;
const encodedControlCharacter = /%(?:25)*(?:0[0-9a-f]|1[0-9a-f]|7f|8[0-9a-f]|9[0-9a-f])/i;

/**
 * Resolves an untrusted auth destination to a canonical application-relative
 * path. The returned value is safe to resolve against `applicationOrigin`.
 */
export function resolveSafeInternalRedirect(
  candidate: string | null | undefined,
  applicationOrigin: string,
) {
  if (!candidate || candidate !== candidate.trim()) return DEFAULT_AUTH_REDIRECT;
  if (!candidate.startsWith("/") || candidate.startsWith("//")) return DEFAULT_AUTH_REDIRECT;
  if (candidate.includes("\\") || rawControlCharacter.test(candidate)) return DEFAULT_AUTH_REDIRECT;
  if (malformedPercentEncoding.test(candidate)) return DEFAULT_AUTH_REDIRECT;

  const sourcePathname = candidate.split(/[?#]/, 1)[0];
  if (
    encodedPathDelimiter.test(sourcePathname) ||
    encodedControlCharacter.test(candidate)
  ) {
    return DEFAULT_AUTH_REDIRECT;
  }

  try {
    const origin = new URL(applicationOrigin).origin;
    const finalUrl = new URL(candidate, origin);
    if (finalUrl.origin !== origin) return DEFAULT_AUTH_REDIRECT;
    if (!finalUrl.pathname.startsWith("/") || finalUrl.pathname.startsWith("//")) {
      return DEFAULT_AUTH_REDIRECT;
    }
    return `${finalUrl.pathname}${finalUrl.search}${finalUrl.hash}`;
  } catch {
    return DEFAULT_AUTH_REDIRECT;
  }
}
