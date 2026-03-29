import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getOpenAI, AI_SYSTEM_PROMPT } from "@/lib/openai";
import { prisma } from "@/lib/prisma";
import type OpenAI from "openai";

const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "create_transaction",
      description: "Crea una nuova transazione (spesa o entrata)",
      parameters: {
        type: "object",
        properties: {
          accountId: { type: "string", description: "ID del conto" },
          categoryId: { type: "string", description: "ID della categoria (opzionale)" },
          amount: { type: "number", description: "Importo in euro (positivo)" },
          description: { type: "string", description: "Descrizione della transazione" },
          type: { type: "string", enum: ["INCOME", "EXPENSE"], description: "Tipo: entrata o spesa" },
          date: { type: "string", description: "Data ISO (opzionale, default oggi)" },
        },
        required: ["accountId", "amount", "description", "type"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_account",
      description: "Crea un nuovo conto bancario/contante",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Nome del conto" },
          type: { type: "string", enum: ["CHECKING", "SAVINGS", "CASH", "CREDIT", "INVESTMENT"] },
          balance: { type: "number", description: "Saldo iniziale in euro" },
          color: { type: "string", description: "Colore hex (es. #F59E0B)" },
        },
        required: ["name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_category",
      description: "Crea una nuova categoria di transazioni",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Nome della categoria" },
          type: { type: "string", enum: ["INCOME", "EXPENSE"] },
          color: { type: "string", description: "Colore hex" },
          icon: { type: "string", description: "Nome icona Lucide" },
        },
        required: ["name", "type"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_budget",
      description: "Imposta un budget mensile per una categoria",
      parameters: {
        type: "object",
        properties: {
          categoryId: { type: "string", description: "ID della categoria" },
          amount: { type: "number", description: "Budget in euro" },
          month: { type: "number", description: "Mese (1-12)" },
          year: { type: "number", description: "Anno" },
        },
        required: ["categoryId", "amount", "month", "year"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_goal",
      description: "Crea un obiettivo finanziario a medio/lungo termine",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Nome dell'obiettivo" },
          description: { type: "string", description: "Descrizione" },
          targetAmount: { type: "number", description: "Importo target in euro" },
          currentAmount: { type: "number", description: "Importo attuale" },
          deadline: { type: "string", description: "Data scadenza ISO" },
          color: { type: "string", description: "Colore hex" },
        },
        required: ["name", "targetAmount"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_goal",
      description: "Aggiorna un obiettivo esistente (es. aggiunge fondi)",
      parameters: {
        type: "object",
        properties: {
          goalId: { type: "string", description: "ID dell'obiettivo" },
          currentAmount: { type: "number", description: "Nuovo importo accumulato" },
          status: { type: "string", enum: ["ACTIVE", "COMPLETED", "PAUSED"] },
        },
        required: ["goalId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_asset",
      description: "Aggiunge un asset al patrimonio (ETF, azione, crypto, liquidità)",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Nome dell'asset" },
          symbol: { type: "string", description: "Simbolo ticker (es. VWCE.DE per ETF, BTC per crypto)" },
          type: { type: "string", enum: ["ETF", "STOCK", "CRYPTO", "CASH", "BOND", "OTHER"] },
          quantity: { type: "number", description: "Quantità posseduta" },
          buyPrice: { type: "number", description: "Prezzo di acquisto per unità (opzionale)" },
        },
        required: ["name", "symbol", "type", "quantity"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_financial_summary",
      description: "Ottieni un riepilogo delle finanze dell'utente (conti, spese, patrimonio)",
      parameters: {
        type: "object",
        properties: {
          period: { type: "string", enum: ["today", "month", "year", "all"], description: "Periodo di analisi" },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_data",
      description: "Lista conti, categorie, obiettivi o asset disponibili",
      parameters: {
        type: "object",
        properties: {
          dataType: {
            type: "string",
            enum: ["accounts", "categories", "goals", "assets", "budgets"],
          },
        },
        required: ["dataType"],
      },
    },
  },
];

async function executeFunction(name: string, args: Record<string, unknown>, userId: string) {
  switch (name) {
    case "create_transaction": {
      const { accountId, categoryId, amount, description, type, date } = args as {
        accountId: string; categoryId?: string; amount: number;
        description: string; type: "INCOME" | "EXPENSE"; date?: string;
      };
      const balanceChange = type === "INCOME" ? (amount as number) : -(amount as number);
      await prisma.account.updateMany({
        where: { id: accountId, userId },
        data: { balance: { increment: balanceChange } },
      });
      const tx = await prisma.transaction.create({
        data: {
          userId, accountId, categoryId: categoryId ?? null,
          amount: amount as number, description, type,
          date: date ? new Date(date) : new Date(),
        },
        include: {
          account: { select: { name: true } },
          category: { select: { name: true } },
        },
      });
      return { success: true, transaction: tx };
    }

    case "create_account": {
      const { name, type, balance, color } = args as {
        name: string; type?: string; balance?: number; color?: string;
      };
      const account = await prisma.account.create({
        data: {
          userId, name,
          type: (type as "CHECKING" | "SAVINGS" | "CASH" | "CREDIT" | "INVESTMENT") ?? "CHECKING",
          balance: balance ?? 0,
          color: color ?? "#F59E0B",
        },
      });
      return { success: true, account };
    }

    case "create_category": {
      const { name, type, color, icon } = args as {
        name: string; type: "INCOME" | "EXPENSE"; color?: string; icon?: string;
      };
      const category = await prisma.category.create({
        data: { userId, name, type, color: color ?? "#F59E0B", icon: icon ?? "tag" },
      });
      return { success: true, category };
    }

    case "create_budget": {
      const { categoryId, amount, month, year } = args as {
        categoryId: string; amount: number; month: number; year: number;
      };
      const budget = await prisma.budget.upsert({
        where: { userId_categoryId_month_year: { userId, categoryId, month, year } },
        update: { amount },
        create: { userId, categoryId, amount, month, year },
        include: { category: { select: { name: true } } },
      });
      return { success: true, budget };
    }

    case "create_goal": {
      const { name, description, targetAmount, currentAmount, deadline, color } = args as {
        name: string; description?: string; targetAmount: number;
        currentAmount?: number; deadline?: string; color?: string;
      };
      const goal = await prisma.goal.create({
        data: {
          userId, name, description: description ?? null,
          targetAmount, currentAmount: currentAmount ?? 0,
          deadline: deadline ? new Date(deadline) : null,
          color: color ?? "#F59E0B",
        },
      });
      return { success: true, goal };
    }

    case "update_goal": {
      const { goalId, currentAmount, status } = args as {
        goalId: string; currentAmount?: number; status?: string;
      };
      const data: Record<string, unknown> = {};
      if (currentAmount !== undefined) data.currentAmount = currentAmount;
      if (status) data.status = status;
      const goal = await prisma.goal.updateMany({ where: { id: goalId, userId }, data });
      return { success: true, updated: goal.count > 0 };
    }

    case "create_asset": {
      const { name, symbol, type, quantity, buyPrice } = args as {
        name: string; symbol: string; type: string; quantity: number; buyPrice?: number;
      };
      const asset = await prisma.asset.create({
        data: {
          userId, name, symbol: symbol.toUpperCase(),
          type: type as "ETF" | "STOCK" | "CRYPTO" | "CASH" | "BOND" | "OTHER",
          quantity, buyPrice: buyPrice ?? null,
        },
      });
      return { success: true, asset };
    }

    case "get_financial_summary": {
      const { period = "month" } = args as { period?: string };
      const now = new Date();
      let dateFilter: { gte: Date; lte: Date } | undefined;

      if (period === "today") {
        dateFilter = {
          gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
          lte: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59),
        };
      } else if (period === "month") {
        dateFilter = {
          gte: new Date(now.getFullYear(), now.getMonth(), 1),
          lte: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59),
        };
      } else if (period === "year") {
        dateFilter = {
          gte: new Date(now.getFullYear(), 0, 1),
          lte: new Date(now.getFullYear(), 11, 31, 23, 59, 59),
        };
      }

      const [accounts, incomeAgg, expenseAgg, topCategories, goals, assets] = await Promise.all([
        prisma.account.findMany({ where: { userId } }),
        prisma.transaction.aggregate({
          where: { userId, type: "INCOME", ...(dateFilter ? { date: dateFilter } : {}) },
          _sum: { amount: true },
        }),
        prisma.transaction.aggregate({
          where: { userId, type: "EXPENSE", ...(dateFilter ? { date: dateFilter } : {}) },
          _sum: { amount: true },
        }),
        prisma.transaction.groupBy({
          by: ["categoryId"],
          where: { userId, type: "EXPENSE", ...(dateFilter ? { date: dateFilter } : {}) },
          _sum: { amount: true },
          orderBy: { _sum: { amount: "desc" } },
          take: 5,
        }),
        prisma.goal.findMany({ where: { userId, status: "ACTIVE" } }),
        prisma.asset.findMany({ where: { userId } }),
      ]);

      return {
        totalBalance: accounts.reduce((sum, a) => sum + a.balance, 0),
        accounts: accounts.map((a) => ({ name: a.name, balance: a.balance, type: a.type })),
        income: incomeAgg._sum.amount ?? 0,
        expenses: expenseAgg._sum.amount ?? 0,
        savings: (incomeAgg._sum.amount ?? 0) - (expenseAgg._sum.amount ?? 0),
        topCategories,
        goals: goals.map((g) => ({
          name: g.name, target: g.targetAmount,
          current: g.currentAmount, percent: (g.currentAmount / g.targetAmount) * 100,
        })),
        assetsCount: assets.length,
      };
    }

    case "list_data": {
      const { dataType } = args as { dataType: string };
      switch (dataType) {
        case "accounts":
          return prisma.account.findMany({ where: { userId }, select: { id: true, name: true, type: true, balance: true } });
        case "categories":
          return prisma.category.findMany({ where: { userId }, select: { id: true, name: true, type: true } });
        case "goals":
          return prisma.goal.findMany({ where: { userId }, select: { id: true, name: true, targetAmount: true, currentAmount: true, status: true } });
        case "assets":
          return prisma.asset.findMany({ where: { userId }, select: { id: true, name: true, symbol: true, type: true, quantity: true } });
        case "budgets": {
          const m = new Date().getMonth() + 1;
          const y = new Date().getFullYear();
          return prisma.budget.findMany({
            where: { userId, month: m, year: y },
            include: { category: { select: { name: true } } },
          });
        }
        default:
          return [];
      }
    }

    default:
      return { error: "Funzione non trovata" };
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

  const userId = session.user.id;
  const { message } = await req.json();

  if (!message?.trim()) return NextResponse.json({ error: "Messaggio vuoto" }, { status: 400 });

  try {
    // Salva messaggio utente
    await prisma.chatMessage.create({ data: { userId, role: "USER", content: message } });

    // Recupera storico (ultimi 20 messaggi)
    const history = await prisma.chatMessage.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
      take: 20,
    });

    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: "system", content: AI_SYSTEM_PROMPT },
      ...history.slice(0, -1).map((m) => ({
        role: m.role.toLowerCase() as "user" | "assistant",
        content: m.content,
      })),
      { role: "user", content: message },
    ];

    // Esegui il loop di function calling
    let finalResponse = "";
    let currentMessages = [...messages];

    for (let i = 0; i < 5; i++) {
      const completion = await getOpenAI().chat.completions.create({
        model: "gpt-4o",
        messages: currentMessages,
        tools,
        tool_choice: "auto",
      });

      const choice = completion.choices[0];

      if (choice.finish_reason === "stop" || !choice.message.tool_calls) {
        finalResponse = choice.message.content ?? "";
        break;
      }

      currentMessages.push(choice.message);

      for (const toolCall of choice.message.tool_calls) {
        if (toolCall.type !== "function") continue;
        const fn = (toolCall as { type: "function"; function: { name: string; arguments: string }; id: string }).function;
        const args = JSON.parse(fn.arguments);
        const result = await executeFunction(fn.name, args, userId);
        currentMessages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: JSON.stringify(result),
        });
      }
    }

    // Salva risposta AI
    await prisma.chatMessage.create({ data: { userId, role: "ASSISTANT", content: finalResponse } });

    return NextResponse.json({ response: finalResponse });
  } catch (error) {
    console.error("[Chat API Error]", error);
    const msg = error instanceof Error ? error.message : "Errore sconosciuto";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

  const messages = await prisma.chatMessage.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "asc" },
    take: 50,
  });

  return NextResponse.json(messages);
}
