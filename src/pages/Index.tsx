import { useAuth } from "@/hooks/useAuth";
import { useGroups } from "@/hooks/useGroups";
import { useProfiles } from "@/hooks/useProfiles";
import { Navigate } from "react-router-dom";
import Dashboard from "./Dashboard";

const Index = () => {
  const { user, loading: authLoading } = useAuth();
  const { loading: profilesLoading } = useProfiles();
  const { groups, activeGroup, loading: groupsLoading } = useGroups();

  const loading = authLoading || profilesLoading || groupsLoading;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // If user has no groups and no active group, redirect to group selection
  if (groups.length === 0 && !activeGroup) {
    return <Navigate to="/group-select" replace />;
  }

  return <Dashboard />;
};

export default Index;
