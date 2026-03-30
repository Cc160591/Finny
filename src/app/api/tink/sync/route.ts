import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { refreshAccessToken, getTinkTransactions, parseAmount } from "@/lib/tink";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

  const userId = session.user.id;

  const tinkToken = await prisma.tinkToken.findUnique({ where: { userId } });
  if (!tinkToken) {
    return NextResponse.json({ error: "Nessun conto bancario collegato" }, { status: 400 });
  }

  // Refresh token if needed
  let accessToken = tinkToken.accessToken;
  if (new Date() >= tinkToken.expiresAt) {
    try {
      const refreshed = await refreshAccessToken(tinkToken.refreshToken);
      accessToken = refreshed.access_token;
      await prisma.tinkToken.update({
        where: { userId },
        data: {
          accessToken,
          expiresAt: new Date(Date.now() + refreshed.expires_in * 1000),
        },
      });
    } catch {
      return NextResponse.json({ error: "Token scaduto, ricollega la banca" }, { status: 401 });
    }
  }

  // Get linked accounts
  const { accountId } = await req.json().catch(() => ({})) as { accountId?: string };
  const linkedAccounts = await prisma.account.findMany({
    where: {
      userId,
      tinkAccountId: { not: null },
      ...(accountId ? { id: accountId } : {}),
    },
  });

  if (linkedAccounts.length === 0) {
    return NextResponse.json({ error: "Nessun conto collegato trovato" }, { status: 400 });
  }

  let totalImported = 0;

  for (const account of linkedAccounts) {
    let pageToken: string | undefined;

    do {
      const { transactions, nextPageToken } = await getTinkTransactions(
        accessToken,
        account.tinkAccountId!,
        pageToken
      );

      for (const tx of transactions) {
        if (tx.status !== "BOOKED") continue;

        const rawAmount = parseAmount(tx.amount.value);
        const amount = Math.abs(rawAmount);
        const type = rawAmount >= 0 ? "INCOME" : "EXPENSE";
        const description = tx.descriptions.display ?? tx.descriptions.original;
        const date = new Date(tx.dates.booked);

        try {
          await prisma.transaction.create({
            data: {
              userId,
              accountId: account.id,
              amount,
              description,
              date,
              type,
              tinkTransactionId: tx.id,
              categoryId: null,
            },
          });
          totalImported++;
        } catch {
          // Skip duplicates (tinkTransactionId unique constraint)
        }
      }

      pageToken = nextPageToken;
    } while (pageToken);

    await prisma.account.update({
      where: { id: account.id },
      data: { tinkLastSync: new Date() },
    });
  }

  return NextResponse.json({ success: true, imported: totalImported });
}
