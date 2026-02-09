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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useProfiles } from "@/hooks/useProfiles";
import type { RecurringExpense, RecurringExpenseInsert } from "@/hooks/useRecurringExpenses";
import type { ExpenseCategory, SplitType, RecurringExpenseType } from "@/integrations/firebase/types";

const categories: { value: ExpenseCategory; label: string }[] = [
  { value: "rent", label: "Rent" },
  { value: "utilities", label: "Utilities" },
  { value: "groceries", label: "Groceries" },
  { value: "household_supplies", label: "Household Supplies" },
  { value: "shared_meals", label: "Shared Meals" },
  { value: "purchases", label: "Purchases" },
  { value: "other", label: "Other" },
];

interface EditRecurringDialogProps {
  item: RecurringExpense | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (id: string, input: Partial<RecurringExpenseInsert>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const EditRecurringDialog = ({
  item,
  open,
  onOpenChange,
  onUpdate,
  onDelete,
}: EditRecurringDialogProps) => {
  const { currentProfile, roommate } = useProfiles();
  const [loading, setLoading] = useState(false);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [expenseType, setExpenseType] = useState<RecurringExpenseType>("shared");
  const [category, setCategory] = useState<ExpenseCategory>("other");
  const [splitType, setSplitType] = useState<SplitType>("fifty_fifty");
  const [customAmount, setCustomAmount] = useState("");
  const [paidBy, setPaidBy] = useState<"me" | "roommate">("me");

  useEffect(() => {
    if (item) {
      setDescription(item.description);
      setAmount(String(item.defaultAmount));
      setExpenseType(item.expenseType);
      setCategory(item.category);
      setSplitType(item.splitType);
      setCustomAmount(item.customSplitAmount ? String(item.customSplitAmount) : "");
      setPaidBy(item.typicallyPaidBy === currentProfile?.id ? "me" : "roommate");
    }
  }, [item, currentProfile?.id]);

  const handleSave = async () => {
    if (!item || !currentProfile) return;

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

      await onUpdate(item.id, {
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

      toast.success("Recurring expense updated");
      onOpenChange(false);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Failed to update";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!item) return;
    setLoading(true);
    try {
      await onDelete(item.id);
      toast.success("Recurring expense removed");
      onOpenChange(false);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Failed to delete";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const roommateName = roommate?.display_name || "Roommate";

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Recurring Expense</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="edit-rec-description">Description</Label>
            <Input
              id="edit-rec-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="h-12"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-rec-amount">Default Amount</Label>
            <Input
              id="edit-rec-amount"
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
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
              <Label htmlFor="edit-rec-custom">Amount owed by other person</Label>
              <Input
                id="edit-rec-custom"
                type="number"
                step="0.01"
                min="0"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                className="h-12"
              />
            </div>
          )}
        </div>

        <DialogFooter className="flex gap-2">
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={loading}
            className="mr-auto"
          >
            Delete
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading || !description || !amount}>
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditRecurringDialog;
