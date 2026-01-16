import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useProfiles, Profile } from "./useProfiles";
import { Database } from "@/integrations/supabase/types";
import { validateExpense, validatePayment } from "@/lib/validation";

type ExpenseRow = Database["public"]["Tables"]["expenses"]["Row"];
type ExpenseInsert = Database["public"]["Tables"]["expenses"]["Insert"];

export interface Expense extends ExpenseRow {
  payer?: Profile;
}

export const useExpenses = () => {
  const { profiles, currentProfile, roommate } = useProfiles();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchExpenses = useCallback(async () => {
    const { data, error } = await supabase
      .from("expenses")
      .select("*")
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
      payer: profiles.find((p) => p.id === expense.paid_by),
    }));

    setExpenses(expensesWithPayer);
    setLoading(false);
  }, [profiles]);

  useEffect(() => {
    if (profiles.length === 0) return;
    
    fetchExpenses();

    // Subscribe to realtime updates
    const channel = supabase
      .channel("expenses-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "expenses" },
        () => {
          fetchExpenses();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profiles, fetchExpenses]);

  const addExpense = async (expense: ExpenseInsert) => {
    // Validate expense data before sending to database
    // This provides user-friendly errors instead of raw database constraint errors
    const dataToValidate = {
      ...expense,
      amount: Number(expense.amount),
      custom_split_amount: expense.custom_split_amount !== null && expense.custom_split_amount !== undefined 
        ? Number(expense.custom_split_amount) 
        : null,
    };

    // Use appropriate validator based on whether this is a payment
    if (expense.is_payment) {
      const result = validatePayment(dataToValidate);
      if (!result.success) {
        throw new Error(result.error);
      }
    } else {
      const result = validateExpense(dataToValidate);
      if (!result.success) {
        throw new Error(result.error);
      }
    }

    const { error } = await supabase.from("expenses").insert(expense);
    if (error) throw error;
  };

  const calculateBalance = (): { amount: number; oweDirection: "you_owe" | "they_owe" | "settled" } => {
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
