# MCP Trust Gateway — design only

Future flow: agent → MCP request → identity → authority → tool/resource/action → canonical policy evaluation → ALLOW / REVIEW / DENY → existing evidence and receipt. The gateway sits at the action boundary; successful authentication alone never authorizes a tool action.

Reuse tenant, agent, authority, canonical transaction, receipt and Replay. Later tool execution reports append observations without rewriting authorization. Timeout or absent response is not ALLOW. No separate engine, identity system or MCP gateway implementation is introduced in Epic 1.
