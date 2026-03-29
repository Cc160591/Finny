import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { getAssetPrice } from "@/lib/finance";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1),
  symbol: z.string().min(1),
  type: z.enum(["ETF", "STOCK", "CRYPTO", "CASH", "BOND", "OTHER"]).default("ETF"),
  quantity: z.number().positive(),
  buyPrice: z.number().optional().nullable(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

  const assets = await prisma.asset.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  // Recupera i prezzi aggiornati
  const assetsWithPrices = await Promise.all(
    assets.map(async (asset) => {
      let currentPrice: number | null = null;

      // Controlla cache (aggiorna se più vecchia di 5 min)
      const cached = await prisma.assetPrice.findUnique({ where: { symbol: asset.symbol } });
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);

      if (cached && cached.updatedAt > fiveMinAgo) {
        currentPrice = cached.price;
      } else {
        currentPrice = await getAssetPrice(asset.symbol, asset.type);
        if (currentPrice !== null) {
          await prisma.assetPrice.upsert({
            where: { symbol: asset.symbol },
            update: { price: currentPrice, updatedAt: new Date() },
            create: { symbol: asset.symbol, price: currentPrice, currency: "EUR" },
          });
        }
      }

      const currentValue = currentPrice !== null ? asset.quantity * currentPrice : null;
      const costBasis = asset.buyPrice !== null ? asset.quantity * asset.buyPrice : null;
      const gainLoss = currentValue !== null && costBasis !== null ? currentValue - costBasis : null;
      const gainLossPercent =
        gainLoss !== null && costBasis !== null && costBasis > 0
          ? (gainLoss / costBasis) * 100
          : null;

      return { ...asset, currentPrice, currentValue, gainLoss, gainLossPercent };
    })
  );

  return NextResponse.json(assetsWithPrices);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Dati non validi" }, { status: 400 });

  const asset = await prisma.asset.create({
    data: { ...parsed.data, userId: session.user.id },
  });

  return NextResponse.json(asset, { status: 201 });
}
