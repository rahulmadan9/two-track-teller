import { motion } from "framer-motion";
import { Home, List, Plus } from "lucide-react";

interface BottomNavProps {
  activeTab: "balance" | "expenses" | "add";
  onTabChange: (tab: "balance" | "expenses" | "add") => void;
}

const BottomNav = ({ activeTab, onTabChange }: BottomNavProps) => {
  const tabs = [
    { id: "balance" as const, icon: Home, label: "Balance" },
    { id: "add" as const, icon: Plus, label: "Add", isCenter: true },
    { id: "expenses" as const, icon: List, label: "Expenses" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-lg border-t border-border/50 safe-area-pb">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-4">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;

          if (tab.isCenter) {
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className="relative -mt-6"
              >
                <motion.div
                  whileTap={{ scale: 0.92 }}
                  className="w-14 h-14 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/25"
                >
                  <Icon className="h-6 w-6 text-primary-foreground" />
                </motion.div>
              </button>
            );
          }

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className="relative flex flex-col items-center justify-center py-2 px-4 min-w-[72px] touch-manipulation"
            >
              <motion.div
                animate={{
                  scale: isActive ? 1.1 : 1,
                }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
              >
                <Icon
                  className={`h-6 w-6 transition-colors ${
                    isActive ? "text-primary" : "text-muted-foreground"
                  }`}
                />
              </motion.div>
              <span
                className={`text-xs mt-1 font-medium transition-colors ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {tab.label}
              </span>
              {isActive && (
                <motion.div
                  layoutId="activeIndicator"
                  className="absolute -bottom-0 w-1 h-1 rounded-full bg-primary"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
