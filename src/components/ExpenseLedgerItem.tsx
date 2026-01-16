import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import {
  Home,
  Zap,
  ShoppingCart,
  Package,
  UtensilsCrossed,
  ShoppingBag,
  MoreHorizontal,
  ArrowRight,
  Edit2,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Expense } from "@/hooks/useExpenses";
import { Profile } from "@/hooks/useProfiles";

interface ExpenseLedgerItemProps {
  expense: Expense;
  currentProfile: Profile | null;
  roommate: Profile | null;
  runningBalance: number;
  formatAmount: (num: number) => string;
  onEdit: (expense: Expense) => void;
  onDelete: (expense: Expense) => void;
}

const categoryIcons: Record<string, React.ElementType> = {
  rent: Home,
  utilities: Zap,
  groceries: ShoppingCart,
  household_supplies: Package,
  shared_meals: UtensilsCrossed,
  purchases: ShoppingBag,
  other: MoreHorizontal,
};

const categoryLabels: Record<string, string> = {
  rent: "Rent",
  utilities: "Utilities",
  groceries: "Groceries",
  household_supplies: "Household",
  shared_meals: "Meals",
  purchases: "Purchases",
  other: "Other",
};

const ExpenseLedgerItem = ({
  expense,
  currentProfile,
  roommate,
  runningBalance,
  formatAmount,
  onEdit,
  onDelete,
}: ExpenseLedgerItemProps) => {
  const Icon = categoryIcons[expense.category] || MoreHorizontal;
  const isPaidByMe = expense.paid_by === currentProfile?.id;
  const payerName = isPaidByMe ? "You" : expense.payer?.display_name || "Unknown";
  const owesName = isPaidByMe
    ? roommate?.display_name || "Roommate"
    : "You";

  let splitLabel = "";
  switch (expense.split_type) {
    case "fifty_fifty":
      splitLabel = "50/50";
      break;
    case "one_owes_all":
      splitLabel = "100%";
      break;
    case "custom":
      splitLabel = `₹${expense.custom_split_amount} owed`;
      break;
  }

  const balanceColor =
    runningBalance > 0
      ? "text-positive"
      : runningBalance < 0
      ? "text-destructive"
      : "text-muted-foreground";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border/50 rounded-lg p-4"
    >
      <div className="flex items-start gap-3">
        {/* Category Icon */}
        <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
          {expense.is_payment ? (
            <span className="text-lg">💸</span>
          ) : (
            <Icon className="h-5 w-5 text-muted-foreground" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header row */}
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-medium text-foreground">
                {expense.is_payment ? "Payment" : expense.description}
              </p>
              <p className="text-xs text-muted-foreground">
                {format(new Date(expense.expense_date), "MMM d, yyyy 'at' h:mm a")}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p
                className={`font-semibold tabular-nums ${
                  expense.is_payment
                    ? "text-positive"
                    : isPaidByMe
                    ? "text-positive"
                    : "text-destructive"
                }`}
              >
                {formatAmount(Number(expense.amount))}
              </p>
              {!expense.is_payment && (
                <Badge variant="outline" className="text-xs mt-1">
                  {categoryLabels[expense.category]}
                </Badge>
              )}
            </div>
          </div>

          {/* Flow: Who paid → Who owes → Split */}
          <div className="flex items-center gap-2 mt-3 text-sm">
            <span className={isPaidByMe ? "text-positive font-medium" : "text-foreground"}>
              {payerName} paid
            </span>
            <ArrowRight className="h-3 w-3 text-muted-foreground" />
            <span className={!isPaidByMe ? "text-destructive font-medium" : "text-foreground"}>
              {owesName} owes
            </span>
            <span className="text-muted-foreground">• {splitLabel}</span>
          </div>

          {/* Notes */}
          {expense.notes && (
            <p className="text-sm text-muted-foreground mt-2 italic">
              "{expense.notes}"
            </p>
          )}

          {/* Running Balance & Actions */}
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
            <div className="text-xs">
              <span className="text-muted-foreground">Balance: </span>
              <span className={`font-semibold ${balanceColor}`}>
                {runningBalance >= 0
                  ? `+${formatAmount(runningBalance)}`
                  : formatAmount(runningBalance)}
              </span>
            </div>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => onEdit(expense)}
              >
                <Edit2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive"
                onClick={() => onDelete(expense)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default ExpenseLedgerItem;
