import { Hono } from "hono";

const DEFAULT_UPSTREAM_ORIGIN = "https://oblockparty.xvzf.workers.dev";

function getUpstreamOrigin(upstreamOrigin?: Env["UPSTREAM_ORIGIN"]): string {
  return (upstreamOrigin || DEFAULT_UPSTREAM_ORIGIN).replace(/\/+$/, "");
}

function toUpstreamUrl(
  requestUrl: string,
  upstreamOrigin?: Env["UPSTREAM_ORIGIN"],
): URL {
  const incomingUrl = new URL(requestUrl);
  return new URL(
    `${getUpstreamOrigin(upstreamOrigin)}${incomingUrl.pathname}${incomingUrl.search}`,
  );
}

const app = new Hono<{ Bindings: Env }>();

app.all("/api/*", async (c) =>
  fetch(new Request(toUpstreamUrl(c.req.url, c.env.UPSTREAM_ORIGIN), c.req.raw)),
);

app.all("/signal", async (c) =>
  fetch(new Request(toUpstreamUrl(c.req.url, c.env.UPSTREAM_ORIGIN), c.req.raw)),
);

app.all("/parties/*", async (c) =>
  fetch(new Request(toUpstreamUrl(c.req.url, c.env.UPSTREAM_ORIGIN), c.req.raw)),
);

app.all("/party/*", async (c) =>
  fetch(new Request(toUpstreamUrl(c.req.url, c.env.UPSTREAM_ORIGIN), c.req.raw)),
);

app.all("*", async (c) => c.env.ASSETS.fetch(c.req.raw));

export default app;
