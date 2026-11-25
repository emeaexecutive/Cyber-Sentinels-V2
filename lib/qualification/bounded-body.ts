/** Bound bytes while consuming a stream, including chunked bodies without a length header. */
export async function readBoundedText(body: ReadableStream<Uint8Array> | null, limit: number): Promise<string> {
  if (!body) return "";
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    for (;;) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > limit) {
        await reader.cancel();
        throw new RangeError("BODY_TOO_LARGE");
      }
      chunks.push(chunk.value);
    }
  } finally { reader.releaseLock(); }
  return new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks));
}
