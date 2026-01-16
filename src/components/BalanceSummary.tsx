import { motion } from "framer-motion";
import { useExpenses } from "@/hooks/useExpenses";
import { useGroupMembers } from "@/hooks/useGroupMembers";

const BalanceSummary = () => {
  const { calculateBalance } = useExpenses();
  const { otherMembers } = useGroupMembers();
  const roommate = otherMembers[0]?.profile;
  const { amount, oweDirection } = calculateBalance();

  const formatAmount = (num: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  };

  const roommateName = roommate?.display_name || "Roommate";

  const getBalanceColor = () => {
    if (oweDirection === "they_owe") return "text-positive";
    if (oweDirection === "you_owe") return "text-negative";
    return "text-muted-foreground";
  };

  const getBackgroundColor = () => {
    if (oweDirection === "they_owe") return "bg-positive/5 border-positive/20";
    if (oweDirection === "you_owe") return "bg-negative/5 border-negative/20";
    return "bg-muted/30 border-border/50";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={`rounded-2xl border p-8 ${getBackgroundColor()}`}
    >
      <p className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wide">
        Net Balance
      </p>
      {oweDirection === "settled" ? (
        <div>
          <motion.p
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            className="text-4xl font-bold text-foreground"
          >
            All settled! ✨
          </motion.p>
          <p className="text-base text-muted-foreground mt-2">
            No outstanding balance
          </p>
        </div>
      ) : oweDirection === "they_owe" ? (
        <div>
          <motion.p
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            className={`text-5xl font-bold ${getBalanceColor()} tabular-nums`}
          >
            +{formatAmount(amount)}
          </motion.p>
          <p className="text-base text-muted-foreground mt-2">
            <span className="font-medium text-foreground">{roommateName}</span> owes you
          </p>
        </div>
      ) : (
        <div>
          <motion.p
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            className={`text-5xl font-bold ${getBalanceColor()} tabular-nums`}
          >
            -{formatAmount(amount)}
          </motion.p>
          <p className="text-base text-muted-foreground mt-2">
            You owe <span className="font-medium text-foreground">{roommateName}</span>
          </p>
        </div>
      )}
    </motion.div>
  );
};

export default BalanceSummary;
