import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useProfiles } from "@/hooks/useProfiles";

const ProfileView = () => {
  const { signOut, user } = useAuth();
  const { currentProfile } = useProfiles();

  return (
    <div className="px-4 py-6 space-y-6">
      <div className="rounded-xl border border-border/50 bg-card p-6 space-y-4">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">Name</p>
          <p className="text-lg font-medium">{currentProfile?.display_name}</p>
        </div>
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">Email</p>
          <p className="text-lg font-medium">{user?.email}</p>
        </div>
      </div>

      <Button
        variant="outline"
        className="w-full"
        onClick={signOut}
      >
        <LogOut className="mr-2 h-4 w-4" />
        Sign out
      </Button>
    </div>
  );
};

export default ProfileView;
