import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGroups } from "@/hooks/useGroups";
import { useProfiles } from "@/hooks/useProfiles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Users, UserPlus, Copy, Check } from "lucide-react";

const GroupSelect = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { createGroup, joinGroup, loading: groupsLoading } = useGroups();
  const { loading: profilesLoading } = useProfiles();

  const [groupName, setGroupName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loading = groupsLoading || profilesLoading;

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) return;

    setIsSubmitting(true);
    const { group, error } = await createGroup(groupName.trim());
    setIsSubmitting(false);

    if (error) {
      toast({
        title: "Error",
        description: error,
        variant: "destructive",
      });
      return;
    }

    if (group) {
      setCreatedCode(group.invite_code);
      toast({
        title: "Group created!",
        description: `Share the code "${group.invite_code}" with your roommate.`,
      });
    }
  };

  const handleJoinGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim()) return;

    setIsSubmitting(true);
    const { error } = await joinGroup(inviteCode.trim());
    setIsSubmitting(false);

    if (error) {
      toast({
        title: "Error",
        description: error,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Joined group!",
      description: "You've successfully joined the group.",
    });
    navigate("/");
  };

  const copyCode = () => {
    if (createdCode) {
      navigator.clipboard.writeText(createdCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const goToDashboard = () => {
    navigate("/", { replace: true });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Welcome to SplitEasy</CardTitle>
          <CardDescription>
            Create a new group or join an existing one with an invite code
          </CardDescription>
        </CardHeader>
        <CardContent>
          {createdCode ? (
            <div className="space-y-4">
              <div className="rounded-lg bg-accent/50 p-4 text-center">
                <p className="text-sm text-muted-foreground mb-2">Your group invite code:</p>
                <div className="flex items-center justify-center gap-2">
                  <span className="text-2xl font-mono font-bold tracking-wider">{createdCode}</span>
                  <Button variant="ghost" size="icon" onClick={copyCode}>
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Share this code with your roommate to let them join
                </p>
              </div>
              <Button className="w-full" onClick={goToDashboard}>
                Continue to Dashboard
              </Button>
            </div>
          ) : (
            <Tabs defaultValue="create" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="create" className="gap-2">
                  <Users className="h-4 w-4" />
                  Create
                </TabsTrigger>
                <TabsTrigger value="join" className="gap-2">
                  <UserPlus className="h-4 w-4" />
                  Join
                </TabsTrigger>
              </TabsList>
              <TabsContent value="create" className="space-y-4 mt-4">
                <form onSubmit={handleCreateGroup} className="space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="groupName" className="text-sm font-medium">
                      Group Name
                    </label>
                    <Input
                      id="groupName"
                      placeholder="e.g., Apartment 4B"
                      value={groupName}
                      onChange={(e) => setGroupName(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? "Creating..." : "Create Group"}
                  </Button>
                </form>
              </TabsContent>
              <TabsContent value="join" className="space-y-4 mt-4">
                <form onSubmit={handleJoinGroup} className="space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="inviteCode" className="text-sm font-medium">
                      Invite Code
                    </label>
                    <Input
                      id="inviteCode"
                      placeholder="e.g., ABC12345"
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                      className="font-mono uppercase"
                      maxLength={8}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? "Joining..." : "Join Group"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default GroupSelect;
