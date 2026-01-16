import { useAuth } from "@/hooks/useAuth";
import { useProfiles } from "@/hooks/useProfiles";
import { Button } from "@/components/ui/button";
import BalanceSummary from "@/components/BalanceSummary";
import ExpenseList from "@/components/ExpenseList";
import AddExpenseDialog from "@/components/AddExpenseDialog";
import AddPaymentDialog from "@/components/AddPaymentDialog";
import { LogOut } from "lucide-react";

const Dashboard = () => {
  const { signOut } = useAuth();
  const { currentProfile, roommate, loading } = useProfiles();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-foreground">SplitEasy</h1>
            <p className="text-sm text-muted-foreground">
              {currentProfile?.display_name}
              {roommate && ` & ${roommate.display_name}`}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={signOut} title="Sign out">
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <main className="container max-w-2xl mx-auto px-4 py-6 space-y-6">
        {!roommate && (
          <div className="rounded-xl bg-accent/50 border border-accent-foreground/10 p-4 text-center">
            <p className="text-sm text-accent-foreground">
              👋 Waiting for your roommate to sign up. Share this app with them!
            </p>
          </div>
        )}

        <BalanceSummary />

        <div className="flex gap-3">
          <AddExpenseDialog />
          <AddPaymentDialog />
        </div>

        <ExpenseList />
      </main>
    </div>
  );
};

export default Dashboard;
