import { useState, useRef } from "react";
import { motion, PanInfo, useAnimation } from "framer-motion";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Trash2, Edit2 } from "lucide-react";
import { Expense } from "@/hooks/useExpenses";

interface SwipeableExpenseItemProps {
  expense: Expense;
  currentProfileId: string | undefined;
  onDelete?: (id: string) => void;
  onEdit?: (expense: Expense) => void;
  formatAmount: (num: number) => string;
}

const categoryLabels: Record<string, string> = {
  rent: "Rent",
  utilities: "Utilities",
  groceries: "Groceries",
  household_supplies: "Household",
  shared_meals: "Meals",
  purchases: "Purchases",
  other: "Other",
};

const SwipeableExpenseItem = ({
  expense,
  currentProfileId,
  onDelete,
  onEdit,
  formatAmount,
}: SwipeableExpenseItemProps) => {
  const [isSwipedLeft, setIsSwipedLeft] = useState(false);
  const controls = useAnimation();
  const constraintsRef = useRef(null);

  const isPaidByMe = expense.paid_by === currentProfileId;
  const payerName = expense.payer?.display_name || "Unknown";
  const canDelete = expense.paid_by === currentProfileId;

  const handleDragEnd = (_: any, info: PanInfo) => {
    const threshold = -80;
    if (info.offset.x < threshold && canDelete) {
      controls.start({ x: -100 });
      setIsSwipedLeft(true);
    } else {
      controls.start({ x: 0 });
      setIsSwipedLeft(false);
    }
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete(expense.id);
    }
  };

  const resetSwipe = () => {
    controls.start({ x: 0 });
    setIsSwipedLeft(false);
  };

  return (
    <div className="relative overflow-hidden" ref={constraintsRef}>
      {/* Background actions */}
      <div className="absolute inset-y-0 right-0 flex items-center">
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: isSwipedLeft ? 1 : 0, scale: isSwipedLeft ? 1 : 0.8 }}
          transition={{ duration: 0.2 }}
          onClick={handleDelete}
          className="h-full w-20 bg-destructive flex items-center justify-center touch-manipulation"
        >
          <Trash2 className="h-5 w-5 text-destructive-foreground" />
        </motion.button>
      </div>

      {/* Swipeable content */}
      <motion.div
        drag={canDelete ? "x" : false}
        dragConstraints={{ left: -100, right: 0 }}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
        animate={controls}
        onClick={isSwipedLeft ? resetSwipe : undefined}
        className="relative bg-card p-4 flex items-center justify-between touch-manipulation"
      >
        <div className="flex-1 min-w-0 pr-4">
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
        <p
          className={`font-semibold tabular-nums text-lg ${
            expense.is_payment ? "text-positive" : "text-foreground"
          }`}
        >
          {formatAmount(Number(expense.amount))}
        </p>
      </motion.div>
    </div>
  );
};

export default SwipeableExpenseItem;
