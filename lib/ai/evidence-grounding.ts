export function buildEvidenceAllowlist(context: Record<string, unknown>) {
  const references: string[] = [];
  const add = (key: string, value: unknown) => {
    if (value === null || value === undefined || value === "") return;
    if (Array.isArray(value)) value.forEach((item, index) => add(`${key}:${index}`, item));
    else if (typeof value !== "object") references.push(`context:${key}`);
  };
  for (const [key, value] of Object.entries(context)) add(key, value);
  return [...new Set(references)].sort();
}

export function validateEvidenceCitations(citations: unknown, allowedCitations: string[]) {
  const values = Array.isArray(citations) ? [...new Set(citations.map((value) => String(value).trim()).filter(Boolean))].slice(0, 12) : [];
  const unsupported = values.filter((citation) => !allowedCitations.includes(citation));
  return {
    valid: values.length > 0 && unsupported.length === 0,
    citations: values,
    unsupported,
  };
}
