const faviconPngBase64 =
  "iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAVUlEQVR4nO3XwQkAIAwEwPj/T3u4BqkQJQTByyY7MnCRy5z7AKiqqqqq+g4wD8zMzMwAhmZmZgDDMzMzAGGZmZkBCM/MzACEZ2ZmBsAAVVVV1dfjA47KBEGbYQygAAAAAElFTkSuQmCC";

export function GET() {
  return new Response(Buffer.from(faviconPngBase64, "base64"), {
    headers: {
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Type": "image/png",
    },
  });
}
