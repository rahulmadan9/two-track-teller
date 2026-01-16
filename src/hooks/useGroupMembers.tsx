import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useGroups } from "./useGroups";
import { Profile } from "./useProfiles";

export interface GroupMember {
  id: string;
  group_id: string;
  profile_id: string;
  joined_at: string;
  profile?: Profile;
}

export const useGroupMembers = () => {
  const { user } = useAuth();
  const { activeGroup } = useGroups();
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [currentMember, setCurrentMember] = useState<GroupMember | null>(null);
  const [otherMembers, setOtherMembers] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMembers = useCallback(async () => {
    if (!activeGroup) {
      setMembers([]);
      setCurrentMember(null);
      setOtherMembers([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("group_members")
      .select(`
        *,
        profile:profiles(*)
      `)
      .eq("group_id", activeGroup.id)
      .order("joined_at", { ascending: true });

    if (error) {
      console.error("Error fetching group members:", error);
      setLoading(false);
      return;
    }

    const membersData = (data || []).map((m) => ({
      ...m,
      profile: m.profile as unknown as Profile,
    }));

    setMembers(membersData);

    const current = membersData.find((m) => m.profile?.user_id === user?.id) || null;
    setCurrentMember(current);

    const others = membersData.filter((m) => m.profile?.user_id !== user?.id);
    setOtherMembers(others);

    setLoading(false);
  }, [activeGroup, user]);

  useEffect(() => {
    if (!user || !activeGroup) {
      setMembers([]);
      setCurrentMember(null);
      setOtherMembers([]);
      setLoading(false);
      return;
    }

    fetchMembers();

    // Subscribe to realtime updates
    const channel = supabase
      .channel(`group-members-${activeGroup.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "group_members",
          filter: `group_id=eq.${activeGroup.id}`,
        },
        () => fetchMembers()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, activeGroup, fetchMembers]);

  return {
    members,
    currentMember,
    otherMembers,
    loading,
    refetch: fetchMembers,
  };
};
