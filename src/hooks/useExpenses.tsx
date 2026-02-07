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
} from "firebase/firestore";
import { db } from "@/integrations/firebase/config";
import { useAuth } from "./useAuth";
import { useProfiles, Profile } from "./useProfiles";
import { validateExpense, validatePayment } from "@/lib/validation";
import { calculateNetBalance } from "@/lib/balanceCalculation";
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

// Input type for adding expenses (matching Supabase Insert type)
export interface ExpenseInsert {
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
 * Firebase Expenses hook - compatible with previous Supabase interface
 * Provides real-time updates and expense operations
 */
export const useExpenses = () => {
  const { user } = useAuth();
  const { profiles, currentProfile, roommate } = useProfiles();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchExpenses = useCallback(() => {
    // This function is kept for compatibility but doesn't need to do anything
    // since we're using real-time listeners
  }, []);

  useEffect(() => {
    // Wait for authenticated user - available immediately from Firebase Auth
    if (!user) {
      setExpenses([]);
      setLoading(false);
      return;
    }

    // Use user.uid directly - avoids race condition with profile loading
    const currentUserId = user.uid;

    // Track expenses from both queries separately
    let paidByExpenses: Expense[] = [];
    let owesExpenses: Expense[] = [];
    let paidByLoaded = false;
    let owesLoaded = false;

    const mergeAndUpdateExpenses = () => {
      if (paidByLoaded && owesLoaded) {
        // Merge both arrays, removing duplicates by ID
        const expensesMap = new Map<string, Expense>();
        [...paidByExpenses, ...owesExpenses].forEach(expense => {
          expensesMap.set(expense.id, expense);
        });

        const mergedExpenses = Array.from(expensesMap.values())
          .sort((a, b) => {
            // Sort by expense_date desc, then created_at desc
            if (a.expense_date !== b.expense_date) {
              return b.expense_date.localeCompare(a.expense_date);
            }
            return b.created_at.localeCompare(a.created_at);
          });

        setExpenses(mergedExpenses);
        setLoading(false);
      }
    };

    const processExpenseDoc = (doc: any): Expense => {
      const data = doc.data();
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
        is_payment: data.isPayment === true,
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
    };

    // Query 1: Expenses where current user is the payer
    const paidByQuery = query(
      collection(db, "expenses"),
      where("paidBy", "==", currentUserId),
      orderBy("expenseDate", "desc"),
      orderBy("createdAt", "desc")
    );

    // Query 2: Expenses where current user owes
    const owesQuery = query(
      collection(db, "expenses"),
      where("owesUserId", "==", currentUserId),
      orderBy("expenseDate", "desc"),
      orderBy("createdAt", "desc")
    );

    // Subscribe to both queries
    const unsubscribePaidBy = onSnapshot(
      paidByQuery,
      (snapshot) => {
        paidByExpenses = snapshot.docs.map(processExpenseDoc);
        paidByLoaded = true;
        mergeAndUpdateExpenses();
      },
      (error) => {
        logger.error("Error fetching expenses (paidBy)", error);
        paidByExpenses = [];
        paidByLoaded = true;
        mergeAndUpdateExpenses();
      }
    );

    const unsubscribeOwes = onSnapshot(
      owesQuery,
      (snapshot) => {
        owesExpenses = snapshot.docs.map(processExpenseDoc);
        owesLoaded = true;
        mergeAndUpdateExpenses();
      },
      (error) => {
        logger.error("Error fetching expenses (owesUserId)", error);
        owesExpenses = [];
        owesLoaded = true;
        mergeAndUpdateExpenses();
      }
    );

    return () => {
      unsubscribePaidBy();
      unsubscribeOwes();
    };
  }, [user, profiles]);

  /**
   * Add a new expense to Firestore
   */
  const addExpense = async (expense: ExpenseInsert) => {
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
      isPayment: expense.is_payment === true,
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

    return calculateNetBalance(expenses, currentProfile.id, roommate.id);
  };

  return {
    expenses,
    loading,
    addExpense,
    calculateBalance,
    refetch: fetchExpenses,
  };
};
