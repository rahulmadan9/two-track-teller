import { useState } from "react";
import { useProfiles } from "@/hooks/useProfiles";
import { useExpenses } from "@/hooks/useExpenses";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Plus, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { Database } from "@/integrations/supabase/types";
import { getSafeErrorMessage } from "@/lib/errorHandler";

type ExpenseCategory = Database["public"]["Enums"]["expense_category"];
type SplitType = Database["public"]["Enums"]["split_type"];

const categories: { value: ExpenseCategory; label: string }[] = [
  { value: "rent", label: "Rent" },
  { value: "utilities", label: "Utilities" },
  { value: "groceries", label: "Groceries" },
  { value: "household_supplies", label: "Household Supplies" },
  { value: "shared_meals", label: "Shared Meals" },
  { value: "purchases", label: "Purchases" },
  { value: "other", label: "Other" },
];

// Simple auto-categorization based on keywords
const autoCategorize = (description: string): ExpenseCategory => {
  const lower = description.toLowerCase();
  
  if (lower.includes("rent") || lower.includes("lease")) return "rent";
  if (lower.includes("electric") || lower.includes("gas") || lower.includes("water") || lower.includes("internet") || lower.includes("utility")) return "utilities";
  if (lower.includes("grocery") || lower.includes("food") || lower.includes("market") || lower.includes("produce")) return "groceries";
  if (lower.includes("toilet") || lower.includes("paper") || lower.includes("soap") || lower.includes("cleaning") || lower.includes("supplies")) return "household_supplies";
  if (lower.includes("dinner") || lower.includes("lunch") || lower.includes("restaurant") || lower.includes("takeout") || lower.includes("meal")) return "shared_meals";
  if (lower.includes("amazon") || lower.includes("buy") || lower.includes("purchase") || lower.includes("order")) return "purchases";
  
  return "other";
};

const AddExpenseDialog = () => {
  const { currentProfile, roommate } = useProfiles();
  const { addExpense } = useExpenses();
  const [open, setOpen] = useState(false);
  const [showOptional, setShowOptional] = useState(false);
  const [loading, setLoading] = useState(false);

  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [paidBy, setPaidBy] = useState<"me" | "roommate">("me");
  const [splitType, setSplitType] = useState<SplitType>("fifty_fifty");
  const [customAmount, setCustomAmount] = useState("");
  const [category, setCategory] = useState<ExpenseCategory | "auto">("auto");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");

  const resetForm = () => {
    setAmount("");
    setDescription("");
    setPaidBy("me");
    setSplitType("fifty_fifty");
    setCustomAmount("");
    setCategory("auto");
    setDate(new Date().toISOString().split("T")[0]);
    setNotes("");
    setShowOptional(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProfile) return;

    setLoading(true);

    try {
      const finalCategory = category === "auto" ? autoCategorize(description) : category;
      const paidById = paidBy === "me" ? currentProfile.id : roommate?.id;

      if (!paidById) {
        toast.error("Could not determine payer");
        return;
      }

      await addExpense({
        description,
        amount: parseFloat(amount),
        paid_by: paidById,
        split_type: splitType,
        custom_split_amount: splitType === "custom" ? parseFloat(customAmount) : null,
        category: finalCategory,
        expense_date: date,
        notes: notes || null,
        is_payment: false,
      });

      toast.success("Expense added!");
      resetForm();
      setOpen(false);
    } catch (error: unknown) {
      toast.error(getSafeErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const roommateName = roommate?.display_name || "Roommate";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg" className="gap-2 shadow-lg">
          <Plus className="h-5 w-5" />
          Add Expense
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Expense</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              className="text-lg"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              type="text"
              placeholder="What was it for?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Who paid?</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={paidBy === "me" ? "default" : "outline"}
                className="flex-1"
                onClick={() => setPaidBy("me")}
              >
                Me
              </Button>
              <Button
                type="button"
                variant={paidBy === "roommate" ? "default" : "outline"}
                className="flex-1"
                onClick={() => setPaidBy("roommate")}
                disabled={!roommate}
              >
                {roommateName}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Split type</Label>
            <Select value={splitType} onValueChange={(v) => setSplitType(v as SplitType)}>
              <SelectTrigger>
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
              <Label htmlFor="customAmount">Amount owed by other person</Label>
              <Input
                id="customAmount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                required
              />
            </div>
          )}

          <Collapsible open={showOptional} onOpenChange={setShowOptional}>
            <CollapsibleTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                className="w-full justify-between text-muted-foreground"
              >
                More options
                <ChevronDown className={`h-4 w-4 transition-transform ${showOptional ? "rotate-180" : ""}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={category}
                  onValueChange={(v) => setCategory(v as ExpenseCategory | "auto")}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Auto-detect" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Auto-detect</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Any additional details..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                />
              </div>
            </CollapsibleContent>
          </Collapsible>

          <Button type="submit" className="w-full" disabled={loading || !roommate}>
            {loading ? "Adding..." : "Add Expense"}
          </Button>
          
          {!roommate && (
            <p className="text-xs text-center text-muted-foreground">
              Waiting for your roommate to sign up...
            </p>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddExpenseDialog;
