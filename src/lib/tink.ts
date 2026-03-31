const TINK_API = "https://api.tink.com";

function getClientId() {
  return process.env.TINK_CLIENT_ID!;
}
function getClientSecret() {
  return process.env.TINK_CLIENT_SECRET!;
}

export async function getClientToken(): Promise<string> {
  const res = await fetch(`${TINK_API}/api/v1/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: getClientId(),
      client_secret: getClientSecret(),
      grant_type: "client_credentials",
      scope: "authorization:grant",
    }),
  });
  const text = await res.text();
  let data: Record<string, unknown> = {};
  try { data = JSON.parse(text); } catch { throw new Error(`Tink risposta non-JSON (${res.status}): ${text.slice(0, 200)}`); }
  if (!data.access_token) throw new Error(`Tink client token error (${res.status}): ${JSON.stringify(data)}`);
  return data.access_token as string;
}

export async function createAuthorizationCode(externalUserId: string, idHint: string): Promise<string> {
  const clientToken = await getClientToken();
  const res = await fetch(`${TINK_API}/api/v1/oauth/authorization-grant/delegate`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${clientToken}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      actor_client_id: getClientId(),
      external_user_id: externalUserId,
      id_hint: idHint,
      scope: "accounts:read,balances:read,transactions:read,provider-consents:read",
    }),
  });
  const text = await res.text();
  let data: Record<string, unknown> = {};
  try { data = JSON.parse(text); } catch { throw new Error(`Tink delegate non-JSON (${res.status}): ${text.slice(0, 200)}`); }
  if (!data.code) throw new Error(`Tink delegate error (${res.status}): ${JSON.stringify(data)}`);
  return data.code as string;
}

export async function exchangeCodeForToken(code: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
}> {
  const res = await fetch(`${TINK_API}/api/v1/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: getClientId(),
      client_secret: getClientSecret(),
      grant_type: "authorization_code",
      code,
    }),
  });
  const data = await res.json();
  if (!data.access_token) throw new Error(`Tink token exchange error: ${JSON.stringify(data)}`);
  return data;
}

export async function refreshAccessToken(refreshToken: string): Promise<{
  access_token: string;
  expires_in: number;
}> {
  const res = await fetch(`${TINK_API}/api/v1/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: getClientId(),
      client_secret: getClientSecret(),
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });
  const data = await res.json();
  if (!data.access_token) throw new Error(`Tink refresh error: ${JSON.stringify(data)}`);
  return data;
}

export interface TinkAccount {
  id: string;
  name: string;
  type: string;
  balances: {
    booked: { amount: { currencyCode: string; value: { unscaledValue: number; scale: number } } };
  };
}

export async function getTinkAccounts(accessToken: string): Promise<TinkAccount[]> {
  const res = await fetch(`${TINK_API}/data/v2/accounts`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await res.json();
  return data.accounts ?? [];
}

export interface TinkTransaction {
  id: string;
  accountId: string;
  amount: { currencyCode: string; value: { unscaledValue: number; scale: number } };
  dates: { booked: string };
  descriptions: { original: string; display?: string };
  status: string;
}

export async function getTinkTransactions(
  accessToken: string,
  accountId?: string,
  pageToken?: string
): Promise<{ transactions: TinkTransaction[]; nextPageToken?: string }> {
  const url = new URL(`${TINK_API}/data/v2/transactions`);
  if (accountId) url.searchParams.set("accountIdIn", accountId);
  if (pageToken) url.searchParams.set("pageToken", pageToken);
  url.searchParams.set("pageSize", "100");
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await res.json();
  return { transactions: data.transactions ?? [], nextPageToken: data.nextPageToken };
}

export function parseAmount(value: { unscaledValue: number; scale: number }): number {
  return value.unscaledValue / Math.pow(10, value.scale);
}

export function getBaseUrl(): string {
  const url = process.env.NEXTAUTH_URL ?? "";
  return url.startsWith("http") ? url : `https://${url}`;
}
