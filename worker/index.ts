import {handleCreativeRequest} from "../server/ai/router";
import {handleAssistantRequest} from "../server/spark";
import handler from "vinext/server/fetch-handler";
import { runWithConnectorBinding } from "../lib/connector-context";
import type { ConnectorBinding } from "../lib/connector-contract.mjs";

const worker = {
  async fetch(request: Request, env: Cloudflare.Env, ctx: ExecutionContext<{ CONNECTORS?: ConnectorBinding }>) {
    const url = new URL(request.url);
    const hasAuth = !!request.headers.get("oai-authenticated-user-id");
    let userCookieToSet: string | null = null;

    if (!hasAuth) {
      const cookieHeader = request.headers.get("cookie") || "";
      const match = cookieHeader.match(/(?:^|;\s*)archkit_uid=([^;]+)/);
      let uid: string;
      if (match) {
        uid = match[1];
      } else {
        const ip = request.headers.get("cf-connecting-ip");
        uid = ip ? "u_" + ip.replace(/[^a-zA-Z0-9_-]/g, "_") : "studio-user";
        userCookieToSet = `archkit_uid=${uid}; Path=/; SameSite=Lax; Max-Age=31536000`;
      }
      const headers = new Headers(request.headers);
      headers.set("oai-authenticated-user-id", uid);
      request = new Request(request, { headers });
    }

    let response: Response;
    if (url.pathname.startsWith("/api/creative/")) {
      response = await handleCreativeRequest(request, env);
    } else if (url.pathname === "/api/assistant") {
      response = await handleAssistantRequest(request, env);
    } else {
      let binding = ctx.props?.CONNECTORS;
      if (import.meta.env.DEV && !binding && env.CONNECTORS) {
        const preview = env.CONNECTORS;
        const expiresAt = Date.now() + 60_000;
        binding = {
          async getContext() {
            if (Date.now() >= expiresAt) return { status: "request_context_expired" };
            return preview.getContext?.() ?? { status: "binding_unavailable" };
          },
          async invoke(connectorId, actionName, args) {
            if (Date.now() >= expiresAt) {
              return { status: "request_context_expired", message: "This request has expired. Please try again." };
            }
            return preview.invoke(connectorId, actionName, args);
          },
        };
      }
      response = await runWithConnectorBinding(binding, () => handler.fetch(request, env, ctx));
    }

    if (userCookieToSet) {
      const newHeaders = new Headers(response.headers);
      newHeaders.append("Set-Cookie", userCookieToSet);
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders,
      });
    }

    return response;
  },
};

export default worker;
