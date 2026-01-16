import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useExpenses } from "@/hooks/useExpenses";
import { useProfiles } from "@/hooks/useProfiles";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import SwipeableExpenseItem from "./SwipeableExpenseItem";

const ExpensesView = () => {
  const { expenses, loading, refetch } = useExpenses();
  const { currentProfile } = useProfiles();
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

  const formatAmount = (num: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(num);
  };

  const handleDelete = async (id: string) => {
    setDeletingIds((prev) => new Set(prev).add(id));

    try {
      const { error } = await supabase.from("expenses").delete().eq("id", id);
      if (error) throw error;
      toast.success("Expense deleted");
      refetch();
    } catch (error: any) {
      toast.error("Failed to delete expense");
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  // Filter to current month
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
      <div className="flex items-center justify-center py-20">
        <motion.div
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="text-muted-foreground"
        >
          Loading expenses...
        </motion.div>
      </div>
    );
  }

  if (currentMonthExpenses.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center py-20 px-6 text-center"
      >
        <div className="text-6xl mb-4">📝</div>
        <p className="text-lg font-medium text-foreground mb-2">
          No expenses this month
        </p>
        <p className="text-sm text-muted-foreground">
          Tap the + button to add your first expense
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="pb-4"
    >
      <div className="px-4 py-3 border-b border-border/50 sticky top-0 bg-background/80 backdrop-blur-sm z-10">
        <p className="text-sm font-medium text-muted-foreground">This Month</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Swipe left to delete
        </p>
      </div>

      <div className="divide-y divide-border/50">
        <AnimatePresence mode="popLayout">
          {currentMonthExpenses.map((expense, index) => {
            const isPaidByMe = expense.paid_by === currentProfile?.id;

            if (deletingIds.has(expense.id)) return null;

            return (
              <motion.div
                key={expense.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -100, height: 0 }}
                transition={{ delay: index * 0.03 }}
                layout
              >
                <SwipeableExpenseItem
                  expense={expense}
                  isPaidByMe={isPaidByMe}
                  onDelete={handleDelete}
                  formatAmount={formatAmount}
                />
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default ExpensesView;
