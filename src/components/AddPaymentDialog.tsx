import { useState } from "react";
import { useProfiles } from "@/hooks/useProfiles";
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
import { Banknote } from "lucide-react";
import { toast } from "sonner";

const AddPaymentDialog = () => {
  const { currentProfile, roommate } = useProfiles();
  const { addExpense, calculateBalance } = useExpenses();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState("");

  const { amount: balanceAmount, oweDirection } = calculateBalance();

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

  const roommateName = roommate?.display_name || "Roommate";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="lg" className="gap-2">
          <Banknote className="h-5 w-5" />
          Record Payment
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
          <DialogDescription>
          {oweDirection === "you_owe"
              ? `You owe ${roommateName} ₹${balanceAmount.toFixed(2)}`
              : oweDirection === "they_owe"
              ? `${roommateName} owes you ₹${balanceAmount.toFixed(2)}`
              : "You're all settled up!"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="payment-amount">Amount you paid back</Label>
            <Input
              id="payment-amount"
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

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Recording..." : "Record Payment"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddPaymentDialog;
