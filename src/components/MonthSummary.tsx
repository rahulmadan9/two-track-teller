import { Expense } from "@/hooks/useExpenses";
import { Profile } from "@/hooks/useProfiles";

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

  // Calculate net balance for this month
  let youOwe = 0;
  let theyOwe = 0;

  expenses.forEach((expense) => {
    const amount = Number(expense.amount);
    const paidByMe = expense.paid_by === currentProfile?.id;

    if (expense.is_payment) {
      if (paidByMe) {
        youOwe -= amount;
      } else {
        theyOwe -= amount;
      }
    } else {
      let splitAmount = 0;
      switch (expense.split_type) {
        case "fifty_fifty":
          splitAmount = amount / 2;
          break;
        case "custom":
          splitAmount = Number(expense.custom_split_amount) || 0;
          break;
        case "one_owes_all":
          splitAmount = amount;
          break;
      }

      if (paidByMe) {
        theyOwe += splitAmount;
      } else {
        youOwe += splitAmount;
      }
    }
  });

  const netBalance = theyOwe - youOwe;

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
