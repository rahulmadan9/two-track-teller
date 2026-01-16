import { motion, AnimatePresence } from "framer-motion";
import { useExpenses } from "@/hooks/useExpenses";
import { useGroupMembers } from "@/hooks/useGroupMembers";
import { supabase } from "@/integrations/supabase/client";
import SwipeableExpenseItem from "./SwipeableExpenseItem";
import { toast } from "sonner";

interface ExpenseListProps {
  showAll?: boolean;
}

const ExpenseList = ({ showAll = false }: ExpenseListProps) => {
  const { expenses, loading, refetch } = useExpenses();
  const { currentMember } = useGroupMembers();
  const currentProfile = currentMember?.profile;

  const formatAmount = (num: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  };

  // Filter to current month or show all
  const displayedExpenses = showAll
    ? expenses
    : expenses.filter((expense) => {
        const expenseDate = new Date(expense.expense_date);
        const now = new Date();
        return (
          expenseDate.getMonth() === now.getMonth() &&
          expenseDate.getFullYear() === now.getFullYear()
        );
      });

  const handleDelete = async (expenseId: string) => {
    try {
      const { error } = await supabase
        .from("expenses")
        .delete()
        .eq("id", expenseId);

      if (error) throw error;
      
      toast.success("Expense deleted");
      refetch();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete expense");
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl bg-card border border-border/50 p-8">
        <div className="flex items-center justify-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full"
          />
        </div>
      </div>
    );
  }

  if (displayedExpenses.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl bg-card border border-border/50 p-8 text-center"
      >
        <p className="text-muted-foreground">
          {showAll ? "No expenses yet." : "No expenses this month yet."}
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          Tap the + button to add one!
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="rounded-2xl bg-card border border-border/50 overflow-hidden"
    >
      <div className="p-4 border-b border-border/50">
        <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          {showAll ? "All Expenses" : "This Month"}
        </p>
      </div>
      <div className="divide-y divide-border/50">
        <AnimatePresence mode="popLayout">
          {displayedExpenses.map((expense, index) => (
            <motion.div
              key={expense.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 100, height: 0 }}
              transition={{ delay: index * 0.03, duration: 0.2 }}
            >
              <SwipeableExpenseItem
                expense={expense}
                currentProfileId={currentProfile?.id}
                onDelete={handleDelete}
                formatAmount={formatAmount}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default ExpenseList;
