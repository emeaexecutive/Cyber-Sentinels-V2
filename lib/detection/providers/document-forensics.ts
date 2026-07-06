import { createProviderAdapter } from "./factory.ts";
export const documentForensicsProvider = createProviderAdapter({ providerName: "Document Forensics", env: ["DOCUMENT_FORENSICS_API_KEY"], supportedSignals: ["forged_document"] });
