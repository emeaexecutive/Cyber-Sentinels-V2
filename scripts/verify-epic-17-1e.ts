import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

type Status = "PASS" | "FAIL" | "BLOCKED";
type Check = { name: string; status: Status; critical: boolean; detail: string; durationMs?: number };
const root = resolve(import.meta.dirname, ".."); const checks: Check[] = [];
const required = [
  "src/components/consent/ConsentBanner.tsx","src/components/consent/ConsentPreferences.tsx","src/components/consent/ConsentCategory.tsx","src/components/consent/ConsentReceipt.tsx","src/components/consent/ConsentTimeline.tsx","src/components/consent/ConsentProviderList.tsx","src/components/consent/ConsentStatus.tsx",
  "app/privacy/page.tsx","app/privacy/preferences/page.tsx","app/privacy/cookies/page.tsx","app/privacy/consent-history/page.tsx","app/admin/consent/page.tsx",
  "app/api/consent/route.ts","app/api/consent/withdraw/route.ts","app/api/consent/history/route.ts","app/api/consent/receipt/[id]/route.ts","app/api/consent/policy/route.ts","app/api/consent/catalogue/route.ts","app/api/admin/consent/summary/route.ts","app/api/admin/consent/policies/route.ts",
  "src/lib/consent/receipt.ts","src/lib/consent/tracker-loader.ts","src/lib/consent/google-consent.ts","src/lib/consent/integrations.ts","supabase/migrations/202607200002_enterprise_trust_consent_manager.sql",
  "docs/implementation/EPIC-17.1E-IMPLEMENTATION-REPORT.md","docs/architecture/CONSENT-DOMAIN-MODEL.md","docs/privacy/CONSENT-POLICY-MODEL.md","docs/privacy/COOKIE-AND-TRACKER-CATALOGUE.md","docs/privacy/CONSENT-RECEIPTS.md","docs/security/CONSENT-SECURITY-CONTROLS.md","docs/operations/EPIC-17.1E-RUNBOOK.md","docs/implementation/EPIC-17.1E-TEST-REPORT.md",
];
for (const path of required) checks.push({ name: `Artifact: ${path}`, status: existsSync(join(root,path))?"PASS":"FAIL", critical: true, detail: existsSync(join(root,path))?"Present":"Missing" });
function source(name:string,path:string,patterns:RegExp[],critical=true){try{const value=readFileSync(join(root,path),"utf8");const missing=patterns.filter((pattern)=>!pattern.test(value));checks.push({name,status:missing.length?"FAIL":"PASS",critical,detail:missing.length?`${missing.length} invariant(s) absent`:"Required invariants present"});}catch{checks.push({name,status:"FAIL",critical,detail:"Unreadable artifact"});}}
const git=(args:string[])=>spawnSync("git",args,{cwd:root,encoding:"utf8",windowsHide:true});
const branch=git(["branch","--show-current"]); checks.push({name:"Branch is main",status:branch.status===0&&branch.stdout.trim()==="main"?"PASS":"FAIL",critical:true,detail:branch.status===0?`Branch: ${branch.stdout.trim()}`:"Git branch unavailable"});
const files=git(["ls-files","--cached","--others","--exclude-standard"]); let conflictCount=0; let secretCount=0;
if(files.status===0){for(const relative of files.stdout.split(/\r?\n/).filter(Boolean)){if(relative.startsWith("reports/")||relative.startsWith(".env"))continue;try{const value=readFileSync(join(root,relative),"utf8");if(/^(<{7}|={7}|>{7})/m.test(value))conflictCount+=1;if(/(?:sk_live_[A-Za-z0-9]{12,}|sb_secret_[A-Za-z0-9]{12,}|-----BEGIN (?:RSA |EC )?PRIVATE KEY-----)/.test(value))secretCount+=1;}catch{}}
} else conflictCount=1;
checks.push({name:"Merge conflicts",status:conflictCount?"FAIL":"PASS",critical:true,detail:conflictCount?`${conflictCount} file(s) contain conflict markers`:"No conflict markers"});
checks.push({name:"Secret scan",status:secretCount?"FAIL":"PASS",critical:true,detail:secretCount?`${secretCount} file(s) contain a high-confidence secret pattern`:"No high-confidence secret patterns"});
source("Equal Accept and Reject controls","src/components/consent/ConsentBanner.tsx",[/className=\{equalAction\}>Accept All/,/className=\{equalAction\}>Reject Optional/]);
source("No optional pre-choice default","src/lib/consent/policy.ts",[/functional: false/,/analytics: false/,/ai_improvements: false/,/marketing: false/]);
source("Receipt integrity","src/lib/consent/receipt.ts",[/canonicalizeConsentReceipt/,/hashConsentReceipt/,/verifyConsentReceipt/]);
source("Consent RLS and append-only history","supabase/migrations/202607200002_enterprise_trust_consent_manager.sql",[/enable row level security/,/users read own consent receipts/,/consent_receipts_append_only/,/append_trust_event_v1/]);
source("Tracker loader","src/lib/consent/tracker-loader.ts",[/registerConsentTracker/,/effective\[tracker\.category\]/,/tracker\.cleanup/]);
source("Google Consent Mode v2","src/lib/consent/google-consent.ts",[/ad_storage/,/analytics_storage/,/ad_user_data/,/ad_personalization/,/security_storage/]);
source("Accessibility contracts","src/components/consent/ConsentBanner.tsx",[/focus/,/aria-modal/,/event\.key/]);
source("Hopae and World ID regression","tests/trust-event-foundation.test.mjs",[/Hopae rejects invalid/,/World ID is always inconclusive/]);

