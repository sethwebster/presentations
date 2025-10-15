import { createFromReadableStream } from 'react-server-dom-webpack/client.node';

function uint8ArrayToStream(bytes: Uint8Array): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      controller.enqueue(bytes);
      controller.close();
    },
  });
}

export async function decodeLumeRsc(bytes: Uint8Array): Promise<any> {
  const stream = uint8ArrayToStream(bytes);
  return createFromReadableStream(stream);
}
