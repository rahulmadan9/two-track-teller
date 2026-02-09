import { z } from "zod";

/**
 * Expense validation schema - validates expense data before database operations.
 * This prevents invalid data from reaching the database and provides user-friendly
 * error messages instead of exposing raw database constraint errors.
 */
export const expenseSchema = z.object({
  description: z
    .string()
    .min(1, "Description is required")
    .max(200, "Description must be less than 200 characters")
    .transform((val) => val.trim()),
  amount: z
    .number()
    .positive("Amount must be greater than 0")
    .max(1000000, "Amount cannot exceed ₹10,00,000"),
  paid_by: z.string().min(1, "Invalid payer"),
  split_type: z.enum(["fifty_fifty", "custom", "one_owes_all"], {
    errorMap: () => ({ message: "Invalid split type" }),
  }),
  custom_split_amount: z.number().min(0).nullable().optional(),
  category: z.enum(
    ["rent", "utilities", "groceries", "household_supplies", "shared_meals", "purchases", "other"],
    { errorMap: () => ({ message: "Invalid category" }) }
  ),
  expense_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
  notes: z
    .string()
    .max(1000, "Notes must be less than 1000 characters")
    .nullable()
    .optional()
    .transform((val) => (val ? val.trim() : val)),
  is_payment: z.boolean().optional().default(false),
  owes_user_id: z.string().min(1).nullable().optional(),
  group_id: z.string().min(1).nullable().optional(),
});

/**
 * Refinement to validate custom_split_amount doesn't exceed amount
 */
export const expenseSchemaWithRefinement = expenseSchema.refine(
  (data) => {
    if (data.split_type === "custom" && data.custom_split_amount !== null && data.custom_split_amount !== undefined) {
      return data.custom_split_amount <= data.amount;
    }
    return true;
  },
  {
    message: "Custom split amount cannot exceed the total amount",
    path: ["custom_split_amount"],
  }
).refine(
  (data) => {
    // Validate expense_date is within reasonable range (year 2000 to 1 year from now)
    const date = new Date(data.expense_date);
    const minDate = new Date("2000-01-01");
    const maxDate = new Date();
    maxDate.setFullYear(maxDate.getFullYear() + 1);
    return date >= minDate && date <= maxDate;
  },
  {
    message: "Date must be between year 2000 and one year from now",
    path: ["expense_date"],
  }
);

/**
 * Payment validation schema - simpler validation for payment records
 */
export const paymentSchema = z.object({
  description: z.literal("Payment"),
  amount: z
    .number()
    .positive("Amount must be greater than 0")
    .max(1000000, "Amount cannot exceed ₹10,00,000"),
  paid_by: z.string().min(1, "Invalid payer"),
  split_type: z.literal("one_owes_all"),
  category: z.literal("other"),
  expense_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
  is_payment: z.literal(true),
});

export type ExpenseInput = z.infer<typeof expenseSchemaWithRefinement>;
export type PaymentInput = z.infer<typeof paymentSchema>;

/**
 * Recurring expense template validation schema
 */
export const recurringExpenseSchema = z.object({
  description: z
    .string()
    .min(1, "Description is required")
    .max(200, "Description must be less than 200 characters")
    .transform((val) => val.trim()),
  default_amount: z
    .number()
    .positive("Amount must be greater than 0")
    .max(1000000, "Amount cannot exceed ₹10,00,000"),
  expense_type: z.enum(["shared", "personal"], {
    errorMap: () => ({ message: "Invalid expense type" }),
  }),
  category: z.enum(
    ["rent", "utilities", "groceries", "household_supplies", "shared_meals", "purchases", "other"],
    { errorMap: () => ({ message: "Invalid category" }) }
  ),
  split_type: z.enum(["fifty_fifty", "custom", "one_owes_all"], {
    errorMap: () => ({ message: "Invalid split type" }),
  }),
  custom_split_amount: z.number().min(0).nullable().optional(),
  typically_paid_by: z.string().min(1, "Payer is required"),
  owes_user_id: z.string().min(1).nullable().optional(),
});

export const recurringExpenseSchemaWithRefinement = recurringExpenseSchema.refine(
  (data) => {
    if (data.split_type === "custom" && data.custom_split_amount !== null && data.custom_split_amount !== undefined) {
      return data.custom_split_amount <= data.default_amount;
    }
    return true;
  },
  {
    message: "Custom split amount cannot exceed the default amount",
    path: ["custom_split_amount"],
  }
);

/**
 * Recurring confirmation validation schema (amount only)
 */
export const recurringConfirmSchema = z.object({
  amount: z
    .number()
    .positive("Amount must be greater than 0")
    .max(1000000, "Amount cannot exceed ₹10,00,000"),
});

export type RecurringExpenseInput = z.infer<typeof recurringExpenseSchemaWithRefinement>;
export type RecurringConfirmInput = z.infer<typeof recurringConfirmSchema>;

/**
 * Validates expense data and returns either the validated data or a user-friendly error message
 */
export const validateExpense = (
  data: unknown
): { success: true; data: ExpenseInput } | { success: false; error: string } => {
  try {
    const validated = expenseSchemaWithRefinement.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Return the first error message for user-friendly feedback
      return { success: false, error: error.errors[0]?.message || "Invalid expense data" };
    }
    return { success: false, error: "Invalid expense data" };
  }
};

/**
 * Validates payment data
 */
export const validatePayment = (
  data: unknown
): { success: true; data: PaymentInput } | { success: false; error: string } => {
  try {
    const validated = paymentSchema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0]?.message || "Invalid payment data" };
    }
    return { success: false, error: "Invalid payment data" };
  }
};

/**
 * Validates recurring expense template data
 */
export const validateRecurringExpense = (
  data: unknown
): { success: true; data: RecurringExpenseInput } | { success: false; error: string } => {
  try {
    const validated = recurringExpenseSchemaWithRefinement.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0]?.message || "Invalid recurring expense data" };
    }
    return { success: false, error: "Invalid recurring expense data" };
  }
};

/**
 * Validates recurring confirmation amount
 */
export const validateRecurringConfirm = (
  data: unknown
): { success: true; data: RecurringConfirmInput } | { success: false; error: string } => {
  try {
    const validated = recurringConfirmSchema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0]?.message || "Invalid confirmation data" };
    }
    return { success: false, error: "Invalid confirmation data" };
  }
};
