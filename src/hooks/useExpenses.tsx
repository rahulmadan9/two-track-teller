import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useGroups } from "./useGroups";
import { useGroupMembers } from "./useGroupMembers";
import { Profile } from "./useProfiles";
import { Database } from "@/integrations/supabase/types";

type ExpenseRow = Database["public"]["Tables"]["expenses"]["Row"];
type ExpenseInsert = Database["public"]["Tables"]["expenses"]["Insert"];

export interface Expense extends ExpenseRow {
  payer?: Profile;
}

export const useExpenses = () => {
  const { activeGroup } = useGroups();
  const { members, currentMember, otherMembers } = useGroupMembers();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchExpenses = useCallback(async () => {
    if (!activeGroup) {
      setExpenses([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("expenses")
      .select("*")
      .eq("group_id", activeGroup.id)
      .order("expense_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching expenses:", error);
      setLoading(false);
      return;
    }

    // Map payer profiles to expenses
    const expensesWithPayer = (data || []).map((expense) => ({
      ...expense,
      payer: members.find((m) => m.profile?.id === expense.paid_by)?.profile,
    }));

    setExpenses(expensesWithPayer);
    setLoading(false);
  }, [activeGroup, members]);

  useEffect(() => {
    if (!activeGroup) {
      setExpenses([]);
      setLoading(false);
      return;
    }
    
    fetchExpenses();

    // Subscribe to realtime updates
    const channel = supabase
      .channel(`expenses-${activeGroup.id}`)
      .on(
        "postgres_changes",
        { 
          event: "*", 
          schema: "public", 
          table: "expenses",
          filter: `group_id=eq.${activeGroup.id}`,
        },
        () => {
          fetchExpenses();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeGroup, fetchExpenses]);

  const addExpense = async (expense: Omit<ExpenseInsert, "group_id">) => {
    if (!activeGroup) throw new Error("No active group");
    
    const { error } = await supabase.from("expenses").insert({
      ...expense,
      group_id: activeGroup.id,
    });
    if (error) throw error;
  };

  const calculateBalance = (): { amount: number; oweDirection: "you_owe" | "they_owe" | "settled" } => {
    // For now, calculate balance between current user and the first other member
    // This maintains compatibility with the 2-person model per group
    const currentProfile = currentMember?.profile;
    const roommate = otherMembers[0]?.profile;

    if (!currentProfile || !roommate) {
      return { amount: 0, oweDirection: "settled" };
    }

    let youOweRoommate = 0;
    let roommateOwesYou = 0;

    expenses.forEach((expense) => {
      const amount = Number(expense.amount);
      const isPayment = expense.is_payment;
      const paidByMe = expense.paid_by === currentProfile.id;

      if (isPayment) {
        // Payments reduce what the payer owes
        if (paidByMe) {
          youOweRoommate -= amount;
        } else {
          roommateOwesYou -= amount;
        }
      } else {
        // Regular expense
        let splitAmount = 0;
        
        switch (expense.split_type) {
          case "fifty_fifty":
            splitAmount = amount / 2;
            break;
          case "custom":
            splitAmount = Number(expense.custom_split_amount) || 0;
            break;
          case "one_owes_all":
            splitAmount = amount;
            break;
        }

        if (paidByMe) {
          roommateOwesYou += splitAmount;
        } else {
          youOweRoommate += splitAmount;
        }
      }
    });

    const netBalance = roommateOwesYou - youOweRoommate;

    if (Math.abs(netBalance) < 0.01) {
      return { amount: 0, oweDirection: "settled" };
    } else if (netBalance > 0) {
      return { amount: netBalance, oweDirection: "they_owe" };
    } else {
      return { amount: Math.abs(netBalance), oweDirection: "you_owe" };
    }
  };

  return { expenses, loading, addExpense, calculateBalance, refetch: fetchExpenses };
};
