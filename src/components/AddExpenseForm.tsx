import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGroupMembers } from "@/hooks/useGroupMembers";
import { useExpenses } from "@/hooks/useExpenses";
import { useExpenseDefaults } from "@/hooks/useExpenseDefaults";
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
import { ChevronDown, RotateCcw, X } from "lucide-react";
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
  onClose: () => void;
  isOpen: boolean;
}

const AddExpenseForm = ({ onClose, isOpen }: AddExpenseFormProps) => {
  const { currentMember, otherMembers } = useGroupMembers();
  const { addExpense } = useExpenses();
  const {
    lastSplitType,
    lastExpense,
    rememberLastExpense,
    autoCategorize,
    getSuggestions,
    learnCategoryCorrection,
  } = useExpenseDefaults();

  const currentProfile = currentMember?.profile;
  const roommate = otherMembers[0]?.profile;

  const [showOptional, setShowOptional] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [paidBy, setPaidBy] = useState<"me" | "roommate">("me");
  const [splitType, setSplitType] = useState<SplitType>(lastSplitType);
  const [customAmount, setCustomAmount] = useState("");
  const [category, setCategory] = useState<ExpenseCategory | "auto">("auto");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [manualCategoryOverride, setManualCategoryOverride] = useState(false);

  const amountInputRef = useRef<HTMLInputElement>(null);

  const suggestions = getSuggestions(description);
  const detectedCategory = category === "auto" ? autoCategorize(description) : category;

  // Focus amount input when form opens
  useEffect(() => {
    if (isOpen && amountInputRef.current) {
      setTimeout(() => amountInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Update split type from defaults
  useEffect(() => {
    setSplitType(lastSplitType);
  }, [lastSplitType]);

  const resetForm = () => {
    setAmount("");
    setDescription("");
    setPaidBy("me");
    setCustomAmount("");
    setCategory("auto");
    setDate(new Date().toISOString().split("T")[0]);
    setNotes("");
    setShowOptional(false);
    setManualCategoryOverride(false);
  };

  const handleRepeatLast = () => {
    if (lastExpense) {
      setDescription(lastExpense.description);
      setAmount(lastExpense.amount.toString());
      setCategory(lastExpense.category);
      setSplitType(lastExpense.splitType);
      setManualCategoryOverride(true);
    }
  };

  const handleSuggestionClick = (suggestion: { description: string; amount: number; category: ExpenseCategory }) => {
    setDescription(suggestion.description);
    setAmount(suggestion.amount.toString());
    setCategory(suggestion.category);
    setManualCategoryOverride(true);
    setShowSuggestions(false);
  };

  const handleCategoryChange = (value: string) => {
    setCategory(value as ExpenseCategory | "auto");
    if (value !== "auto" && description) {
      learnCategoryCorrection(description, value as ExpenseCategory);
      setManualCategoryOverride(true);
    }
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

      // Remember this expense for smart defaults
      rememberLastExpense({
        description,
        amount: parseFloat(amount),
        category: finalCategory,
        splitType,
      });

      toast.success("Expense added!");
      resetForm();
      onClose();
    } catch (error: any) {
      toast.error(error.message || "Failed to add expense");
    } finally {
      setLoading(false);
    }
  };

  const roommateName = roommate?.display_name || "Roommate";

  return (
    <motion.div
      initial={{ opacity: 0, y: 100 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 100 }}
      transition={{ type: "spring", damping: 25, stiffness: 300 }}
      className="fixed inset-0 z-50 bg-background"
    >
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border/50">
          <button
            onClick={onClose}
            className="p-2 -ml-2 touch-manipulation"
          >
            <X className="h-6 w-6 text-muted-foreground" />
          </button>
          <h1 className="text-lg font-semibold">Add Expense</h1>
          <div className="w-10" />
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-auto p-4 space-y-5">
          {/* Repeat Last Button */}
          {lastExpense && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <Button
                type="button"
                variant="outline"
                onClick={handleRepeatLast}
                className="w-full gap-2 h-12 text-base"
              >
                <RotateCcw className="h-4 w-4" />
                Repeat: {lastExpense.description} (₹{lastExpense.amount})
              </Button>
            </motion.div>
          )}

          {/* Amount - Large prominent input */}
          <div className="space-y-2">
            <Label htmlFor="amount" className="text-sm font-medium">
              Amount
            </Label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl text-muted-foreground">
                ₹
              </span>
              <Input
                ref={amountInputRef}
                id="amount"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0.01"
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                className="h-16 text-3xl font-semibold pl-10 pr-4"
              />
            </div>
          </div>

          {/* Description with suggestions */}
          <div className="space-y-2 relative">
            <Label htmlFor="description" className="text-sm font-medium">
              What was it for?
            </Label>
            <Input
              id="description"
              type="text"
              placeholder="e.g., Groceries, Rent, Dinner..."
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                setShowSuggestions(e.target.value.length >= 2);
                if (!manualCategoryOverride) {
                  setCategory("auto");
                }
              }}
              onFocus={() => setShowSuggestions(description.length >= 2)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              required
              className="h-12 text-base"
            />

            {/* Suggestions dropdown */}
            <AnimatePresence>
              {showSuggestions && suggestions.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-10 overflow-hidden"
                >
                  {suggestions.map((s, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleSuggestionClick(s)}
                      className="w-full px-4 py-3 text-left hover:bg-muted/50 flex justify-between items-center touch-manipulation"
                    >
                      <span className="font-medium">{s.description}</span>
                      <span className="text-muted-foreground">₹{s.amount}</span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Category badge - quick tap to change */}
            {description && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-2 mt-2"
              >
                <span className="text-xs text-muted-foreground">Category:</span>
                <Select value={category} onValueChange={handleCategoryChange}>
                  <SelectTrigger className="h-8 w-auto px-3 text-xs">
                    <SelectValue>
                      {category === "auto"
                        ? categories.find((c) => c.value === detectedCategory)?.label || "Auto"
                        : categories.find((c) => c.value === category)?.label}
                    </SelectValue>
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
              </motion.div>
            )}
          </div>

          {/* Who paid - Large tap targets */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Who paid?</Label>
            <div className="grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant={paidBy === "me" ? "default" : "outline"}
                className="h-14 text-base font-medium"
                onClick={() => setPaidBy("me")}
              >
                Me
              </Button>
              <Button
                type="button"
                variant={paidBy === "roommate" ? "default" : "outline"}
                className="h-14 text-base font-medium"
                onClick={() => setPaidBy("roommate")}
                disabled={!roommate}
              >
                {roommateName}
              </Button>
            </div>
          </div>

          {/* Split type - Large tap targets */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Split</Label>
            <div className="grid grid-cols-3 gap-2">
              <Button
                type="button"
                variant={splitType === "fifty_fifty" ? "default" : "outline"}
                className="h-12 text-sm font-medium"
                onClick={() => setSplitType("fifty_fifty")}
              >
                50/50
              </Button>
              <Button
                type="button"
                variant={splitType === "one_owes_all" ? "default" : "outline"}
                className="h-12 text-sm font-medium"
                onClick={() => setSplitType("one_owes_all")}
              >
                Full
              </Button>
              <Button
                type="button"
                variant={splitType === "custom" ? "default" : "outline"}
                className="h-12 text-sm font-medium"
                onClick={() => setSplitType("custom")}
              >
                Custom
              </Button>
            </div>
          </div>

          {splitType === "custom" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-2"
            >
              <Label htmlFor="customAmount" className="text-sm font-medium">
                Amount owed by {paidBy === "me" ? roommateName : "you"}
              </Label>
              <Input
                id="customAmount"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                required
                className="h-12 text-base"
              />
            </motion.div>
          )}

          {/* Optional fields */}
          <Collapsible open={showOptional} onOpenChange={setShowOptional}>
            <CollapsibleTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                className="w-full justify-between text-muted-foreground h-12"
              >
                More options
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${showOptional ? "rotate-180" : ""}`}
                />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="date" className="text-sm font-medium">
                  Date
                </Label>
                <Input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="h-12"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes" className="text-sm font-medium">
                  Notes
                </Label>
                <Textarea
                  id="notes"
                  placeholder="Any additional details..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="text-base"
                />
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Spacer for bottom button */}
          <div className="h-24" />
        </form>

        {/* Submit button - Fixed at bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-background border-t border-border/50 safe-area-pb">
          <Button
            type="submit"
            onClick={handleSubmit}
            className="w-full h-14 text-lg font-semibold"
            disabled={loading || !roommate || !amount || !description}
          >
            {loading ? "Adding..." : "Add Expense"}
          </Button>
          {!roommate && (
            <p className="text-xs text-center text-muted-foreground mt-2">
              Waiting for your roommate to join...
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default AddExpenseForm;
