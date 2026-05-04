/**
 * Pure-browser SHA-256 of a UTF-8 string. Returns the 32-byte digest as a
 * regular number array (matches Anchor's `[u8; 32]` serialization shape).
 */
export async function sha256Bytes(input: string): Promise<number[]> {
  const data = new TextEncoder().encode(input);
  // Newer DOM lib types narrow BufferSource to ArrayBuffer-backed views, but
  // SubtleCrypto accepts the SharedArrayBuffer-backed view too. Cast through
  // ArrayBuffer to match the strict overload without copying.
  const buf = await crypto.subtle.digest("SHA-256", data.buffer as ArrayBuffer);
  return Array.from(new Uint8Array(buf));
}

export function bytesToHex(bytes: number[] | Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
