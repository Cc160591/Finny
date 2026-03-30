import { NextResponse } from "next/server";
import { auth } from "@/auth";

const TINK_API = "https://api.tink.com";

async function getClientToken(): Promise<string> {
  const res = await fetch(`${TINK_API}/api/v1/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.TINK_CLIENT_ID ?? "",
      client_secret: process.env.TINK_CLIENT_SECRET ?? "",
      grant_type: "client_credentials",
      scope: "authorization:grant",
    }),
  });
  const text = await res.text();
  let data: Record<string, unknown> = {};
  try { data = JSON.parse(text); } catch { throw new Error(`Tink risposta non-JSON (${res.status}): "${text.slice(0, 300)}"`); }
  if (!data.access_token) throw new Error(`Tink token error (${res.status}): ${JSON.stringify(data)}`);
  return data.access_token as string;
}

async function createAuthCode(userId: string, email: string): Promise<string> {
  const clientToken = await getClientToken();
  const res = await fetch(`${TINK_API}/api/v1/oauth/authorization-grant/delegate`, {
    method: "POST",
    headers: { Authorization: `Bearer ${clientToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      actor_client_id: process.env.TINK_CLIENT_ID ?? "",
      external_user_id: userId,
      id_hint: email,
      scope: "accounts:read,balances:read,transactions:read,provider-consents:read",
    }),
  });
  const text = await res.text();
  let data: Record<string, unknown> = {};
  try { data = JSON.parse(text); } catch { throw new Error(`Tink delegate non-JSON (${res.status}): "${text.slice(0, 300)}"`); }
  if (!data.code) throw new Error(`Tink delegate error (${res.status}): ${JSON.stringify(data)}`);
  return data.code as string;
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

  const clientId = process.env.TINK_CLIENT_ID;
  const clientSecret = process.env.TINK_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.json({ error: "Credenziali Tink non configurate" }, { status: 500 });
  }

  try {
    const code = await createAuthCode(session.user.id, session.user.email ?? session.user.id);
    const baseUrl = (process.env.NEXTAUTH_URL ?? "").startsWith("http")
      ? process.env.NEXTAUTH_URL!
      : `https://${process.env.NEXTAUTH_URL}`;
    const redirectUri = `${baseUrl}/api/tink/callback`;
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      authorization_code: code,
      market: "IT",
      locale: "it_IT",
    });
    const url = `https://link.tink.com/1.0/transactions/connect-accounts?${params}`;
    return NextResponse.json({ url });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Errore Tink";
    console.error("[Tink auth error v4]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
