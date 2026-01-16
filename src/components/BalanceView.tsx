import { motion } from "framer-motion";
import { useExpenses } from "@/hooks/useExpenses";
import { useProfiles } from "@/hooks/useProfiles";
import AddPaymentDialog from "./AddPaymentDialog";

const BalanceView = () => {
  const { calculateBalance } = useExpenses();
  const { roommate } = useProfiles();
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

  const getStatusColor = () => {
    if (oweDirection === "they_owe") return "text-positive";
    if (oweDirection === "you_owe") return "text-negative";
    return "text-muted-foreground";
  };

  const getBackgroundGradient = () => {
    if (oweDirection === "they_owe") return "from-positive/5 to-transparent";
    if (oweDirection === "you_owe") return "from-negative/5 to-transparent";
    return "from-muted/20 to-transparent";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="flex flex-col items-center justify-center px-6 py-12"
    >
      <div
        className={`w-full max-w-sm rounded-3xl bg-gradient-to-b ${getBackgroundGradient()} p-8 text-center`}
      >
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-4"
        >
          {oweDirection === "settled"
            ? "Status"
            : oweDirection === "they_owe"
            ? `${roommateName} owes you`
            : `You owe ${roommateName}`}
        </motion.p>

        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{
            delay: 0.15,
            type: "spring",
            stiffness: 200,
            damping: 15,
          }}
        >
          {oweDirection === "settled" ? (
            <div className="space-y-2">
              <p className="text-5xl font-bold text-foreground">✓</p>
              <p className="text-2xl font-semibold text-foreground">
                All settled!
              </p>
            </div>
          ) : (
            <p className={`text-6xl font-bold tabular-nums ${getStatusColor()}`}>
              {formatAmount(amount)}
            </p>
          )}
        </motion.div>

        {oweDirection !== "settled" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-8"
          >
            <AddPaymentDialog />
          </motion.div>
        )}
      </div>

      {!roommate && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-8 rounded-xl bg-accent/50 border border-accent-foreground/10 p-4 text-center max-w-sm"
        >
          <p className="text-sm text-accent-foreground">
            👋 Waiting for your roommate to sign up. Share this app with them!
          </p>
        </motion.div>
      )}
    </motion.div>
  );
};

export default BalanceView;
