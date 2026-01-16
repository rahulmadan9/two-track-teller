import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { useExpenses } from "@/hooks/useExpenses";
import { useProfiles } from "@/hooks/useProfiles";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MonthSelector from "./MonthSelector";
import MonthSummary from "./MonthSummary";
import CategoryBreakdown from "./CategoryBreakdown";
import ExpenseFilters, { FilterState } from "./ExpenseFilters";
import ExpenseLedgerItem from "./ExpenseLedgerItem";
import EditExpenseDialog from "./EditExpenseDialog";
import DeleteConfirmDialog from "./DeleteConfirmDialog";
import ExportButton from "./ExportButton";
import SwipeableExpenseItem from "./SwipeableExpenseItem";
import { Expense } from "@/hooks/useExpenses";

const ExpensesView = () => {
  const { expenses, loading, refetch } = useExpenses();
  const { currentProfile, roommate } = useProfiles();

  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [activeTab, setActiveTab] = useState("list");
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    category: "all",
    paidBy: "all",
    type: "all",
  });

  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deletingExpense, setDeletingExpense] = useState<Expense | null>(null);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

  const formatAmount = (num: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(num);
  };

  // Filter expenses by selected month
  const monthExpenses = useMemo(() => {
    return expenses.filter((expense) => {
      const expenseDate = new Date(expense.expense_date);
      return (
        expenseDate.getMonth() === selectedMonth.getMonth() &&
        expenseDate.getFullYear() === selectedMonth.getFullYear()
      );
    });
  }, [expenses, selectedMonth]);

  // Apply search/filters
  const filteredExpenses = useMemo(() => {
    return monthExpenses.filter((expense) => {
      // Search
      if (
        filters.search &&
        !expense.description.toLowerCase().includes(filters.search.toLowerCase())
      ) {
        return false;
      }

      // Category
      if (filters.category !== "all" && expense.category !== filters.category) {
        return false;
      }

      // Paid by
      if (filters.paidBy === "me" && expense.paid_by !== currentProfile?.id) {
        return false;
      }
      if (filters.paidBy === "roommate" && expense.paid_by !== roommate?.id) {
        return false;
      }

      // Type
      if (filters.type === "expense" && expense.is_payment) {
        return false;
      }
      if (filters.type === "payment" && !expense.is_payment) {
        return false;
      }

      return true;
    });
  }, [monthExpenses, filters, currentProfile?.id, roommate?.id]);

  // Calculate running balance for ledger view (reverse chronological becomes chronological for balance calc)
  const expensesWithRunningBalance = useMemo(() => {
    const sorted = [...filteredExpenses].sort(
      (a, b) =>
        new Date(a.expense_date).getTime() - new Date(b.expense_date).getTime()
    );

    let runningBalance = 0;
    return sorted.map((expense) => {
      const amount = Number(expense.amount);
      const paidByMe = expense.paid_by === currentProfile?.id;

      if (expense.is_payment) {
        if (paidByMe) {
          runningBalance -= amount;
        } else {
          runningBalance += amount;
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
          runningBalance += splitAmount;
        } else {
          runningBalance -= splitAmount;
        }
      }

      return { ...expense, runningBalance };
    });
  }, [filteredExpenses, currentProfile?.id]);

  // Reverse for display (newest first)
  const displayExpenses = [...expensesWithRunningBalance].reverse();

  const handleDelete = async (expense: Expense) => {
    setDeletingExpense(expense);
  };

  const confirmDelete = async () => {
    if (!deletingExpense) return;

    setDeletingIds((prev) => new Set(prev).add(deletingExpense.id));
    setDeletingExpense(null);

    try {
      const { error } = await supabase
        .from("expenses")
        .delete()
        .eq("id", deletingExpense.id);
      if (error) throw error;
      toast.success("Expense deleted");
      refetch();
    } catch (error: any) {
      toast.error("Failed to delete expense");
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(deletingExpense.id);
        return next;
      });
    }
  };

  const handleSwipeDelete = async (id: string) => {
    // Find the expense to show confirmation
    const expense = expenses.find((e) => e.id === id);
    if (expense) {
      setDeletingExpense(expense);
    }
  };

  const monthLabel = format(selectedMonth, "MMMM yyyy");

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

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="pb-4"
    >
      {/* Header with Month Selector */}
      <div className="px-4 py-4 border-b border-border/50 sticky top-0 bg-background/95 backdrop-blur-sm z-10 space-y-4">
        <div className="flex items-center justify-between">
          <MonthSelector
            selectedMonth={selectedMonth}
            onMonthChange={setSelectedMonth}
          />
          <ExportButton expenses={monthExpenses} monthLabel={monthLabel} />
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="px-4 pt-4">
        <TabsList className="grid w-full grid-cols-3 mb-4">
          <TabsTrigger value="list">List</TabsTrigger>
          <TabsTrigger value="ledger">Ledger</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Simple List View */}
        <TabsContent value="list" className="mt-0 -mx-4">
          {monthExpenses.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-16 px-6 text-center"
            >
              <div className="text-6xl mb-4">📝</div>
              <p className="text-lg font-medium text-foreground mb-2">
                No expenses in {monthLabel}
              </p>
              <p className="text-sm text-muted-foreground">
                Tap the + button to add an expense
              </p>
            </motion.div>
          ) : (
            <>
              <div className="px-4 py-2 text-xs text-muted-foreground">
                Swipe left to delete • {monthExpenses.length} items
              </div>
              <div className="divide-y divide-border/50">
                <AnimatePresence mode="popLayout">
                  {monthExpenses.map((expense, index) => {
                    const isPaidByMe = expense.paid_by === currentProfile?.id;
                    if (deletingIds.has(expense.id)) return null;

                    return (
                      <motion.div
                        key={expense.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -100, height: 0 }}
                        transition={{ delay: index * 0.02 }}
                        layout
                      >
                        <SwipeableExpenseItem
                          expense={expense}
                          isPaidByMe={isPaidByMe}
                          onDelete={handleSwipeDelete}
                          formatAmount={formatAmount}
                        />
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </>
          )}
        </TabsContent>

        {/* Detailed Ledger View */}
        <TabsContent value="ledger" className="mt-0 space-y-4">
          <ExpenseFilters filters={filters} onFiltersChange={setFilters} />

          {filteredExpenses.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12 text-muted-foreground"
            >
              {monthExpenses.length === 0
                ? `No expenses in ${monthLabel}`
                : "No expenses match your filters"}
            </motion.div>
          ) : (
            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {displayExpenses.map((expense) => (
                  <ExpenseLedgerItem
                    key={expense.id}
                    expense={expense}
                    currentProfile={currentProfile}
                    roommate={roommate}
                    runningBalance={expense.runningBalance}
                    formatAmount={formatAmount}
                    onEdit={setEditingExpense}
                    onDelete={handleDelete}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </TabsContent>

        {/* Analytics View */}
        <TabsContent value="analytics" className="mt-0 space-y-6">
          <MonthSummary
            expenses={monthExpenses}
            currentProfile={currentProfile}
            roommate={roommate}
            formatAmount={formatAmount}
          />

          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">
              Spending by Category
            </h3>
            <CategoryBreakdown
              expenses={monthExpenses}
              formatAmount={formatAmount}
            />
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <EditExpenseDialog
        expense={editingExpense}
        open={!!editingExpense}
        onOpenChange={(open) => !open && setEditingExpense(null)}
        onSuccess={refetch}
      />

      {/* Delete Confirmation */}
      <DeleteConfirmDialog
        open={!!deletingExpense}
        onOpenChange={(open) => !open && setDeletingExpense(null)}
        onConfirm={confirmDelete}
      />
    </motion.div>
  );
};

export default ExpensesView;
