import { Timestamp } from 'firebase/firestore';

/**
 * Split type options for expenses
 */
export type SplitType = 'fifty_fifty' | 'custom' | 'one_owes_all';

/**
 * Expense category options
 */
export type ExpenseCategory =
  | 'rent'
  | 'utilities'
  | 'groceries'
  | 'household_supplies'
  | 'shared_meals'
  | 'purchases'
  | 'other';

/**
 * User profile in Firestore
 */
export interface FirebaseProfile {
  id: string;
  displayName: string;
  email: string;
  phoneNumber?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Expense document in Firestore
 */
export interface FirebaseExpense {
  id: string;
  description: string;
  amount: number;
  paidBy: string; // user ID
  paidByName: string; // denormalized for efficiency
  splitType: SplitType;
  customSplitAmount: number | null;
  owesUserId: string | null;
  owesUserName: string | null; // denormalized for efficiency
  category: ExpenseCategory;
  expenseDate: string; // ISO date string
  notes: string | null;
  isPayment: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  groupId: string | null;
}

/**
 * Input type for creating a new expense (without auto-generated fields)
 */
export interface CreateExpenseInput {
  description: string;
  amount: number;
  paidBy: string;
  splitType: SplitType;
  customSplitAmount?: number | null;
  owesUserId?: string | null;
  category: ExpenseCategory;
  expenseDate: string;
  notes?: string | null;
  isPayment?: boolean;
  groupId?: string | null;
}

/**
 * Input type for updating an existing expense
 */
export interface UpdateExpenseInput {
  description?: string;
  amount?: number;
  paidBy?: string;
  splitType?: SplitType;
  customSplitAmount?: number | null;
  owesUserId?: string | null;
  category?: ExpenseCategory;
  expenseDate?: string;
  notes?: string | null;
  isPayment?: boolean;
}
