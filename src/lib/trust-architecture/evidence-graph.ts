export const evidenceGraphEdgeTypes=["ASSERTS","DERIVED_FROM","OBSERVED_BY","AUTHORIZED_BY","PARTICIPATED_IN","APPLIES_TO","SUPERSEDES","REVOKES","CONFLICTS_WITH","SUPPORTED","CHALLENGED","RESULTED_IN"] as const;
export type EvidenceGraphEdgeType=(typeof evidenceGraphEdgeTypes)[number];
export type EvidenceGraphNode={nodeId:string;enterpriseId:string;nodeType:string;externalId:string;domainKey:string|null;label:string|null;metadata:Record<string,unknown>;createdAt:string};
export type EvidenceGraphEdge={edgeId:string;enterpriseId:string;fromNodeId:string;toNodeId:string;edgeType:EvidenceGraphEdgeType;evidenceId:string|null;createdAt:string};
export type EvidenceGraph={rootNodeId:string|null;nodes:EvidenceGraphNode[];edges:EvidenceGraphEdge[];depth:number;truncated:boolean};

export function assertBoundedTraversal(depth:number,limit:number){if(!Number.isSafeInteger(depth)||depth<0||depth>3)throw Object.assign(new Error("Graph depth must be between 0 and 3."),{code:"GRAPH_DEPTH_INVALID"});if(!Number.isSafeInteger(limit)||limit<1||limit>500)throw Object.assign(new Error("Graph limit must be between 1 and 500."),{code:"GRAPH_LIMIT_INVALID"});}

export function safeGraphMetadata(value:unknown):Record<string,unknown>{if(!value||typeof value!=="object"||Array.isArray(value))return{};const denied=/payload|secret|token|credential|biometric|document|email|phone|address|ip/i;return Object.fromEntries(Object.entries(value as Record<string,unknown>).filter(([key,item])=>!denied.test(key)&&["string","number","boolean"].includes(typeof item)));}
