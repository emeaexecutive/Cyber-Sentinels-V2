import { csvCell } from "./projections";
import type { TrustCentreRow, TrustCentreSnapshot } from "./types";

export const trustCentreReportTypes = [
  "trust-summary",
  "risk-summary",
  "evidence",
  "replay",
  "trust-drift",
  "policy",
] as const;
export const trustCentreReportFormats = ["json", "csv", "pdf"] as const;

export type TrustCentreReportType = (typeof trustCentreReportTypes)[number];
export type TrustCentreReportFormat = (typeof trustCentreReportFormats)[number];

export function reportRows(snapshot: TrustCentreSnapshot, report: TrustCentreReportType) {
  if (report === "risk-summary") return snapshot.highRiskEntities;
  if (report === "evidence") return snapshot.evidence;
  if (report === "replay") return snapshot.replayActivity;
  if (report === "trust-drift") {
    return snapshot.assessments.filter(
      (row) => String(row.transition_type ?? "").toUpperCase() !== "UNCHANGED"
    );
  }
  if (report === "policy") return snapshot.policies;
  return [
    {
      organisation: snapshot.organisation.name,
      generated_at: snapshot.generatedAt,
      current_trust_health: snapshot.overview.currentTrustHealth,
      subjects: snapshot.overview.subjectCount,
      high_risk: snapshot.overview.highRiskCount,
      open_alerts: snapshot.overview.openAlertCount,
      pending_reviews: snapshot.overview.pendingReviewCount,
      policies: snapshot.overview.policyCount,
    },
  ];
}

export function rowsToCsv(rows: TrustCentreRow[]) {
  const headers = [...new Set(rows.flatMap((row) => Object.keys(row)))].sort();
  if (!headers.length) return "status\nno_data\n";
  return [
    headers.map(csvCell).join(","),
    ...rows.map((row) => headers.map((header) => csvCell(row[header])).join(",")),
  ].join("\n");
}

function pdfSafe(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[^\x20-\x7E]/g, "-")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function wrap(value: string, maximum = 92) {
  if (value.length <= maximum) return [value];
  const lines: string[] = [];
  let current = "";
  for (const word of value.split(/\s+/)) {
    if (current && `${current} ${word}`.length > maximum) {
      lines.push(current);
      current = word;
    } else {
      current = `${current} ${word}`.trim();
    }
  }
  if (current) lines.push(current);
  return lines;
}

export function rowsToPdf(
  title: string,
  snapshot: TrustCentreSnapshot,
  rows: TrustCentreRow[]
) {
  const lines = [
    "Cyber Sentinels Enterprise Trust Centre",
    title,
    `Organisation: ${snapshot.organisation.name}`,
    `Generated: ${snapshot.generatedAt}`,
    `Scope: tenant ${snapshot.organisation.id}`,
    "",
    ...(rows.length
      ? rows.flatMap((row, index) => [
          `Record ${index + 1}`,
          ...Object.entries(row).map(([key, value]) =>
            `${key}: ${typeof value === "object" ? JSON.stringify(value) : String(value ?? "")}`
          ),
          "",
        ])
      : ["No measured records are available for this report."]),
  ].flatMap((line) => wrap(pdfSafe(line)));
  const pages = Array.from(
    { length: Math.max(1, Math.ceil(lines.length / 48)) },
    (_, index) => lines.slice(index * 48, (index + 1) * 48)
  );
  const fontId = 3 + pages.length * 2;
  const objects = new Map<number, string>();
  objects.set(1, "<< /Type /Catalog /Pages 2 0 R >>");
  objects.set(
    2,
    `<< /Type /Pages /Kids [${pages.map((_, index) => `${3 + index * 2} 0 R`).join(" ")}] /Count ${pages.length} >>`
  );
  pages.forEach((page, index) => {
    const pageId = 3 + index * 2;
    const contentId = pageId + 1;
    const content = [
      "BT",
      "/F1 9 Tf",
      "42 800 Td",
      "14 TL",
      ...page.map((line) => `(${line}) Tj T*`),
      "ET",
    ].join("\n");
    objects.set(
      pageId,
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${contentId} 0 R >>`
    );
    objects.set(
      contentId,
      `<< /Length ${Buffer.byteLength(content, "ascii")} >>\nstream\n${content}\nendstream`
    );
  });
  objects.set(fontId, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [0];
  for (let id = 1; id <= fontId; id += 1) {
    offsets[id] = Buffer.byteLength(pdf, "ascii");
    pdf += `${id} 0 obj\n${objects.get(id)}\nendobj\n`;
  }
  const xref = Buffer.byteLength(pdf, "ascii");
  pdf += `xref\n0 ${fontId + 1}\n0000000000 65535 f \n`;
  for (let id = 1; id <= fontId; id += 1) {
    pdf += `${String(offsets[id]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${fontId + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(pdf, "ascii");
}
