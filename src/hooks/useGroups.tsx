import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useProfiles } from "./useProfiles";

export interface Group {
  id: string;
  name: string;
  invite_code: string;
  created_by: string | null;
  created_at: string;
}

const ACTIVE_GROUP_KEY = "splitease_active_group";

export const useGroups = () => {
  const { user } = useAuth();
  const { currentProfile } = useProfiles();
  const [groups, setGroups] = useState<Group[]>([]);
  const [activeGroup, setActiveGroupState] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchGroups = useCallback(async () => {
    if (!currentProfile) {
      setGroups([]);
      setActiveGroupState(null);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("groups")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching groups:", error);
      setLoading(false);
      return;
    }

    setGroups(data || []);

    // Restore active group from localStorage or use first group
    const savedGroupId = localStorage.getItem(ACTIVE_GROUP_KEY);
    const savedGroup = data?.find((g) => g.id === savedGroupId);
    
    if (savedGroup) {
      setActiveGroupState(savedGroup);
    } else if (data && data.length > 0) {
      setActiveGroupState(data[0]);
      localStorage.setItem(ACTIVE_GROUP_KEY, data[0].id);
    } else {
      setActiveGroupState(null);
    }

    setLoading(false);
  }, [currentProfile]);

  useEffect(() => {
    if (!user || !currentProfile) {
      setGroups([]);
      setActiveGroupState(null);
      setLoading(false);
      return;
    }

    fetchGroups();

    // Subscribe to realtime updates
    const groupsChannel = supabase
      .channel("groups-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "groups" },
        () => fetchGroups()
      )
      .subscribe();

    const membersChannel = supabase
      .channel("group-members-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "group_members" },
        () => fetchGroups()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(groupsChannel);
      supabase.removeChannel(membersChannel);
    };
  }, [user, currentProfile, fetchGroups]);

  const setActiveGroup = (group: Group) => {
    setActiveGroupState(group);
    localStorage.setItem(ACTIVE_GROUP_KEY, group.id);
  };

  const createGroup = async (name: string): Promise<{ group: Group | null; error: string | null }> => {
    if (!currentProfile) {
      return { group: null, error: "Profile not found" };
    }

    const { data: groupData, error: groupError } = await supabase
      .from("groups")
      .insert({ name, created_by: currentProfile.id })
      .select()
      .single();

    if (groupError) {
      console.error("Error creating group:", groupError);
      return { group: null, error: groupError.message };
    }

    // Add creator as a member
    const { error: memberError } = await supabase
      .from("group_members")
      .insert({ group_id: groupData.id, profile_id: currentProfile.id });

    if (memberError) {
      console.error("Error adding member:", memberError);
      return { group: null, error: memberError.message };
    }

    setActiveGroup(groupData);
    return { group: groupData, error: null };
  };

  const joinGroup = async (inviteCode: string): Promise<{ group: Group | null; error: string | null }> => {
    if (!currentProfile) {
      return { group: null, error: "Profile not found" };
    }

    // Find group by invite code
    const { data: groupData, error: groupError } = await supabase
      .from("groups")
      .select("*")
      .eq("invite_code", inviteCode.toUpperCase())
      .single();

    if (groupError || !groupData) {
      return { group: null, error: "Invalid invite code" };
    }

    // Check if already a member
    const { data: existingMember } = await supabase
      .from("group_members")
      .select("id")
      .eq("group_id", groupData.id)
      .eq("profile_id", currentProfile.id)
      .single();

    if (existingMember) {
      setActiveGroup(groupData);
      return { group: groupData, error: null };
    }

    // Add as member
    const { error: memberError } = await supabase
      .from("group_members")
      .insert({ group_id: groupData.id, profile_id: currentProfile.id });

    if (memberError) {
      console.error("Error joining group:", memberError);
      return { group: null, error: memberError.message };
    }

    setActiveGroup(groupData);
    return { group: groupData, error: null };
  };

  const leaveGroup = async (groupId: string): Promise<{ error: string | null }> => {
    if (!currentProfile) {
      return { error: "Profile not found" };
    }

    const { error } = await supabase
      .from("group_members")
      .delete()
      .eq("group_id", groupId)
      .eq("profile_id", currentProfile.id);

    if (error) {
      console.error("Error leaving group:", error);
      return { error: error.message };
    }

    // If leaving active group, switch to another group
    if (activeGroup?.id === groupId) {
      const remainingGroups = groups.filter((g) => g.id !== groupId);
      if (remainingGroups.length > 0) {
        setActiveGroup(remainingGroups[0]);
      } else {
        setActiveGroupState(null);
        localStorage.removeItem(ACTIVE_GROUP_KEY);
      }
    }

    return { error: null };
  };

  return {
    groups,
    activeGroup,
    setActiveGroup,
    createGroup,
    joinGroup,
    leaveGroup,
    loading,
    refetch: fetchGroups,
  };
};
