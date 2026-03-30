import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createAuthorizationCode, getBaseUrl } from "@/lib/tink";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

  try {
    const code = await createAuthorizationCode(
      session.user.id,
      session.user.email ?? session.user.id
    );

    const redirectUri = `${getBaseUrl()}/api/tink/callback`;

    const params = new URLSearchParams({
      client_id: process.env.TINK_CLIENT_ID!,
      redirect_uri: redirectUri,
      authorization_code: code,
      market: "IT",
      locale: "it_IT",
    });

    const url = `https://link.tink.com/1.0/transactions/connect-accounts?${params}`;
    return NextResponse.json({ url });
  } catch (err) {
    console.error("[Tink auth error v3]", err instanceof Error ? err.message : err);
    const msg = err instanceof Error ? err.message : "Errore Tink";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
