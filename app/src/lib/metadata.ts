import { sha256Bytes, bytesToHex } from "./hash";

export type MetadataMilestone = {
  description: string;
  amount?: number; // optional informational field
};

export type InvoiceMetadata = {
  version: string;
  milestones: MetadataMilestone[];
  notes?: string;
};

/**
 * Resolve a metadata URI to a fetchable HTTPS URL. Supports `ar://`,
 * `ipfs://`, and plain `https://`. We use public gateways — production
 * deployments should pin to a private gateway with caching.
 */
export function resolveMetadataUri(uri: string): string {
  const trimmed = uri.trim();
  if (trimmed.startsWith("ar://")) {
    return `https://arweave.net/${trimmed.slice(5)}`;
  }
  if (trimmed.startsWith("ipfs://")) {
    return `https://ipfs.io/ipfs/${trimmed.slice(7)}`;
  }
  return trimmed;
}

/**
 * Fetch + parse the off-chain metadata JSON. Throws on network or schema error.
 */
export async function fetchMetadata(uri: string): Promise<InvoiceMetadata> {
  const resolved = resolveMetadataUri(uri);
  const res = await fetch(resolved, { cache: "force-cache" });
  if (!res.ok) {
    throw new Error(`Fetch failed: HTTP ${res.status}`);
  }
  const json = (await res.json()) as InvoiceMetadata;
  if (!json || !Array.isArray(json.milestones)) {
    throw new Error("Invalid metadata schema (missing `milestones` array)");
  }
  return json;
}

/**
 * Compare each metadata milestone description's sha256 against the on-chain
 * `description_hash` array. Returns one verification result per on-chain
 * milestone (so the UI can render row-by-row).
 */
export async function verifyMetadata(
  metadata: InvoiceMetadata,
  onChainHashes: number[][]
): Promise<
  Array<{ description: string | null; verified: boolean; reason?: string }>
> {
  const out: Array<{
    description: string | null;
    verified: boolean;
    reason?: string;
  }> = [];

  for (let i = 0; i < onChainHashes.length; i++) {
    const meta = metadata.milestones[i];
    if (!meta) {
      out.push({
        description: null,
        verified: false,
        reason: "missing in metadata",
      });
      continue;
    }
    const computed = await sha256Bytes(meta.description);
    const matches = bytesToHex(computed) === bytesToHex(onChainHashes[i]);
    out.push({
      description: meta.description,
      verified: matches,
      reason: matches ? undefined : "sha256 mismatch",
    });
  }
  return out;
}

/**
 * Build the JSON the freelancer should upload to Arweave / IPFS, given the
 * milestones they typed into the create form.
 */
export function buildMetadataJson(
  milestones: Array<{ description: string; amount: number }>,
  notes?: string
): string {
  const payload: InvoiceMetadata = {
    version: "1",
    milestones: milestones.map((m) => ({
      description: m.description,
      amount: Math.round(m.amount * 1_000_000), // base units (USDC has 6 decimals)
    })),
    notes,
  };
  return JSON.stringify(payload, null, 2);
}

export function downloadAsFile(filename: string, content: string) {
  const blob = new Blob([content], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
