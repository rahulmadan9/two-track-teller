import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { logger } from "@/lib/logger";

export interface Profile {
  id: string;
  user_id: string;
  display_name: string;
  created_at: string;
}

export const useProfiles = () => {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);
  const [roommate, setRoommate] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setProfiles([]);
      setCurrentProfile(null);
      setRoommate(null);
      setLoading(false);
      return;
    }

    const fetchProfiles = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: true });

      if (error) {
        logger.error("Error fetching profiles", error);
        setLoading(false);
        return;
      }

      setProfiles(data || []);
      
      const current = data?.find((p) => p.user_id === user.id) || null;
      setCurrentProfile(current);
      
      const mate = data?.find((p) => p.user_id !== user.id) || null;
      setRoommate(mate);
      
      setLoading(false);
    };

    fetchProfiles();

    // Subscribe to realtime updates
    const channel = supabase
      .channel("profiles-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        () => {
          fetchProfiles();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return { profiles, currentProfile, roommate, loading };
};
