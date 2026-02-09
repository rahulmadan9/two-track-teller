import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useProfiles } from "@/hooks/useProfiles";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import BottomNav from "@/components/BottomNav";
import BalanceView from "@/components/BalanceView";
import ExpensesView from "@/components/ExpensesView";
import AddExpenseForm from "@/components/AddExpenseForm";
import RecurringView from "@/components/RecurringView";

type TabType = "balance" | "recurring" | "expenses" | "add";

const Dashboard = () => {
  const { signOut } = useAuth();
  const { currentProfile, roommate, loading } = useProfiles();
  const [activeTab, setActiveTab] = useState<TabType>("balance");

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <motion.p
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="text-muted-foreground"
        >
          Loading...
        </motion.p>
      </div>
    );
  }

  const getTitle = () => {
    switch (activeTab) {
      case "balance":
        return "Balance";
      case "recurring":
        return "Recurring";
      case "expenses":
        return "Expenses";
      case "add":
        return "Add Expense";
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="border-b border-border/30 bg-background/80 backdrop-blur-sm sticky top-0 z-20"
      >
        <div className="container max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-foreground">
              {getTitle()}
            </h1>
            <p className="text-xs text-muted-foreground">
              {currentProfile?.display_name}
              {roommate && ` & ${roommate.display_name}`}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={signOut}
            title="Sign out"
            className="h-10 w-10"
          >
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </motion.header>

      {/* Main content */}
      <main className="container max-w-lg mx-auto">
        <AnimatePresence mode="wait">
          {activeTab === "balance" && (
            <motion.div
              key="balance"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
            >
              <BalanceView />
            </motion.div>
          )}

          {activeTab === "recurring" && (
            <motion.div
              key="recurring"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
            >
              <RecurringView />
            </motion.div>
          )}

          {activeTab === "expenses" && (
            <motion.div
              key="expenses"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
            >
              <ExpensesView />
            </motion.div>
          )}

          {activeTab === "add" && (
            <motion.div
              key="add"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
              className="px-4 py-6"
            >
              <AddExpenseForm onSuccess={() => setActiveTab("balance")} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Bottom Navigation */}
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
};

export default Dashboard;
