import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useProfiles } from "@/hooks/useProfiles";
import { useExpenses } from "@/hooks/useExpenses";
import { useSmartDefaults } from "@/hooks/useSmartDefaults";
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, RotateCcw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Database } from "@/integrations/supabase/types";

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

interface AddExpenseFormProps {
  onSuccess?: () => void;
}

const AddExpenseForm = ({ onSuccess }: AddExpenseFormProps) => {
  const { currentProfile, roommate } = useProfiles();
  const { addExpense } = useExpenses();
  const {
    lastSplitType,
    setLastSplitType,
    lastExpense,
    recordExpense,
    recordCategoryCorrection,
    smartCategorize,
    getSuggestion,
  } = useSmartDefaults();

  const [showOptional, setShowOptional] = useState(false);
  const [loading, setLoading] = useState(false);
  const [suggestion, setSuggestion] = useState<{
    description: string;
    amount: number;
  } | null>(null);

  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [paidBy, setPaidBy] = useState<"me" | "roommate">("me");
  const [splitType, setSplitType] = useState<SplitType>(lastSplitType);
  const [customAmount, setCustomAmount] = useState("");
  const [category, setCategory] = useState<ExpenseCategory | "auto">("auto");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");

  // Update split type when lastSplitType changes (initial load)
  useEffect(() => {
    setSplitType(lastSplitType);
  }, [lastSplitType]);

  // Smart suggestions based on description
  useEffect(() => {
    const match = getSuggestion(description);
    if (match && match.description.toLowerCase() !== description.toLowerCase()) {
      setSuggestion({ description: match.description, amount: match.amount });
    } else {
      setSuggestion(null);
    }
  }, [description, getSuggestion]);

  const resetForm = () => {
    setAmount("");
    setDescription("");
    setPaidBy("me");
    setCustomAmount("");
    setCategory("auto");
    setDate(new Date().toISOString().split("T")[0]);
    setNotes("");
    setShowOptional(false);
    setSuggestion(null);
  };

  const applySuggestion = () => {
    if (suggestion) {
      setDescription(suggestion.description);
      setAmount(suggestion.amount.toString());
      setSuggestion(null);
    }
  };

  const repeatLastExpense = () => {
    if (lastExpense) {
      setDescription(lastExpense.description);
      setAmount(lastExpense.amount.toString());
      setCategory(lastExpense.category);
      setSplitType(lastExpense.splitType);
      toast.success("Last expense loaded");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProfile) return;

    setLoading(true);

    try {
      const finalCategory =
        category === "auto" ? smartCategorize(description) : category;
      const paidById = paidBy === "me" ? currentProfile.id : roommate?.id;
      // The person who owes is the one who didn't pay
      const owesUserId = paidBy === "me" ? roommate?.id : currentProfile.id;

      if (!paidById || !owesUserId) {
        toast.error("Could not determine payer or ower");
        return;
      }

      await addExpense({
        description,
        amount: parseFloat(amount),
        paid_by: paidById,
        owes_user_id: owesUserId,
        split_type: splitType,
        custom_split_amount:
          splitType === "custom" ? parseFloat(customAmount) : null,
        category: finalCategory,
        expense_date: date,
        notes: notes || null,
        is_payment: false,
      });

      // Save split type preference
      setLastSplitType(splitType);

      // Record for smart suggestions
      recordExpense({
        description,
        amount: parseFloat(amount),
        category: finalCategory,
        splitType,
      });

      // If user manually selected category, record correction
      if (category !== "auto") {
        recordCategoryCorrection(description, category);
      }

      toast.success("Expense added!");
      resetForm();
      onSuccess?.();
    } catch (error: any) {
      toast.error(error.message || "Failed to add expense");
    } finally {
      setLoading(false);
    }
  };

  const roommateName = roommate?.display_name || "Roommate";
  const suggestedCategory = smartCategorize(description);

  return (
    <motion.form
      onSubmit={handleSubmit}
      className="space-y-5 p-1"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* Repeat Last Expense Button */}
      {lastExpense && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-4"
        >
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={repeatLastExpense}
            className="w-full gap-2 text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="h-4 w-4" />
            Repeat: {lastExpense.description} (₹{lastExpense.amount})
          </Button>
        </motion.div>
      )}

      <div className="space-y-2">
        <Label htmlFor="amount" className="text-base">
          Amount
        </Label>
        <Input
          id="amount"
          type="number"
          step="0.01"
          min="0.01"
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
          className="text-xl h-14 font-medium"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description" className="text-base">
          Description
        </Label>
        <div className="relative">
          <Input
            id="description"
            type="text"
            placeholder="What was it for?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            className="h-12"
          />
          {/* Smart suggestion */}
          <AnimatePresence>
            {suggestion && (
              <motion.button
                type="button"
                onClick={applySuggestion}
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="absolute left-0 right-0 top-full mt-1 flex items-center gap-2 rounded-lg border border-border bg-accent/50 px-3 py-2 text-left text-sm hover:bg-accent"
              >
                <Sparkles className="h-3 w-3 text-primary" />
                <span className="text-muted-foreground">
                  {suggestion.description}
                </span>
                <span className="ml-auto font-medium">₹{suggestion.amount}</span>
              </motion.button>
            )}
          </AnimatePresence>
        </div>
        {/* Category hint */}
        {description && category === "auto" && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-xs text-muted-foreground flex items-center gap-1"
          >
            <Sparkles className="h-3 w-3" />
            Will be categorized as:{" "}
            <span className="font-medium capitalize">
              {suggestedCategory.replace("_", " ")}
            </span>
          </motion.p>
        )}
      </div>

      <div className="space-y-2">
        <Label className="text-base">Who paid?</Label>
        <div className="flex gap-3">
          <Button
            type="button"
            variant={paidBy === "me" ? "default" : "outline"}
            className="flex-1 h-12 text-base"
            onClick={() => setPaidBy("me")}
          >
            Me
          </Button>
          <Button
            type="button"
            variant={paidBy === "roommate" ? "default" : "outline"}
            className="flex-1 h-12 text-base"
            onClick={() => setPaidBy("roommate")}
            disabled={!roommate}
          >
            {roommateName}
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-base">Split type</Label>
        <Select
          value={splitType}
          onValueChange={(v) => setSplitType(v as SplitType)}
        >
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

      <AnimatePresence>
        {splitType === "custom" && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2 overflow-hidden"
          >
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
              className="h-12"
            />
          </motion.div>
        )}
      </AnimatePresence>

      <Collapsible open={showOptional} onOpenChange={setShowOptional}>
        <CollapsibleTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            className="w-full justify-between text-muted-foreground h-12"
          >
            More options
            <ChevronDown
              className={`h-4 w-4 transition-transform ${
                showOptional ? "rotate-180" : ""
              }`}
            />
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
              className="h-12"
            />
          </div>

          <div className="space-y-2">
            <Label>Category</Label>
            <Select
              value={category}
              onValueChange={(v) => setCategory(v as ExpenseCategory | "auto")}
            >
              <SelectTrigger className="h-12">
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

      <Button
        type="submit"
        className="w-full h-14 text-base font-medium"
        disabled={loading || !roommate}
      >
        {loading ? "Adding..." : "Add Expense"}
      </Button>

      {!roommate && (
        <p className="text-xs text-center text-muted-foreground">
          Waiting for your roommate to sign up...
        </p>
      )}
    </motion.form>
  );
};

export default AddExpenseForm;
