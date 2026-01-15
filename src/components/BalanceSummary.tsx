import { useExpenses } from "@/hooks/useExpenses";
import { useProfiles } from "@/hooks/useProfiles";

const BalanceSummary = () => {
  const { calculateBalance } = useExpenses();
  const { roommate } = useProfiles();
  const { amount, oweDirection } = calculateBalance();

  const formatAmount = (num: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(num);
  };

  const roommateName = roommate?.display_name || "Roommate";

  return (
    <div className="rounded-xl bg-card border border-border/50 p-6 shadow-sm">
      <p className="text-sm font-medium text-muted-foreground mb-2">Balance</p>
      {oweDirection === "settled" ? (
        <div>
          <p className="text-3xl font-semibold text-foreground">All settled up!</p>
          <p className="text-sm text-muted-foreground mt-1">No outstanding balance</p>
        </div>
      ) : oweDirection === "they_owe" ? (
        <div>
          <p className="text-3xl font-semibold text-positive">{formatAmount(amount)}</p>
          <p className="text-sm text-muted-foreground mt-1">
            <span className="font-medium text-foreground">{roommateName}</span> owes you
          </p>
        </div>
      ) : (
        <div>
          <p className="text-3xl font-semibold text-negative">{formatAmount(amount)}</p>
          <p className="text-sm text-muted-foreground mt-1">
            You owe <span className="font-medium text-foreground">{roommateName}</span>
          </p>
        </div>
      )}
    </div>
  );
};

export default BalanceSummary;
