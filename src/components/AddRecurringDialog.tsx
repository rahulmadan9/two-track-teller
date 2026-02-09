import { useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useProfiles } from "@/hooks/useProfiles";
import type { RecurringExpenseInsert } from "@/hooks/useRecurringExpenses";
import type { ExpenseCategory, SplitType, RecurringExpenseType } from "@/integrations/firebase/types";
import { calculateAmount } from "@/lib/amountCalculator";

const categories: { value: ExpenseCategory; label: string }[] = [
  { value: "rent", label: "Rent" },
  { value: "utilities", label: "Utilities" },
  { value: "groceries", label: "Groceries" },
  { value: "household_supplies", label: "Household Supplies" },
  { value: "shared_meals", label: "Shared Meals" },
  { value: "purchases", label: "Purchases" },
  { value: "other", label: "Other" },
];

interface AddRecurringDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (input: RecurringExpenseInsert) => Promise<void>;
}

const AddRecurringDialog = ({
  open,
  onOpenChange,
  onAdd,
}: AddRecurringDialogProps) => {
  const { currentProfile, roommate } = useProfiles();
  const [loading, setLoading] = useState(false);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [expenseType, setExpenseType] = useState<RecurringExpenseType>("shared");
  const [category, setCategory] = useState<ExpenseCategory>("other");
  const [splitType, setSplitType] = useState<SplitType>("fifty_fifty");
  const [customAmount, setCustomAmount] = useState("");
  const [paidBy, setPaidBy] = useState<"me" | "roommate">("me");

  const resetForm = () => {
    setDescription("");
    setAmount("");
    setExpenseType("shared");
    setCategory("other");
    setSplitType("fifty_fifty");
    setCustomAmount("");
    setPaidBy("me");
  };

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

  const handleSubmit = async () => {
    if (!currentProfile) return;

    setLoading(true);
    try {
      const paidById = paidBy === "me" ? currentProfile.id : roommate?.id;
      if (!paidById) {
        toast.error("Could not determine payer");
        return;
      }

      const owesUserId =
        expenseType === "shared"
          ? paidBy === "me"
            ? roommate?.id || null
            : currentProfile.id
          : null;

      await onAdd({
        description,
        defaultAmount: parseFloat(amount),
        category,
        expenseType,
        splitType: expenseType === "personal" ? "one_owes_all" : splitType,
        customSplitAmount:
          splitType === "custom" && expenseType === "shared"
            ? parseFloat(customAmount)
            : null,
        typicallyPaidBy: paidById,
        owesUserId,
      });

      toast.success("Recurring expense added");
      resetForm();
      onOpenChange(false);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Failed to add";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const roommateName = roommate?.display_name || "Roommate";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Recurring Expense</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="rec-description">Description</Label>
            <Input
              id="rec-description"
              placeholder="e.g. Rent, Netflix, Maid"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="h-12"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="rec-amount">Default Amount</Label>
            <Input
              id="rec-amount"
              type="text"
              inputMode="decimal"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              onBlur={handleAmountBlur}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAmountBlur();
                }
              }}
              className="h-12 text-lg"
            />
          </div>

          <div className="space-y-2">
            <Label>Type</Label>
            <div className="flex gap-3">
              <Button
                type="button"
                variant={expenseType === "shared" ? "default" : "outline"}
                className="flex-1 h-12"
                onClick={() => setExpenseType("shared")}
              >
                Shared
              </Button>
              <Button
                type="button"
                variant={expenseType === "personal" ? "default" : "outline"}
                className="flex-1 h-12"
                onClick={() => setExpenseType("personal")}
              >
                Personal
              </Button>
            </div>
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
            <Label>Who typically pays?</Label>
            <div className="flex gap-3">
              <Button
                type="button"
                variant={paidBy === "me" ? "default" : "outline"}
                className="flex-1 h-12"
                onClick={() => setPaidBy("me")}
              >
                Me
              </Button>
              <Button
                type="button"
                variant={paidBy === "roommate" ? "default" : "outline"}
                className="flex-1 h-12"
                onClick={() => setPaidBy("roommate")}
                disabled={!roommate}
              >
                {roommateName}
              </Button>
            </div>
          </div>

          {expenseType === "shared" && (
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
          )}

          {expenseType === "shared" && splitType === "custom" && (
            <div className="space-y-2">
              <Label htmlFor="rec-custom">Amount owed by other person</Label>
              <Input
                id="rec-custom"
                type="text"
                inputMode="decimal"
                placeholder="0.00"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                onBlur={handleCustomAmountBlur}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleCustomAmountBlur();
                  }
                }}
                className="h-12"
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || !description || !amount}
          >
            {loading ? "Adding..." : "Add Recurring"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddRecurringDialog;
