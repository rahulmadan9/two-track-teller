import { useState } from "react";
import { motion } from "framer-motion";
import { useGroupMembers } from "@/hooks/useGroupMembers";
import { useExpenses } from "@/hooks/useExpenses";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Banknote, ArrowRight } from "lucide-react";
import { toast } from "sonner";

const AddPaymentDialog = () => {
  const { currentMember, otherMembers } = useGroupMembers();
  const { addExpense, calculateBalance } = useExpenses();
  const currentProfile = currentMember?.profile;
  const roommate = otherMembers[0]?.profile;
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState("");

  const { amount: balanceAmount, oweDirection } = calculateBalance();

  const formatAmount = (num: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProfile) return;

    setLoading(true);

    try {
      await addExpense({
        description: "Payment",
        amount: parseFloat(amount),
        paid_by: currentProfile.id,
        split_type: "one_owes_all",
        category: "other",
        expense_date: new Date().toISOString().split("T")[0],
        is_payment: true,
      });

      toast.success("Payment recorded!");
      setAmount("");
      setOpen(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to record payment");
    } finally {
      setLoading(false);
    }
  };

  const handlePayFullBalance = () => {
    if (oweDirection === "you_owe") {
      setAmount(balanceAmount.toFixed(2));
    }
  };

  const roommateName = roommate?.display_name || "Roommate";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="lg" className="flex-1 gap-2 h-14 text-base">
          <Banknote className="h-5 w-5" />
          Record Payment
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">Record Payment</DialogTitle>
          <DialogDescription asChild>
            <div className="pt-2">
              {oweDirection === "you_owe" ? (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl bg-negative/10 border border-negative/20 p-4 text-center"
                >
                  <p className="text-2xl font-bold text-negative">
                    {formatAmount(balanceAmount)}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    You owe {roommateName}
                  </p>
                </motion.div>
              ) : oweDirection === "they_owe" ? (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl bg-positive/10 border border-positive/20 p-4 text-center"
                >
                  <p className="text-2xl font-bold text-positive">
                    {formatAmount(balanceAmount)}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {roommateName} owes you
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl bg-muted/50 p-4 text-center"
                >
                  <p className="text-lg font-medium">All settled up! ✨</p>
                </motion.div>
              )}
            </div>
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="payment-amount" className="text-sm font-medium">
              Amount you're paying
            </Label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl text-muted-foreground">
                ₹
              </span>
              <Input
                id="payment-amount"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0.01"
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                className="h-14 text-2xl font-semibold pl-10"
              />
            </div>
          </div>

          {oweDirection === "you_owe" && (
            <Button
              type="button"
              variant="outline"
              onClick={handlePayFullBalance}
              className="w-full gap-2"
            >
              Pay full balance
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}

          <Button type="submit" className="w-full h-12 text-base" disabled={loading}>
            {loading ? "Recording..." : "Record Payment"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddPaymentDialog;
