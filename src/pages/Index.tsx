import { useAuth } from "@/hooks/useAuth";
import { useGroups } from "@/hooks/useGroups";
import { Navigate } from "react-router-dom";
import Dashboard from "./Dashboard";

const Index = () => {
  const { user, loading: authLoading } = useAuth();
  const { groups, loading: groupsLoading } = useGroups();

  // Wait for both auth and groups to fully load
  if (authLoading || groupsLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // If user has no groups, redirect to group selection
  if (groups.length === 0) {
    return <Navigate to="/group-select" replace />;
  }

  return <Dashboard />;
};

export default Index;
