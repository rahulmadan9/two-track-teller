import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useGroups } from "@/hooks/useGroups";
import { useGroupMembers } from "@/hooks/useGroupMembers";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import BalanceSummary from "@/components/BalanceSummary";
import ExpenseList from "@/components/ExpenseList";
import AddExpenseForm from "@/components/AddExpenseForm";
import AddPaymentDialog from "@/components/AddPaymentDialog";
import GroupInfoDialog from "@/components/GroupInfoDialog";
import BottomNav from "@/components/BottomNav";
import { LogOut, ChevronDown, Settings, Banknote } from "lucide-react";

const Dashboard = () => {
  const { signOut } = useAuth();
  const { activeGroup, groups, setActiveGroup, loading: groupsLoading } = useGroups();
  const { currentMember, otherMembers, loading: membersLoading } = useGroupMembers();
  const [groupInfoOpen, setGroupInfoOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"balance" | "expenses" | "add">("balance");
  const [showAddForm, setShowAddForm] = useState(false);

  const loading = groupsLoading || membersLoading;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full"
        />
      </div>
    );
  }

  const currentProfile = currentMember?.profile;
  const roommate = otherMembers[0]?.profile;

  const handleTabChange = (tab: "balance" | "expenses" | "add") => {
    if (tab === "add") {
      setShowAddForm(true);
    } else {
      setActiveTab(tab);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border/30">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-auto p-0 hover:bg-transparent">
                <div className="flex items-center gap-1">
                  <h1 className="text-lg font-semibold text-foreground">
                    {activeGroup?.name || "SplitEasy"}
                  </h1>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuLabel>Switch Group</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {groups.map((group) => (
                <DropdownMenuItem
                  key={group.id}
                  onClick={() => setActiveGroup(group)}
                  className={`${activeGroup?.id === group.id ? "bg-accent" : ""}`}
                >
                  {group.name}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setGroupInfoOpen(true)}>
                <Settings className="h-4 w-4 mr-2" />
                Group Settings
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {currentProfile?.display_name}
            </span>
            <Button variant="ghost" size="icon" onClick={signOut} title="Sign out">
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-lg mx-auto px-4 py-6">
        <AnimatePresence mode="wait">
          {activeTab === "balance" && (
            <motion.div
              key="balance"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {/* Waiting for roommate banner */}
              {!roommate && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl bg-accent/50 border border-accent-foreground/10 p-4 text-center"
                >
                  <p className="text-sm text-accent-foreground">
                    👋 Waiting for your roommate to join
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Share code:{" "}
                    <span className="font-mono font-bold text-foreground">
                      {activeGroup?.invite_code}
                    </span>
                  </p>
                </motion.div>
              )}

              {/* Balance Summary - Prominent */}
              <BalanceSummary />

              {/* Quick Actions */}
              <div className="flex gap-3">
                <AddPaymentDialog />
              </div>

              {/* Recent Expenses Preview */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                    Recent
                  </h2>
                  <button
                    onClick={() => setActiveTab("expenses")}
                    className="text-sm text-primary font-medium"
                  >
                    See all
                  </button>
                </div>
                <ExpenseList />
              </div>
            </motion.div>
          )}

          {activeTab === "expenses" && (
            <motion.div
              key="expenses"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">All Expenses</h2>
              </div>
              <ExpenseList showAll />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Bottom Navigation */}
      <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />

      {/* Add Expense Full-screen Form */}
      <AnimatePresence>
        {showAddForm && (
          <AddExpenseForm isOpen={showAddForm} onClose={() => setShowAddForm(false)} />
        )}
      </AnimatePresence>

      {/* Group Info Dialog */}
      <GroupInfoDialog open={groupInfoOpen} onOpenChange={setGroupInfoOpen} />
    </div>
  );
};

export default Dashboard;
