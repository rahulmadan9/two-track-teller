import { useNavigate } from "react-router-dom";
import { useGroups, Group } from "@/hooks/useGroups";
import { useProfiles } from "@/hooks/useProfiles";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Users, Plus, User, LogOut, ChevronRight } from "lucide-react";

const MyGroups = () => {
  const navigate = useNavigate();
  const { groups, setActiveGroup, loading: groupsLoading } = useGroups();
  const { currentProfile, loading: profilesLoading } = useProfiles();
  const { user, loading: authLoading, signOut } = useAuth();

  const loading = authLoading || profilesLoading || groupsLoading;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!user) {
    navigate("/auth");
    return null;
  }

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const handleGroupSelect = (group: Group) => {
    setActiveGroup(group);
    navigate("/");
  };

  return (
    <div className="relative min-h-screen bg-background p-4">
      {/* User Menu */}
      <div className="absolute top-4 right-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon">
              <User className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <div className="px-2 py-1.5 text-sm font-medium">
              {currentProfile?.display_name || "User"}
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="mx-auto max-w-2xl pt-16">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold">My Groups</h1>
          <p className="mt-2 text-muted-foreground">
            Select a group to view its dashboard
          </p>
        </div>

        {groups.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Users className="mb-4 h-12 w-12 text-muted-foreground" />
              <p className="mb-4 text-muted-foreground">You haven't joined any groups yet.</p>
              <Button onClick={() => navigate("/group-select")}>
                <Plus className="mr-2 h-4 w-4" />
                Create or Join a Group
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {groups.map((group) => (
              <Card
                key={group.id}
                className="cursor-pointer transition-colors hover:bg-accent"
                onClick={() => handleGroupSelect(group)}
              >
                <CardHeader className="flex flex-row items-center justify-between py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{group.name}</CardTitle>
                      <CardDescription>
                        Code: {group.invite_code}
                      </CardDescription>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </CardHeader>
              </Card>
            ))}

            <Button
              variant="outline"
              className="w-full mt-6"
              onClick={() => navigate("/group-select")}
            >
              <Plus className="mr-2 h-4 w-4" />
              Create or Join Another Group
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyGroups;
