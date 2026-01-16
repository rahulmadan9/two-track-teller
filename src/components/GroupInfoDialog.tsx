import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGroups } from "@/hooks/useGroups";
import { useGroupMembers } from "@/hooks/useGroupMembers";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Copy, Check, Users, LogOut } from "lucide-react";

interface GroupInfoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const GroupInfoDialog = ({ open, onOpenChange }: GroupInfoDialogProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { activeGroup, leaveGroup, groups } = useGroups();
  const { members } = useGroupMembers();
  const [copied, setCopied] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  const copyCode = () => {
    if (activeGroup?.invite_code) {
      navigator.clipboard.writeText(activeGroup.invite_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: "Copied!",
        description: "Invite code copied to clipboard.",
      });
    }
  };

  const handleLeaveGroup = async () => {
    if (!activeGroup) return;

    setIsLeaving(true);
    const { error } = await leaveGroup(activeGroup.id);
    setIsLeaving(false);

    if (error) {
      toast({
        title: "Error",
        description: error,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Left group",
      description: `You've left ${activeGroup.name}.`,
    });

    onOpenChange(false);

    // If no more groups, redirect to group selection
    if (groups.length <= 1) {
      navigate("/group-select");
    }
  };

  if (!activeGroup) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{activeGroup.name}</DialogTitle>
          <DialogDescription>Group settings and information</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Invite Code Section */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Invite Code</label>
            <div className="flex items-center gap-2">
              <div className="flex-1 rounded-md bg-muted px-3 py-2 font-mono text-lg tracking-wider">
                {activeGroup.invite_code}
              </div>
              <Button variant="outline" size="icon" onClick={copyCode}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Share this code with others to let them join your group
            </p>
          </div>

          {/* Members Section */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Users className="h-4 w-4" />
              Members ({members.length})
            </div>
            <div className="space-y-2">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2"
                >
                  <span>{member.profile?.display_name}</span>
                  {activeGroup.created_by === member.profile?.id && (
                    <span className="text-xs text-muted-foreground">Creator</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Leave Group Section */}
          <div className="pt-4 border-t">
            <Button
              variant="destructive"
              className="w-full"
              onClick={handleLeaveGroup}
              disabled={isLeaving}
            >
              <LogOut className="h-4 w-4 mr-2" />
              {isLeaving ? "Leaving..." : "Leave Group"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GroupInfoDialog;
