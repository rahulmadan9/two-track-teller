import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/integrations/firebase/config";
import { toast } from "sonner";
import { Expense } from "@/hooks/useExpenses";
import { validateExpense, validatePayment } from "@/lib/validation";
import { calculateAmount } from "@/lib/amountCalculator";

type ExpenseCategory = "rent" | "utilities" | "groceries" | "household_supplies" | "shared_meals" | "purchases" | "other";
type SplitType = "fifty_fifty" | "custom" | "one_owes_all";

interface EditExpenseDialogProps {
  expense: Expense | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const categories: { value: ExpenseCategory; label: string }[] = [
  { value: "rent", label: "Rent" },
  { value: "utilities", label: "Utilities" },
  { value: "groceries", label: "Groceries" },
  { value: "household_supplies", label: "Household Supplies" },
  { value: "shared_meals", label: "Shared Meals" },
  { value: "purchases", label: "Purchases" },
  { value: "other", label: "Other" },
];

const EditExpenseDialog = ({
  expense,
  open,
  onOpenChange,
  onSuccess,
}: EditExpenseDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<ExpenseCategory>("other");
  const [splitType, setSplitType] = useState<SplitType>("fifty_fifty");
  const [customAmount, setCustomAmount] = useState("");
  const [date, setDate] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (expense) {
      setAmount(String(expense.amount));
      setDescription(expense.description);
      setCategory(expense.category);
      setSplitType(expense.split_type);
      setCustomAmount(expense.custom_split_amount ? String(expense.custom_split_amount) : "");
      setDate(expense.expense_date);
      setNotes(expense.notes || "");
    }
  }, [expense]);

  const isPayment = expense?.is_payment === true;

  const handleAmountBlur = () => {
    const calculated = calculateAmount(amount);
    if (calculated !== amount) {
      setAmount(calculated);
    }
  };

  const handleCustomAmountBlur = () => {
    const calculated = calculateAmount(customAmount);
    if (calculated !== customAmount) {
      setCustomAmount(calculated);
    }
  };

  const handleSave = async () => {
    if (!expense) return;
    setLoading(true);

    try {
      const parsedAmount = parseFloat(amount);

      if (isPayment) {
        // Payments: only allow amount and date changes, validate as payment
        const result = validatePayment({
          description: expense.description,
          amount: parsedAmount,
          paid_by: expense.paid_by,
          split_type: "one_owes_all",
          category: "other",
          expense_date: date,
          is_payment: true,
        });
        if (result.success === false) {
          toast.error(result.error);
          return;
        }

        await updateDoc(doc(db, "expenses", expense.id), {
          amount: parsedAmount,
          expenseDate: date,
          updatedAt: serverTimestamp(),
        });
      } else {
        // Regular expenses: validate all fields
        const result = validateExpense({
          description,
          amount: parsedAmount,
          paid_by: expense.paid_by,
          split_type: splitType,
          custom_split_amount: splitType === "custom" ? parseFloat(customAmount) : null,
          category,
          expense_date: date,
          notes: notes || null,
          is_payment: false,
          owes_user_id: expense.owes_user_id,
        });
        if (result.success === false) {
          toast.error(result.error);
          return;
        }

        await updateDoc(doc(db, "expenses", expense.id), {
          amount: parsedAmount,
          description,
          category,
          splitType: splitType,
          customSplitAmount: splitType === "custom" ? parseFloat(customAmount) : null,
          expenseDate: date,
          notes: notes || null,
          updatedAt: serverTimestamp(),
        });
      }

      toast.success(isPayment ? "Payment updated" : "Expense updated");
      onSuccess();
      onOpenChange(false);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to update expense";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isPayment ? "Edit Payment" : "Edit Expense"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="edit-amount">Amount</Label>
            <Input
              id="edit-amount"
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              onBlur={handleAmountBlur}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleAmountBlur();
                }
              }}
              className="h-12"
            />
          </div>

          {!isPayment && (
            <>
              <div className="space-y-2">
                <Label htmlFor="edit-description">Description</Label>
                <Input
                  id="edit-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="h-12"
                />
              </div>

              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={category} onValueChange={(v) => setCategory(v as ExpenseCategory)}>
                  <SelectTrigger className="h-12">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Split Type</Label>
                <Select value={splitType} onValueChange={(v) => setSplitType(v as SplitType)}>
                  <SelectTrigger className="h-12">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fifty_fifty">50/50</SelectItem>
                    <SelectItem value="custom">Custom amount</SelectItem>
                    <SelectItem value="one_owes_all">One owes all</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {splitType === "custom" && (
                <div className="space-y-2">
                  <Label htmlFor="edit-custom">Custom Split Amount</Label>
                  <Input
                    id="edit-custom"
                    type="text"
                    inputMode="decimal"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    onBlur={handleCustomAmountBlur}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleCustomAmountBlur();
                      }
                    }}
                    className="h-12"
                  />
                </div>
              )}
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="edit-date">Date</Label>
            <Input
              id="edit-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-12"
            />
          </div>

          {!isPayment && (
            <div className="space-y-2">
              <Label htmlFor="edit-notes">Notes</Label>
              <Textarea
                id="edit-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditExpenseDialog;
