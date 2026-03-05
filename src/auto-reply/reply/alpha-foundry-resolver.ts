import type { OpenClawConfig } from "../../config/config.js";
import type { MsgContext } from "../templating.js";
import type { GetReplyOptions, ReplyPayload } from "../types.js";
import { resolveSessionAgentId } from "../../agents/agent-scope.js";
import { logVerbose } from "../../globals.js";

export function isAlphaFoundryBridgeAgent(
  cfg: OpenClawConfig,
  agentId: string,
): boolean {
  const agent = cfg.agents?.list?.find((a) => a.id === agentId);
  return Boolean(agent?.alphaFoundry?.baseUrl);
}

export async function alphaFoundryReplyResolver(
  ctx: MsgContext,
  _opts?: GetReplyOptions,
  configOverride?: OpenClawConfig,
): Promise<ReplyPayload | ReplyPayload[] | undefined> {
  const cfg = configOverride ?? (await import("../../config/config.js")).loadConfig();
  const agentId = resolveSessionAgentId({ sessionKey: ctx.SessionKey, config: cfg });
  const agent = cfg.agents?.list?.find((a) => a.id === agentId);
  const afConfig = agent?.alphaFoundry;
  if (!afConfig?.baseUrl) {
    logVerbose(`alpha-foundry-resolver: no alphaFoundry config for agent ${agentId}, skipping`);
    return undefined;
  }

  const url = `${afConfig.baseUrl.replace(/\/+$/, "")}/api/bridge/message`;
  const body = {
    message: ctx.BodyForCommands ?? ctx.Body ?? "",
    channel: ctx.Surface ?? ctx.Provider ?? "unknown",
    peer_id: ctx.From ?? "",
    message_id: ctx.MessageSid ?? "",
  };

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (afConfig.authToken) {
    headers["X-Bridge-Token"] = afConfig.authToken;
  }

  logVerbose(`alpha-foundry-resolver: POST ${url}`);

  void fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  }).catch((err) => {
    logVerbose(`alpha-foundry-resolver: POST failed: ${err instanceof Error ? err.message : String(err)}`);
  });

  return undefined;
}
