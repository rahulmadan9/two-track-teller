/**
 * Shared balance calculation utility.
 * Single source of truth for all balance calculations in the app.
 * Fixes: inverted payment logic, missing roommate filter, truthy coercion of isPayment.
 */

export interface BalanceEntry {
  id: string;
  amount: number;
  is_payment: boolean;
  paid_by: string;
  split_type: "fifty_fifty" | "custom" | "one_owes_all";
  custom_split_amount: number | null;
  owes_user_id: string | null;
}

/**
 * Returns the contribution of a single expense to the balance between two users.
 * Returns null if the expense doesn't involve both users (roommate filter - Bug #2 fix).
 * Uses strict boolean check for isPayment (Bug #5 fix).
 */
export function getExpenseContribution(
  expense: BalanceEntry,
  currentUserId: string,
  roommateId: string
): { youOwe: number; theyOwe: number } | null {
  const amount = Number(expense.amount);
  const paidByMe = expense.paid_by === currentUserId;
  const paidByRoommate = expense.paid_by === roommateId;

  // Expense must be paid by one of the two users
  if (!paidByMe && !paidByRoommate) {
    return null;
  }

  // Strict boolean check for isPayment (Bug #5 fix)
  const isPayment = expense.is_payment === true;

  if (isPayment) {
    // For payments, owes_user_id must point to the other user
    if (paidByMe && expense.owes_user_id !== roommateId) {
      return null;
    }
    if (paidByRoommate && expense.owes_user_id !== currentUserId) {
      return null;
    }

    // Payments reduce what the payer owes to the receiver
    if (paidByMe) {
      // I paid roommate -> reduces what I owe them
      return { youOwe: -amount, theyOwe: 0 };
    } else {
      // Roommate paid me -> reduces what they owe me
      return { youOwe: 0, theyOwe: -amount };
    }
  }

  // Regular expense: owes_user_id must point to one of the two users (or be null for legacy data)
  // If owes_user_id is set and doesn't match either user, skip (Bug #2 fix)
  if (
    expense.owes_user_id !== null &&
    expense.owes_user_id !== currentUserId &&
    expense.owes_user_id !== roommateId
  ) {
    return null;
  }

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
    // I paid, so roommate owes me their share
    return { youOwe: 0, theyOwe: splitAmount };
  } else {
    // Roommate paid, so I owe them my share
    return { youOwe: splitAmount, theyOwe: 0 };
  }
}

/**
 * Calculate net balance from a list of expenses between current user and roommate.
 */
export function calculateNetBalance(
  expenses: BalanceEntry[],
  currentUserId: string,
  roommateId: string
): { amount: number; oweDirection: "you_owe" | "they_owe" | "settled" } {
  let youOweRoommate = 0;
  let roommateOwesYou = 0;

  for (const expense of expenses) {
    const contribution = getExpenseContribution(expense, currentUserId, roommateId);
    if (!contribution) continue;

    youOweRoommate += contribution.youOwe;
    roommateOwesYou += contribution.theyOwe;
  }

  const netBalance = roommateOwesYou - youOweRoommate;

  if (Math.abs(netBalance) < 0.01) {
    return { amount: 0, oweDirection: "settled" };
  } else if (netBalance > 0) {
    return { amount: netBalance, oweDirection: "they_owe" };
  } else {
    return { amount: Math.abs(netBalance), oweDirection: "you_owe" };
  }
}

/**
 * Calculate running balances for ledger view.
 * Expenses should be passed in chronological order (oldest first).
 * Returns running balance per expense (positive = they owe you, negative = you owe them).
 * Fixes Bug #1: payment logic is now correct (payments reduce balance, not increase).
 */
export function calculateRunningBalances(
  expenses: BalanceEntry[],
  currentUserId: string,
  roommateId: string
): number[] {
  let runningBalance = 0;
  const balances: number[] = [];

  for (const expense of expenses) {
    const contribution = getExpenseContribution(expense, currentUserId, roommateId);
    if (contribution) {
      // Net effect: positive means they owe more, negative means you owe more
      runningBalance += contribution.theyOwe - contribution.youOwe;
    }
    balances.push(runningBalance);
  }

  return balances;
}
