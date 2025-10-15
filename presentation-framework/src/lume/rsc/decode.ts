export async function decodeLumeRsc(bytes: Uint8Array): Promise<Record<string, unknown>> {
  const text = new TextDecoder().decode(bytes);
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error('Failed to decode lume.rsc payload: ' + (error as Error).message);
  }
}
