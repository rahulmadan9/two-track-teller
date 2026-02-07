import { Expense } from "@/hooks/useExpenses";
import { Profile } from "@/hooks/useProfiles";
import { calculateNetBalance } from "@/lib/balanceCalculation";

interface MonthSummaryProps {
  expenses: Expense[];
  currentProfile: Profile | null;
  roommate: Profile | null;
  formatAmount: (num: number) => string;
}

const MonthSummary = ({
  expenses,
  currentProfile,
  roommate,
  formatAmount,
}: MonthSummaryProps) => {
  // Calculate totals
  const expensesOnly = expenses.filter((e) => !e.is_payment);
  const paymentsOnly = expenses.filter((e) => e.is_payment);

  const totalSpent = expensesOnly.reduce((sum, e) => sum + Number(e.amount), 0);
  const totalPayments = paymentsOnly.reduce((sum, e) => sum + Number(e.amount), 0);

  const mySpending = expensesOnly
    .filter((e) => e.paid_by === currentProfile?.id)
    .reduce((sum, e) => sum + Number(e.amount), 0);

  const roommateSpending = expensesOnly
    .filter((e) => e.paid_by === roommate?.id)
    .reduce((sum, e) => sum + Number(e.amount), 0);

  // Calculate net balance for this month using shared utility
  const balanceResult = currentProfile && roommate
    ? calculateNetBalance(expenses, currentProfile.id, roommate.id)
    : { amount: 0, oweDirection: "settled" as const };

  const netBalance = balanceResult.oweDirection === "they_owe"
    ? balanceResult.amount
    : balanceResult.oweDirection === "you_owe"
    ? -balanceResult.amount
    : 0;

  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="bg-card border border-border/50 rounded-lg p-4">
        <p className="text-xs text-muted-foreground mb-1">Total Spent</p>
        <p className="text-xl font-bold tabular-nums">{formatAmount(totalSpent)}</p>
      </div>
      <div className="bg-card border border-border/50 rounded-lg p-4">
        <p className="text-xs text-muted-foreground mb-1">Month Balance</p>
        <p
          className={`text-xl font-bold tabular-nums ${
            netBalance > 0
              ? "text-positive"
              : netBalance < 0
              ? "text-destructive"
              : "text-muted-foreground"
          }`}
        >
          {netBalance >= 0
            ? `+${formatAmount(netBalance)}`
            : formatAmount(netBalance)}
        </p>
      </div>
      <div className="bg-card border border-border/50 rounded-lg p-4">
        <p className="text-xs text-muted-foreground mb-1">You Paid</p>
        <p className="text-lg font-semibold tabular-nums">{formatAmount(mySpending)}</p>
      </div>
      <div className="bg-card border border-border/50 rounded-lg p-4">
        <p className="text-xs text-muted-foreground mb-1">{roommate?.display_name || "Roommate"} Paid</p>
        <p className="text-lg font-semibold tabular-nums">{formatAmount(roommateSpending)}</p>
      </div>
    </div>
  );
};

export default MonthSummary;