for(const [name,script] of [["Lint","lint"],["TypeScript","typecheck"],["Consent unit/integration/accessibility tests","test:consent"],["Production build","build"]] as const){const started=Date.now();const executable=process.platform==="win32"?(process.env.ComSpec??"C:\\Windows\\System32\\cmd.exe"):"npm";const args=process.platform==="win32"?["/d","/s","/c",`npm.cmd run ${script}`]:["run",script];const result=spawnSync(executable,args,{cwd:root,encoding:"utf8",windowsHide:true,timeout:600_000,env:{...process.env,NEXT_TELEMETRY_DISABLED:"1"}});checks.push({name,status:result.status===0?"PASS":"FAIL",critical:false,detail:result.status===0?"Command passed":`Command exited ${result.status??"without a code"}`,durationMs:Date.now()-started});}
checks.push({name:"Supabase migration and live RLS",status:"BLOCKED",critical:false,detail:"BLOCKED_BY_EXTERNAL_CONFIGURATION — verifier does not mutate infrastructure"});
checks.push({name:"Production region/provider catalogue",status:"BLOCKED",critical:false,detail:"BLOCKED_BY_EXTERNAL_CONFIGURATION — requires reviewed deployment configuration"});
const criticalFailures=checks.filter((check)=>check.status==="FAIL"&&check.critical);const failures=checks.filter((check)=>check.status==="FAIL");const exitCode=criticalFailures.length?2:failures.length?1:0;
const timestamp=new Date().toISOString().replace(/[:.]/g,"-");const reports=join(root,"reports");mkdirSync(reports,{recursive:true});const reportPath=join(reports,`epic-17.1e-verification-${timestamp}.md`);
const lines=["# EPIC 17.1E Verification Report","",`Generated: ${new Date().toISOString()}`,`Aggregate exit code: ${exitCode}`,"","| Check | Status | Critical | Detail |","|---|---|---:|---|",...checks.map((check)=>`| ${check.name.replaceAll("|","\\|")} | ${check.status} | ${check.critical?"yes":"no"} | ${check.detail.replaceAll("|","\\|")}${check.durationMs===undefined?"":` (${check.durationMs} ms)`} |`),"","No deployment, infrastructure mutation, Production data access or secret output was performed.",""];
writeFileSync(reportPath,lines.join("\n"),"utf8");console.log(`EPIC 17.1E verifier: ${exitCode===0?"PASSED":exitCode===1?"REMEDIATION REQUIRED":"CRITICAL BLOCKER"}`);console.log(`Report: ${reportPath}`);process.exitCode=exitCode;
