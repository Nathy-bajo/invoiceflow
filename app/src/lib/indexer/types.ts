// Wire shape served by /api/invoices, decoupled from the on-chain Invoice
// struct so it survives Anchor schema changes.

export type IndexedInvoice = {
  pda: string;
  invoiceId: string;
  totalAmount: number;
  releasedAmount: number;
  status: string;
  client: string;
  freelancer: string;
  role: "freelancer" | "client";
};

export type InvoicesResponse = {
  invoices: IndexedInvoice[];
  cachedAt: string;
  ttlSeconds: number;
  fromCache: boolean;
};

export type InvoicesError = {
  error: string;
};
