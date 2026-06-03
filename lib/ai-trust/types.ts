export type AgentIdentity = {
  id: string;
  name: string;
  owner_email: string | null;
  owner_user_id: string | null;
  purpose: string | null;
  model_provider: string | null;
  model_name: string | null;
  permission_scope: string | null;
  status: string | null;
  trust_score: number | null;
  metadata?: Record<string, unknown> | null;
  created_at: string | null;
  updated_at: string | null;
};

export type TrustEvent = {
  id: string;
  actor_type: string | null;
  actor_id: string | null;
  actor_label: string | null;
  event_type: string;
  event_source: string | null;
  risk_level: string | null;
  case_id: string | null;
  passport_id: string | null;
  agent_id: string | null;
  evidence_id: string | null;
  decision_id: string | null;
  metadata?: Record<string, unknown> | null;
  created_at: string | null;
};

export type AgentPermission = {
  id: string;
  agent_id: string | null;
  permission_name: string | null;
  permission_scope: string | null;
  risk_level: string | null;
  status: string | null;
  created_by: string | null;
  created_at: string | null;
};
