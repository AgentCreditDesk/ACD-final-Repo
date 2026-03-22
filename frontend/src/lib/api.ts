const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(error.error || `API error: ${res.status}`);
  }

  return res.json();
}

// Loan endpoints
export const loansApi = {
  getAll: () => fetchApi<any[]>("/loans"),
  getPending: () => fetchApi<any[]>("/loans/pending"),
  getById: (id: string) => fetchApi<any>(`/loans/${id}`),
  getByBorrower: (address: string) => fetchApi<any[]>(`/loans?borrower=${address}`),
  getStats: () => fetchApi<any>("/loans/stats/summary"),

  createRequest: (data: {
    borrowerAddress: string;
    amount: string;
    durationSeconds: number;
    purpose: string;
  }) =>
    fetchApi<any>("/loans/request", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  postDecision: (
    id: string,
    decision: {
      approve: boolean;
      principal?: string;
      aprBps?: number;
      durationSeconds?: number;
      rationale: string;
    }
  ) =>
    fetchApi<any>(`/loans/${id}/decision`, {
      method: "POST",
      body: JSON.stringify(decision),
    }),

  fund: (id: string) =>
    fetchApi<any>(`/loans/${id}/fund`, { method: "POST" }),
};

// Borrower endpoints
export const borrowersApi = {
  getScore: (address: string) => fetchApi<any>(`/borrowers/${address}/score`),
  getLoans: (address: string) => fetchApi<any[]>(`/loans?borrower=${address}`),
};

// Treasury endpoints
export const treasuryApi = {
  getStatus: () => fetchApi<any>("/treasury/status"),
  getWdkStatus: () => fetchApi<any>("/treasury/wdk-status"),
  getEvents: (limit = 50) => fetchApi<any[]>(`/treasury/events?limit=${limit}`),
  getPolicy: () => fetchApi<any>("/treasury/policy"),
  rebalance: () => fetchApi<any>("/treasury/rebalance", { method: "POST" }),
};
