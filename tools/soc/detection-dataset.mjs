// Deliberately includes a benign authenticated warning: provenance does not prove
// compromise. This small hand-labelled fixture is not a population estimate.
export const adversarialDataset = [
 {id:'unauthorized-export',malicious:true,warning:{}},
 {id:'compromised-agent-export',malicious:true,warning:{}},
 {id:'authorized-export-warning',malicious:false,warning:{}},
 {id:'ordinary-heartbeat',malicious:false,warning:{kind:'SYNTHETIC_HEARTBEAT'}},
];
export async function measureDetection(soc,tenant,envelope){
 const rows=[];const counts={truePositive:0,falsePositive:0,trueNegative:0,falseNegative:0};
 for(const row of adversarialDataset){const result=await soc.ingest(tenant,'operator',envelope(row.warning));const detected=result.accepted===true;counts[row.malicious?(detected?'truePositive':'falseNegative'):(detected?'falsePositive':'trueNegative')]++;rows.push({id:row.id,malicious:row.malicious,detected});}
 return {label:'HAND-LABELLED SYNTHETIC FIXTURE ONLY',rows,counts,denominators:{records:rows.length,malicious:rows.filter(x=>x.malicious).length,benign:rows.filter(x=>!x.malicious).length,predictedPositive:counts.truePositive+counts.falsePositive},precision:counts.truePositive/(counts.truePositive+counts.falsePositive),recall:counts.truePositive/(counts.truePositive+counts.falseNegative)};
}
