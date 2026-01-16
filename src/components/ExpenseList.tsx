import { useExpenses } from "@/hooks/useExpenses";
import { useProfiles } from "@/hooks/useProfiles";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

const categoryLabels: Record<string, string> = {
  rent: "Rent",
  utilities: "Utilities",
  groceries: "Groceries",
  household_supplies: "Household",
  shared_meals: "Meals",
  purchases: "Purchases",
  other: "Other",
};

const ExpenseList = () => {
  const { expenses, loading } = useExpenses();
  const { currentProfile } = useProfiles();

  const formatAmount = (num: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(num);
  };

  // Filter to current month by default
  const currentMonthExpenses = expenses.filter((expense) => {
    const expenseDate = new Date(expense.expense_date);
    const now = new Date();
    return (
      expenseDate.getMonth() === now.getMonth() &&
      expenseDate.getFullYear() === now.getFullYear()
    );
  });

  if (loading) {
    return (
      <div className="rounded-xl bg-card border border-border/50 p-6 shadow-sm">
        <p className="text-muted-foreground text-center py-8">Loading expenses...</p>
      </div>
    );
  }

  if (currentMonthExpenses.length === 0) {
    return (
      <div className="rounded-xl bg-card border border-border/50 p-6 shadow-sm">
        <p className="text-sm font-medium text-muted-foreground mb-4">This Month</p>
        <p className="text-muted-foreground text-center py-8">No expenses this month yet.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-card border border-border/50 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-border/50">
        <p className="text-sm font-medium text-muted-foreground">This Month</p>
      </div>
      <div className="divide-y divide-border/50">
        {currentMonthExpenses.map((expense) => {
          const isPaidByMe = expense.paid_by === currentProfile?.id;
          const payerName = expense.payer?.display_name || "Unknown";

          return (
            <div
              key={expense.id}
              className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors animate-fade-in"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-foreground truncate">
                    {expense.is_payment ? "💸 Payment" : expense.description}
                  </p>
                  {!expense.is_payment && (
                    <Badge variant="secondary" className="text-xs shrink-0">
                      {categoryLabels[expense.category] || expense.category}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {format(new Date(expense.expense_date), "MMM d")} •{" "}
                  {isPaidByMe ? "You paid" : `${payerName} paid`}
                  {expense.split_type === "fifty_fifty" && " • 50/50"}
                  {expense.split_type === "one_owes_all" && " • Full"}
                </p>
              </div>
              <p className={`font-semibold tabular-nums ${expense.is_payment ? "text-positive" : "text-foreground"}`}>
                {formatAmount(Number(expense.amount))}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ExpenseList;
