import { useEffect, useState, useCallback, useMemo } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  doc,
  deleteDoc,
  writeBatch,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/integrations/firebase/config";
import { useAuth } from "./useAuth";
import { useProfiles } from "./useProfiles";
import { validateRecurringExpense, validateRecurringConfirm } from "@/lib/validation";
import { logger } from "@/lib/logger";
import type { RecurringExpenseType } from "@/integrations/firebase/types";
import type { SplitType, ExpenseCategory } from "@/integrations/firebase/types";

export interface RecurringExpense {
  id: string;
  description: string;
  defaultAmount: number;
  category: ExpenseCategory;
  expenseType: RecurringExpenseType;
  splitType: SplitType;
  customSplitAmount: number | null;
  typicallyPaidBy: string;
  typicallyPaidByName: string;
  owesUserId: string | null;
  owesUserName: string | null;
  createdBy: string;
  createdByName: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RecurringConfirmation {
  id: string;
  recurringExpenseId: string;
  monthKey: string;
  confirmedAmount: number;
  confirmedBy: string;
  confirmedByName: string;
  expenseId: string;
  confirmedAt: string;
}

export interface RecurringItemWithStatus extends RecurringExpense {
  confirmation: RecurringConfirmation | null;
  isPending: boolean;
}

export interface RecurringSummary {
  totalFixed: number;
  paidSoFar: number;
  remaining: number;
}

export interface RecurringExpenseInsert {
  description: string;
  defaultAmount: number;
  category: ExpenseCategory;
  expenseType: RecurringExpenseType;
  splitType: SplitType;
  customSplitAmount?: number | null;
  typicallyPaidBy: string;
  owesUserId?: string | null;
}

function getCurrentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export const useRecurringExpenses = () => {
  const { user } = useAuth();
  const { profiles, currentProfile, roommate } = useProfiles();
  const [recurringExpenses, setRecurringExpenses] = useState<RecurringExpense[]>([]);
  const [confirmations, setConfirmations] = useState<RecurringConfirmation[]>([]);
  const [loading, setLoading] = useState(true);
  const [monthKey] = useState(getCurrentMonthKey);

  // Real-time listeners for recurring expenses + confirmations
  useEffect(() => {
    if (!user) {
      setRecurringExpenses([]);
      setConfirmations([]);
      setLoading(false);
      return;
    }

    const currentUserId = user.uid;

    let sharedItems: RecurringExpense[] = [];
    let personalItems: RecurringExpense[] = [];
    let sharedLoaded = false;
    let personalLoaded = false;

    const mergeAndUpdate = () => {
      if (sharedLoaded && personalLoaded) {
        const map = new Map<string, RecurringExpense>();
        [...sharedItems, ...personalItems].forEach((item) => {
          map.set(item.id, item);
        });
        const merged = Array.from(map.values()).sort((a, b) =>
          a.description.localeCompare(b.description)
        );
        setRecurringExpenses(merged);
        setLoading(false);
      }
    };

    const processDoc = (docSnap: any): RecurringExpense => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        description: data.description || "",
        defaultAmount: data.defaultAmount || 0,
        category: data.category || "other",
        expenseType: data.expenseType || "shared",
        splitType: data.splitType || "fifty_fifty",
        customSplitAmount: data.customSplitAmount ?? null,
        typicallyPaidBy: data.typicallyPaidBy || "",
        typicallyPaidByName: data.typicallyPaidByName || "",
        owesUserId: data.owesUserId ?? null,
        owesUserName: data.owesUserName ?? null,
        createdBy: data.createdBy || "",
        createdByName: data.createdByName || "",
        isActive: data.isActive !== false,
        createdAt:
          data.createdAt instanceof Timestamp
            ? data.createdAt.toDate().toISOString()
            : new Date().toISOString(),
        updatedAt:
          data.updatedAt instanceof Timestamp
            ? data.updatedAt.toDate().toISOString()
            : new Date().toISOString(),
      };
    };

    // Query 1: Shared recurring expenses (active)
    const sharedQuery = query(
      collection(db, "recurringExpenses"),
      where("expenseType", "==", "shared"),
      where("isActive", "==", true),
      orderBy("createdAt", "asc")
    );

    // Query 2: Personal recurring expenses (own, active)
    const personalQuery = query(
      collection(db, "recurringExpenses"),
      where("createdBy", "==", currentUserId),
      where("expenseType", "==", "personal"),
      where("isActive", "==", true)
    );

    // Query 3: Confirmations for current month
    const confirmationsQuery = query(
      collection(db, "recurringConfirmations"),
      where("monthKey", "==", monthKey)
    );

    const unsubShared = onSnapshot(
      sharedQuery,
      (snapshot) => {
        sharedItems = snapshot.docs.map(processDoc);
        sharedLoaded = true;
        mergeAndUpdate();
      },
      (error) => {
        logger.error("Error fetching shared recurring expenses", error);
        sharedItems = [];
        sharedLoaded = true;
        mergeAndUpdate();
      }
    );

    const unsubPersonal = onSnapshot(
      personalQuery,
      (snapshot) => {
        personalItems = snapshot.docs.map(processDoc);
        personalLoaded = true;
        mergeAndUpdate();
      },
      (error) => {
        logger.error("Error fetching personal recurring expenses", error);
        personalItems = [];
        personalLoaded = true;
        mergeAndUpdate();
      }
    );

    const unsubConfirmations = onSnapshot(
      confirmationsQuery,
      (snapshot) => {
        const confs: RecurringConfirmation[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            recurringExpenseId: data.recurringExpenseId || "",
            monthKey: data.monthKey || "",
            confirmedAmount: data.confirmedAmount || 0,
            confirmedBy: data.confirmedBy || "",
            confirmedByName: data.confirmedByName || "",
            expenseId: data.expenseId || "",
            confirmedAt:
              data.confirmedAt instanceof Timestamp
                ? data.confirmedAt.toDate().toISOString()
                : new Date().toISOString(),
          };
        });
        setConfirmations(confs);
      },
      (error) => {
        logger.error("Error fetching recurring confirmations", error);
        setConfirmations([]);
      }
    );

    return () => {
      unsubShared();
      unsubPersonal();
      unsubConfirmations();
    };
  }, [user, monthKey]);

  // Computed: items with their confirmation status
  const itemsWithStatus = useMemo((): RecurringItemWithStatus[] => {
    return recurringExpenses.map((item) => {
      const confirmation = confirmations.find(
        (c) => c.recurringExpenseId === item.id
      ) || null;
      return {
        ...item,
        confirmation,
        isPending: !confirmation,
      };
    });
  }, [recurringExpenses, confirmations]);

  const pendingItems = useMemo(
    () => itemsWithStatus.filter((i) => i.isPending),
    [itemsWithStatus]
  );

  const confirmedItems = useMemo(
    () => itemsWithStatus.filter((i) => !i.isPending),
    [itemsWithStatus]
  );

  const summary = useMemo((): RecurringSummary => {
    const totalFixed = recurringExpenses.reduce(
      (sum, item) => sum + item.defaultAmount,
      0
    );
    const paidSoFar = confirmedItems.reduce(
      (sum, item) => sum + (item.confirmation?.confirmedAmount || 0),
      0
    );
    return {
      totalFixed,
      paidSoFar,
      remaining: totalFixed - paidSoFar,
    };
  }, [recurringExpenses, confirmedItems]);

  // Add a new recurring expense template
  const addRecurringExpense = useCallback(
    async (input: RecurringExpenseInsert) => {
      if (!currentProfile) throw new Error("Not logged in");

      const result = validateRecurringExpense({
        description: input.description,
        default_amount: Number(input.defaultAmount),
        expense_type: input.expenseType,
        category: input.category,
        split_type: input.splitType,
        custom_split_amount:
          input.customSplitAmount !== null && input.customSplitAmount !== undefined
            ? Number(input.customSplitAmount)
            : null,
        typically_paid_by: input.typicallyPaidBy,
        owes_user_id: input.owesUserId || null,
      });

      if (result.success === false) {
        throw new Error(result.error);
      }

      const paidByName =
        profiles.find((p) => p.id === input.typicallyPaidBy)?.display_name || "";
      const owesUserName = input.owesUserId
        ? profiles.find((p) => p.id === input.owesUserId)?.display_name || null
        : null;

      const firestoreData = {
        description: input.description,
        defaultAmount: Number(input.defaultAmount),
        category: input.category,
        expenseType: input.expenseType,
        splitType: input.splitType,
        customSplitAmount:
          input.customSplitAmount !== null && input.customSplitAmount !== undefined
            ? Number(input.customSplitAmount)
            : null,
        typicallyPaidBy: input.typicallyPaidBy,
        typicallyPaidByName: paidByName,
        owesUserId: input.owesUserId || null,
        owesUserName,
        createdBy: currentProfile.id,
        createdByName: currentProfile.display_name,
        isActive: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await addDoc(collection(db, "recurringExpenses"), firestoreData);
    },
    [currentProfile, profiles]
  );

  // Update an existing recurring expense template
  const updateRecurringExpense = useCallback(
    async (id: string, input: Partial<RecurringExpenseInsert>) => {
      const updateData: Record<string, any> = { updatedAt: serverTimestamp() };

      if (input.description !== undefined) updateData.description = input.description;
      if (input.defaultAmount !== undefined) updateData.defaultAmount = Number(input.defaultAmount);
      if (input.category !== undefined) updateData.category = input.category;
      if (input.expenseType !== undefined) updateData.expenseType = input.expenseType;
      if (input.splitType !== undefined) updateData.splitType = input.splitType;
      if (input.customSplitAmount !== undefined) {
        updateData.customSplitAmount =
          input.customSplitAmount !== null ? Number(input.customSplitAmount) : null;
      }
      if (input.typicallyPaidBy !== undefined) {
        updateData.typicallyPaidBy = input.typicallyPaidBy;
        updateData.typicallyPaidByName =
          profiles.find((p) => p.id === input.typicallyPaidBy)?.display_name || "";
      }
      if (input.owesUserId !== undefined) {
        updateData.owesUserId = input.owesUserId || null;
        updateData.owesUserName = input.owesUserId
          ? profiles.find((p) => p.id === input.owesUserId)?.display_name || null
          : null;
      }

      await updateDoc(doc(db, "recurringExpenses", id), updateData);
    },
    [profiles]
  );

  // Soft-delete a recurring expense template
  const deleteRecurringExpense = useCallback(async (id: string) => {
    await updateDoc(doc(db, "recurringExpenses", id), {
      isActive: false,
      updatedAt: serverTimestamp(),
    });
  }, []);

  // Confirm a single recurring expense for the current month
  const confirmRecurringExpense = useCallback(
    async (recurringExpenseId: string, amount: number) => {
      if (!currentProfile) throw new Error("Not logged in");

      const result = validateRecurringConfirm({ amount: Number(amount) });
      if (result.success === false) throw new Error(result.error);

      const item = recurringExpenses.find((r) => r.id === recurringExpenseId);
      if (!item) throw new Error("Recurring expense not found");

      const today = new Date().toISOString().split("T")[0];
      const batch = writeBatch(db);

      // Create the real expense
      const expenseRef = doc(collection(db, "expenses"));
      const isPersonal = item.expenseType === "personal";

      batch.set(expenseRef, {
        description: item.description,
        amount: Number(amount),
        paidBy: item.typicallyPaidBy,
        paidByName: item.typicallyPaidByName,
        splitType: item.splitType,
        customSplitAmount: item.customSplitAmount,
        owesUserId: isPersonal ? null : item.owesUserId,
        owesUserName: isPersonal ? null : item.owesUserName,
        category: item.category,
        expenseDate: today,
        notes: `Recurring: ${item.description}`,
        isPayment: false,
        groupId: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Create the confirmation
      const confirmRef = doc(collection(db, "recurringConfirmations"));
      batch.set(confirmRef, {
        recurringExpenseId,
        monthKey,
        confirmedAmount: Number(amount),
        confirmedBy: currentProfile.id,
        confirmedByName: currentProfile.display_name,
        expenseId: expenseRef.id,
        confirmedAt: serverTimestamp(),
      });

      await batch.commit();
    },
    [currentProfile, recurringExpenses, monthKey]
  );

  // Bulk confirm multiple items
  const bulkConfirm = useCallback(
    async (items: { recurringExpenseId: string; amount: number }[]) => {
      if (!currentProfile) throw new Error("Not logged in");

      const today = new Date().toISOString().split("T")[0];
      const batch = writeBatch(db);

      for (const { recurringExpenseId, amount } of items) {
        const item = recurringExpenses.find((r) => r.id === recurringExpenseId);
        if (!item) continue;

        const isPersonal = item.expenseType === "personal";

        const expenseRef = doc(collection(db, "expenses"));
        batch.set(expenseRef, {
          description: item.description,
          amount: Number(amount),
          paidBy: item.typicallyPaidBy,
          paidByName: item.typicallyPaidByName,
          splitType: item.splitType,
          customSplitAmount: item.customSplitAmount,
          owesUserId: isPersonal ? null : item.owesUserId,
          owesUserName: isPersonal ? null : item.owesUserName,
          category: item.category,
          expenseDate: today,
          notes: `Recurring: ${item.description}`,
          isPayment: false,
          groupId: null,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        const confirmRef = doc(collection(db, "recurringConfirmations"));
        batch.set(confirmRef, {
          recurringExpenseId,
          monthKey,
          confirmedAmount: Number(amount),
          confirmedBy: currentProfile.id,
          confirmedByName: currentProfile.display_name,
          expenseId: expenseRef.id,
          confirmedAt: serverTimestamp(),
        });
      }

      await batch.commit();
    },
    [currentProfile, recurringExpenses, monthKey]
  );

  // Undo a confirmation (delete confirmation + linked expense)
  const undoConfirmation = useCallback(
    async (confirmationId: string) => {
      const conf = confirmations.find((c) => c.id === confirmationId);
      if (!conf) throw new Error("Confirmation not found");

      const batch = writeBatch(db);
      batch.delete(doc(db, "recurringConfirmations", confirmationId));
      batch.delete(doc(db, "expenses", conf.expenseId));
      await batch.commit();
    },
    [confirmations]
  );

  return {
    recurringExpenses,
    confirmations,
    loading,
    monthKey,
    itemsWithStatus,
    pendingItems,
    confirmedItems,
    summary,
    addRecurringExpense,
    updateRecurringExpense,
    deleteRecurringExpense,
    confirmRecurringExpense,
    bulkConfirm,
    undoConfirmation,
  };
};
