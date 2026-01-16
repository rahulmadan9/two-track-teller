import { useState } from "react";
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
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import BalanceSummary from "@/components/BalanceSummary";
import ExpenseList from "@/components/ExpenseList";
import AddExpenseDialog from "@/components/AddExpenseDialog";
import AddPaymentDialog from "@/components/AddPaymentDialog";
import GroupInfoDialog from "@/components/GroupInfoDialog";
import { LogOut, ChevronDown, Settings } from "lucide-react";

const Dashboard = () => {
  const { signOut } = useAuth();
  const { activeGroup, groups, setActiveGroup, loading: groupsLoading } = useGroups();
  const { currentMember, otherMembers, loading: membersLoading } = useGroupMembers();
  const [groupInfoOpen, setGroupInfoOpen] = useState(false);

  const loading = groupsLoading || membersLoading;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  const currentProfile = currentMember?.profile;
  const roommate = otherMembers[0]?.profile;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
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
              <DropdownMenuContent align="start">
                <DropdownMenuLabel>Switch Group</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {groups.map((group) => (
                  <DropdownMenuItem
                    key={group.id}
                    onClick={() => setActiveGroup(group)}
                    className={activeGroup?.id === group.id ? "bg-accent" : ""}
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
              👋 Waiting for your roommate to join. Share your group code!
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Code: <span className="font-mono font-bold">{activeGroup?.invite_code}</span>
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

      <GroupInfoDialog open={groupInfoOpen} onOpenChange={setGroupInfoOpen} />
    </div>
  );
};

export default Dashboard;
