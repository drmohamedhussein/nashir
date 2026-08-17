import { signPayload } from "./crypto";

type SignedRequest = {
  restUrl: string;
  signingSecret: string;
  method?: "GET" | "POST";
  path: string;
  body?: unknown;
};

export async function callWordPress<T>(request: SignedRequest): Promise<T> {
  const url = new URL(request.path.replace(/^\//, ""), ensureSlash(request.restUrl));
  const method = request.method ?? (request.body ? "POST" : "GET");
  const body = request.body === undefined ? "" : JSON.stringify(request.body);
  const timestamp = String(Math.floor(Date.now() / 1000));
  const signature = signPayload(request.signingSecret, timestamp, body);

  const response = await fetch(url, {
    method,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-RankPublish-Timestamp": timestamp,
      "X-RankPublish-Signature": signature,
      "X-Nashir-Timestamp": timestamp,
      "X-Nashir-Signature": signature,
    },
    body: method === "GET" ? undefined : body,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`WordPress request failed (${response.status}): ${text.slice(0, 200)}`);
  }

  return (await response.json()) as T;
}

function ensureSlash(value: string): string {
  return value.endsWith("/") ? value : `${value}/`;
}
