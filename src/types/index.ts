export type AccountType = "CHECKING" | "SAVINGS" | "CASH" | "CREDIT" | "INVESTMENT";
export type TransactionType = "INCOME" | "EXPENSE";
export type GoalStatus = "ACTIVE" | "COMPLETED" | "PAUSED";
export type AssetType = "ETF" | "STOCK" | "CRYPTO" | "CASH" | "BOND" | "OTHER";

export interface AccountWithBalance {
  id: string;
  name: string;
  type: AccountType;
  balance: number;
  color: string;
  icon: string;
}

export interface TransactionWithRelations {
  id: string;
  amount: number;
  description: string;
  date: string;
  type: TransactionType;
  account: { id: string; name: string; color: string };
  category: { id: string; name: string; color: string; icon: string } | null;
}

export interface BudgetWithSpent {
  id: string;
  amount: number;
  month: number;
  year: number;
  spent: number;
  category: { id: string; name: string; color: string; icon: string };
}

export interface AssetWithValue {
  id: string;
  name: string;
  symbol: string;
  type: AssetType;
  quantity: number;
  buyPrice: number | null;
  currentPrice: number | null;
  currentValue: number | null;
  gainLoss: number | null;
  gainLossPercent: number | null;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}
