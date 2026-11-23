import type { GatewayLimits } from "../../config/limits.js";

export function boundedFetch(limits: GatewayLimits, credentials: Record<string, string> = {}): typeof fetch {
  return async (input, init) => {
    if (typeof init?.body === "string" && Buffer.byteLength(init.body) > limits.requestBytes) throw new Error("Request exceeds the configured byte limit");
    const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
    for (const [name, value] of Object.entries(credentials)) headers.set(name, value);
    const response = await fetch(input, { ...init, headers });
    if (!response.body) return response;
    const sse = response.headers.get("content-type")?.includes("text/event-stream");
    if (!sse && Number(response.headers.get("content-length")) > limits.responseBytes) {
      await response.body.cancel();
      throw new Error("Response exceeds the configured byte limit");
    }
    let bytes = 0;
    let newlines = 0;
    const stream = response.body.pipeThrough(new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        if (sse) {
          for (const byte of chunk) {
            if (++bytes > limits.responseBytes) throw new Error("Response event exceeds the configured byte limit");
            if (byte === 10) { if (++newlines === 2) { bytes = 0; newlines = 0; } }
            else if (byte !== 13) newlines = 0;
          }
        } else if ((bytes += chunk.byteLength) > limits.responseBytes) throw new Error("Response exceeds the configured byte limit");
        controller.enqueue(chunk);
      },
    }));
    return new Response(stream, { status: response.status, statusText: response.statusText, headers: response.headers });
  };
}
