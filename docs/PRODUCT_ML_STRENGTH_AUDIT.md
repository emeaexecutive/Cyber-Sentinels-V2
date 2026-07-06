# Product ML Strength Audit

Last audited: 2026-07-06

Cyber Sentinels does not currently contain proprietary detection ML. The product's real strength is explainable workflow rules, normalized provider evidence, governance, replay and receipts. OpenAI-backed governance assistance generates review text; it is not an authenticity, biometric or media-detection system. No model files or ML inference libraries were found.

| Area | Current ML Strength | Source | Evidence | Risk | Next Action |
| --- | --- | --- | --- | --- | --- |
| Model inference | Inactive | Not Implemented | No model runtime, inference call or model artifact found | UI could mistake calculated risk fields for inference | Keep `Real ML` inactive until an executed model and versioned evidence exist |
| Model files | Absent | Not Implemented | No ONNX, PyTorch, TensorFlow, TFLite, safetensors or similar artifact found | No reproducible proprietary model | Define model registry, provenance and promotion controls before adding artifacts |
| ML libraries | Detection ML absent | Not Implemented | `package.json`; no detection inference dependency | General AI API usage may be conflated with detection ML | Separate generative assistance from detection inventory |
| Provider detection APIs | Adapters not implemented for media/document detection | Awaiting Credentials | `lib/detection/detection-engine.ts` | Environment-variable names could imply a working integration | Require adapter execution, health check and retained response reference before `Active` |
| Identity providers | Provider-dependent orchestration | Provider API | `lib/providers/registry.ts`, `lib/identity-providers/hopae-provider.ts` | Provider status may be read as product accuracy | Keep provider evidence separate and validate each deployment |
| Heuristic rules | Active, deterministic | Heuristic Rules | `lib/detection/detection-engine.ts`, `lib/session-integrity/model.ts` | Threshold bias and alert fatigue are unmeasured | Run representative cases and tune only from reviewed outcomes |
| Demo/mock scores | Present | Demo Data | demo seed routes and deterministic demo modules | Demo percentages can look measured | Label demo records and exclude them from accuracy reporting |
| Trust-score calculation | Active, explainable | Heuristic Rules / Provider API | `lib/trust-score.ts`, `lib/trust-score-engine.ts`, `lib/trust-engine.ts` | A score can be misread as identity truth | Retain source, dimensions, penalties and reviewer outcome |
| Anomaly scoring | Review-oriented rules | Heuristic Rules | session-integrity rules and workflow anomaly penalties | No validated baseline or production error rate | Establish normal baselines, precision/recall and drift review |
| Document forgery detection | Inactive | Not Implemented | Provenance/evidence workflow exists; no forensic inference | Provenance could be mistaken for forgery detection | Add a verified forensic provider or model and validation corpus |
| Voice-clone detection | Inactive | Not Implemented | Risk fields exist; no executed voice model/provider | Unsupported synthetic-voice conclusions | Keep as not assessed until verified inference exists |
| Image/video deepfake detection | Inactive | Not Implemented | Placeholder/review fields; no executed model/provider | Unsupported fake/authentic verdicts | Validate a provider or model on representative, consented data |
| AI-agent actions | Governed behavioral review | Heuristic Rules | agent registry, policy, authorization and audit flows | Suspicion rules may over-escalate normal automation | Benchmark suspicious and normal agent actions with reviewer agreement |

## Audit conclusion

Current product confidence should come from evidence continuity and accountable review, not unvalidated classification accuracy. Upgrade readiness requires a consented dataset, versioned test cases, source-specific ground truth, false-positive and false-negative tracking, latency measurement and independent reviewer agreement before any accuracy claim.
