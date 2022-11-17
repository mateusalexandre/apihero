import {
  DESTINATION_HEADER_NAME,
  PAYLOAD_HEADER_NAME,
  PROJECT_KEY_HEADER_NAME,
  PROTOCOL_HEADER_NAME,
} from "../constants";
import { IsomorphicRequest } from "@apihero/interceptors-js";
import { ClientRequestInterceptor } from "@apihero/interceptors-js/lib/interceptors/ClientRequest/index.js";
import { FetchInterceptor } from "@apihero/interceptors-js/lib/interceptors/fetch/index.js";
import { isMatch } from "matcher";
import debug from "debug";
import { SetupProxyOptions, PolicyRule } from "../types";

const log = debug("apihero");

export interface ProxyInstance {
  start(): Promise<void>;
  stop(): Promise<void>;
}

export function setupProxy(options: SetupProxyOptions): ProxyInstance {
  const interceptor = new ClientRequestInterceptor();
  const fetchInterceptor = new FetchInterceptor();

  const proxyUrl = options.url || "https://proxy.apihero.run";

  interceptor.on("request", (request) => {
    if (
      (options.allow && !isAllowed(request, options.allow)) ||
      (options.deny && isAllowed(request, options.deny))
    ) {
      log("request not proxied", request.url.href);
      return;
    }

    const env = options.env || process.env.NODE_ENV || "development";

    request.requestWith({
      headers: {
        ...Object.fromEntries(request.headers.entries()),
        [PROJECT_KEY_HEADER_NAME]: options.projectKey,
        [PAYLOAD_HEADER_NAME]: JSON.stringify({ env }),
      },
    });
  });

  fetchInterceptor.on("request", (request) => {
    if (
      (options.allow && !isAllowed(request, options.allow)) ||
      (options.deny && isAllowed(request, options.deny))
    ) {
      log("request not proxied", request.url.href);
      return;
    }

    const newUrl = new URL(request.url.pathname, proxyUrl);

    const env = options.env || process.env.NODE_ENV || "development";

    request.requestWith({
      url: newUrl,
      headers: {
        ...Object.fromEntries(request.headers.entries()),
        [DESTINATION_HEADER_NAME]: request.url.host,
        [PROTOCOL_HEADER_NAME]: request.url.protocol,
        [PROJECT_KEY_HEADER_NAME]: options.projectKey,
        [PAYLOAD_HEADER_NAME]: JSON.stringify({ env }),
      },
    });
  });

  interceptor.on("connect", (request) => {
    if (
      (options.allow && !isAllowed(request, options.allow)) ||
      (options.deny && isAllowed(request, options.deny))
    ) {
      log("request not proxied", request.url.href);
      return;
    }

    const newUrl = new URL(request.url.pathname, proxyUrl);

    log(`proxying ${request.url.href} to ${newUrl.href}`);

    request.connectWith({
      url: newUrl,
      headers: {
        ...Object.fromEntries(request.headers.entries()),
        [DESTINATION_HEADER_NAME]: request.url.host,
        [PROTOCOL_HEADER_NAME]: request.url.protocol,
      },
    });
  });

  return {
    start: async () => {
      interceptor.apply();
      fetchInterceptor.apply();
    },
    stop: async () => {
      interceptor.dispose();
      fetchInterceptor.dispose();
    },
  };
}

function isAllowed(
  request: IsomorphicRequest,
  allow: Array<PolicyRule>
): boolean {
  return allow.some((rule) => {
    if (typeof rule === "string") {
      return isMatch(request.url.href, rule);
    }

    return (
      rule.method === request.method && isMatch(request.url.href, rule.url)
    );
  });
}
