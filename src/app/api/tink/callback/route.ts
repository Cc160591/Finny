import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { exchangeCodeForToken, getTinkAccounts, parseAmount } from "@/lib/tink";
import { prisma } from "@/lib/prisma";

const ACCOUNT_TYPE_MAP: Record<string, string> = {
  CHECKING: "CHECKING",
  SAVINGS: "SAVINGS",
  CREDIT_CARD: "CREDIT",
  INVESTMENT: "INVESTMENT",
  OTHER: "CHECKING",
};

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const code = req.nextUrl.searchParams.get("code");
  const error = req.nextUrl.searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(new URL("/conti?tink=error", req.url));
  }

  try {
    const tokenData = await exchangeCodeForToken(code);
    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);

    await prisma.tinkToken.upsert({
      where: { userId: session.user.id },
      update: {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        expiresAt,
      },
      create: {
        userId: session.user.id,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        expiresAt,
      },
    });

    const tinkAccounts = await getTinkAccounts(tokenData.access_token);

    for (const ta of tinkAccounts) {
      const balance = parseAmount(ta.balances.booked.amount.value);
      const accountType = ACCOUNT_TYPE_MAP[ta.type] ?? "CHECKING";

      const existing = await prisma.account.findFirst({
        where: { userId: session.user.id, tinkAccountId: ta.id },
      });

      if (!existing) {
        await prisma.account.create({
          data: {
            userId: session.user.id,
            name: ta.name,
            type: accountType as "CHECKING" | "SAVINGS" | "CASH" | "CREDIT" | "INVESTMENT",
            balance,
            tinkAccountId: ta.id,
            tinkLastSync: new Date(),
          },
        });
      } else {
        await prisma.account.update({
          where: { id: existing.id },
          data: { balance, tinkLastSync: new Date() },
        });
      }
    }

    return NextResponse.redirect(new URL("/conti?tink=success", req.url));
  } catch (err) {
    console.error("[Tink callback error]", err);
    return NextResponse.redirect(new URL("/conti?tink=error", req.url));
  }
}
