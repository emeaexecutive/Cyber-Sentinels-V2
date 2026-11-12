export const tenant='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
export const project='ssssssssssssssssssss';
export const policy={projectRef:project,approved:true,environment:'test',tenantId:tenant,scope:'approved-test-model',policyVersion:'test-v1',provider:'openai',model:'fixture-explicit-model',windowMs:60000,maxWindowCalls:2,maxTotalCalls:2,maxAttemptsPerInvestigation:1,maxParallel:1,maxDurationMs:100,maxInputBytes:32768,maxOutputTokens:1800,maxWindowSpendMicros:20,maxTotalSpendMicros:20,reserveMicrosPerCall:10};
export function configuredEnv(){return{NODE_ENV:'test',NEXT_PUBLIC_SUPABASE_URL:`https://${project}.supabase.co`,OPENAI_API_KEY:'fixture-not-live',OPENAI_SOC_MODEL:policy.model,TENENTE_SOC_MODEL_BUDGETS:JSON.stringify({[tenant]:policy})};}
