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
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Expense } from "@/hooks/useExpenses";
import { Database } from "@/integrations/supabase/types";

type ExpenseCategory = Database["public"]["Enums"]["expense_category"];
type SplitType = Database["public"]["Enums"]["split_type"];

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

  const handleSave = async () => {
    if (!expense) return;
    setLoading(true);

    try {
      const { error } = await supabase
        .from("expenses")
        .update({
          amount: parseFloat(amount),
          description,
          category,
          split_type: splitType,
          custom_split_amount: splitType === "custom" ? parseFloat(customAmount) : null,
          expense_date: date,
          notes: notes || null,
        })
        .eq("id", expense.id);

      if (error) throw error;

      toast.success("Expense updated");
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to update expense");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Expense</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="edit-amount">Amount</Label>
            <Input
              id="edit-amount"
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="h-12"
            />
          </div>

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
                type="number"
                step="0.01"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                className="h-12"
              />
            </div>
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

          <div className="space-y-2">
            <Label htmlFor="edit-notes">Notes</Label>
            <Textarea
              id="edit-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
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
