import { useEffect, useState, useCallback } from "react";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
  Timestamp,
  where,
  or,
} from "firebase/firestore";
import { db } from "@/integrations/firebase/config";
import { useFirebaseProfiles, Profile } from "./useFirebaseProfiles";
import { validateExpense, validatePayment } from "@/lib/validation";
import { logger } from "@/lib/logger";

// Expense interface matching Supabase structure for compatibility
export interface Expense {
  id: string;
  amount: number;
  category: string;
  created_at: string;
  custom_split_amount: number | null;
  description: string;
  expense_date: string;
  group_id: string | null;
  is_payment: boolean;
  notes: string | null;
  owes_user_id: string | null;
  paid_by: string;
  split_type: "fifty_fifty" | "custom" | "one_owes_all";
  updated_at: string;
  payer?: Profile;
}

// Input type for adding expenses
export interface ExpenseInput {
  amount: number;
  category?: string;
  custom_split_amount?: number | null;
  description: string;
  expense_date?: string;
  group_id?: string | null;
  is_payment?: boolean;
  notes?: string | null;
  owes_user_id?: string | null;
  paid_by: string;
  split_type?: "fifty_fifty" | "custom" | "one_owes_all";
}

/**
 * Custom hook for managing expenses from Firestore
 * Provides real-time updates and expense operations
 */
export const useFirebaseExpenses = () => {
  const { profiles, currentProfile, roommate } = useFirebaseProfiles();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchExpenses = useCallback(async () => {
    if (profiles.length === 0) return;

    try {
      // Get all user IDs to query expenses
      const userIds = profiles.map((p) => p.id);

      // Create query for expenses where current user is involved
      // Note: Firestore 'or' queries require careful handling
      const expensesQuery = query(
        collection(db, "expenses"),
        or(
          where("paidBy", "in", userIds),
          where("owesUserId", "in", userIds)
        ),
        orderBy("expenseDate", "desc"),
        orderBy("createdAt", "desc")
      );

      return expensesQuery;
    } catch (error) {
      logger.error("Error creating expenses query", error);
      return null;
    }
  }, [profiles]);

  useEffect(() => {
    if (profiles.length === 0) {
      setLoading(false);
      return;
    }

    // For simplicity with Firestore limitations, query all expenses
    // and filter client-side if needed
    const expensesQuery = query(
      collection(db, "expenses"),
      orderBy("expenseDate", "desc"),
      orderBy("createdAt", "desc")
    );

    // Subscribe to real-time updates
    const unsubscribe = onSnapshot(
      expensesQuery,
      (snapshot) => {
        const expensesData: Expense[] = snapshot.docs
          .map((doc) => {
            const data = doc.data();

            // Convert Firestore document to Expense format
            return {
              id: doc.id,
              amount: data.amount || 0,
              category: data.category || "other",
              created_at:
                data.createdAt instanceof Timestamp
                  ? data.createdAt.toDate().toISOString()
                  : new Date().toISOString(),
              custom_split_amount: data.customSplitAmount ?? null,
              description: data.description || "",
              expense_date: data.expenseDate || new Date().toISOString().split("T")[0],
              group_id: data.groupId ?? null,
              is_payment: data.isPayment || false,
              notes: data.notes ?? null,
              owes_user_id: data.owesUserId ?? null,
              paid_by: data.paidBy || "",
              split_type: data.splitType || "fifty_fifty",
              updated_at:
                data.updatedAt instanceof Timestamp
                  ? data.updatedAt.toDate().toISOString()
                  : new Date().toISOString(),
              payer: profiles.find((p) => p.id === data.paidBy),
            };
          })
          .filter((expense) => {
            // Filter to only show expenses involving current users
            const userIds = profiles.map((p) => p.id);
            return (
              userIds.includes(expense.paid_by) ||
              (expense.owes_user_id && userIds.includes(expense.owes_user_id))
            );
          });

        setExpenses(expensesData);
        setLoading(false);
      },
      (error) => {
        logger.error("Error fetching expenses", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [profiles]);

  /**
   * Add a new expense to Firestore
   */
  const addExpense = async (expense: ExpenseInput) => {
    // Validate expense data before sending to Firestore
    const dataToValidate = {
      ...expense,
      amount: Number(expense.amount),
      custom_split_amount:
        expense.custom_split_amount !== null && expense.custom_split_amount !== undefined
          ? Number(expense.custom_split_amount)
          : null,
    };

    // Use appropriate validator based on whether this is a payment
    if (expense.is_payment) {
      const result = validatePayment(dataToValidate);
      if (result.success === false) {
        throw new Error(result.error);
      }
    } else {
      const result = validateExpense(dataToValidate);
      if (result.success === false) {
        throw new Error(result.error);
      }
    }

    // Get denormalized user names for efficiency
    const paidByName = profiles.find((p) => p.id === expense.paid_by)?.display_name || "";
    const owesUserName = expense.owes_user_id
      ? profiles.find((p) => p.id === expense.owes_user_id)?.display_name || null
      : null;

    // Convert to Firestore format (camelCase)
    const firestoreData = {
      description: expense.description,
      amount: Number(expense.amount),
      paidBy: expense.paid_by,
      paidByName,
      splitType: expense.split_type || "fifty_fifty",
      customSplitAmount:
        expense.custom_split_amount !== null && expense.custom_split_amount !== undefined
          ? Number(expense.custom_split_amount)
          : null,
      owesUserId: expense.owes_user_id || null,
      owesUserName,
      category: expense.category || "other",
      expenseDate: expense.expense_date || new Date().toISOString().split("T")[0],
      notes: expense.notes || null,
      isPayment: expense.is_payment || false,
      groupId: expense.group_id || null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    try {
      await addDoc(collection(db, "expenses"), firestoreData);
    } catch (error) {
      logger.error("Error adding expense", error);
      throw error;
    }
  };

  /**
   * Calculate the balance between current user and roommate
   * Returns the net balance and who owes whom
   */
  const calculateBalance = (): {
    amount: number;
    oweDirection: "you_owe" | "they_owe" | "settled";
  } => {
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

  return {
    expenses,
    loading,
    addExpense,
    calculateBalance,
    refetch: () => {}, // No-op for compatibility, real-time updates handle this
  };
};
