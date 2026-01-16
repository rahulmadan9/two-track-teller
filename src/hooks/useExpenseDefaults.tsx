import { useState, useEffect, useCallback } from "react";
import { Database } from "@/integrations/supabase/types";

type ExpenseCategory = Database["public"]["Enums"]["expense_category"];
type SplitType = Database["public"]["Enums"]["split_type"];

interface ExpenseDefaults {
  lastSplitType: SplitType;
  lastExpense: {
    description: string;
    amount: number;
    category: ExpenseCategory;
    splitType: SplitType;
  } | null;
  descriptionHistory: { description: string; amount: number; category: ExpenseCategory }[];
  categoryCorrections: Record<string, ExpenseCategory>;
}

const STORAGE_KEY = "splitease_expense_defaults";

const defaultValues: ExpenseDefaults = {
  lastSplitType: "fifty_fifty",
  lastExpense: null,
  descriptionHistory: [],
  categoryCorrections: {},
};

// Keyword-based auto-categorization with common stores/brands
const keywordCategories: Record<string, ExpenseCategory> = {
  // Rent
  "rent": "rent",
  "lease": "rent",
  "housing": "rent",
  
  // Utilities
  "electric": "utilities",
  "electricity": "utilities",
  "gas": "utilities",
  "water": "utilities",
  "internet": "utilities",
  "wifi": "utilities",
  "utility": "utilities",
  "pg&e": "utilities",
  "pge": "utilities",
  "comcast": "utilities",
  "att": "utilities",
  "verizon": "utilities",
  "spectrum": "utilities",
  "power": "utilities",
  "bill": "utilities",
  "airtel": "utilities",
  "jio": "utilities",
  "bsnl": "utilities",
  
  // Groceries - Stores
  "costco": "groceries",
  "walmart": "groceries",
  "target": "groceries",
  "trader joe": "groceries",
  "whole foods": "groceries",
  "safeway": "groceries",
  "kroger": "groceries",
  "aldi": "groceries",
  "grocery": "groceries",
  "groceries": "groceries",
  "market": "groceries",
  "produce": "groceries",
  "vegetables": "groceries",
  "fruits": "groceries",
  "dmart": "groceries",
  "bigbasket": "groceries",
  "reliance": "groceries",
  "more": "groceries",
  "nature's basket": "groceries",
  
  // Household supplies
  "toilet": "household_supplies",
  "paper towel": "household_supplies",
  "soap": "household_supplies",
  "cleaning": "household_supplies",
  "supplies": "household_supplies",
  "detergent": "household_supplies",
  "shampoo": "household_supplies",
  "dishwasher": "household_supplies",
  "trash bags": "household_supplies",
  "home depot": "household_supplies",
  "ikea": "household_supplies",
  
  // Shared meals
  "dinner": "shared_meals",
  "lunch": "shared_meals",
  "breakfast": "shared_meals",
  "restaurant": "shared_meals",
  "takeout": "shared_meals",
  "delivery": "shared_meals",
  "uber eats": "shared_meals",
  "doordash": "shared_meals",
  "grubhub": "shared_meals",
  "pizza": "shared_meals",
  "meal": "shared_meals",
  "food": "shared_meals",
  "swiggy": "shared_meals",
  "zomato": "shared_meals",
  "dominos": "shared_meals",
  
  // Purchases
  "amazon": "purchases",
  "flipkart": "purchases",
  "buy": "purchases",
  "purchase": "purchases",
  "order": "purchases",
  "online": "purchases",
  "electronics": "purchases",
};

export const useExpenseDefaults = () => {
  const [defaults, setDefaults] = useState<ExpenseDefaults>(defaultValues);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setDefaults({ ...defaultValues, ...parsed });
      }
    } catch (e) {
      console.error("Error loading expense defaults:", e);
    }
  }, []);

  // Save to localStorage whenever defaults change
  const saveDefaults = useCallback((newDefaults: ExpenseDefaults) => {
    setDefaults(newDefaults);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newDefaults));
    } catch (e) {
      console.error("Error saving expense defaults:", e);
    }
  }, []);

  // Remember split type
  const rememberSplitType = useCallback((splitType: SplitType) => {
    saveDefaults({ ...defaults, lastSplitType: splitType });
  }, [defaults, saveDefaults]);

  // Remember last expense for "Repeat Last" feature
  const rememberLastExpense = useCallback((expense: {
    description: string;
    amount: number;
    category: ExpenseCategory;
    splitType: SplitType;
  }) => {
    const newHistory = [
      { description: expense.description, amount: expense.amount, category: expense.category },
      ...defaults.descriptionHistory.filter(h => 
        h.description.toLowerCase() !== expense.description.toLowerCase()
      ),
    ].slice(0, 20); // Keep last 20

    saveDefaults({
      ...defaults,
      lastSplitType: expense.splitType,
      lastExpense: expense,
      descriptionHistory: newHistory,
    });
  }, [defaults, saveDefaults]);

  // Learn from category corrections
  const learnCategoryCorrection = useCallback((description: string, category: ExpenseCategory) => {
    const key = description.toLowerCase().trim();
    const newCorrections = { ...defaults.categoryCorrections, [key]: category };
    saveDefaults({ ...defaults, categoryCorrections: newCorrections });
  }, [defaults, saveDefaults]);

  // Auto-categorize based on keywords and learned corrections
  const autoCategorize = useCallback((description: string): ExpenseCategory => {
    const lower = description.toLowerCase().trim();
    
    // First check learned corrections (user's own data)
    if (defaults.categoryCorrections[lower]) {
      return defaults.categoryCorrections[lower];
    }
    
    // Check historical expenses
    const historical = defaults.descriptionHistory.find(
      h => h.description.toLowerCase() === lower
    );
    if (historical) {
      return historical.category;
    }
    
    // Check keyword matches
    for (const [keyword, category] of Object.entries(keywordCategories)) {
      if (lower.includes(keyword)) {
        return category;
      }
    }
    
    return "other";
  }, [defaults]);

  // Get suggestions based on partial description
  const getSuggestions = useCallback((description: string): { 
    description: string; 
    amount: number; 
    category: ExpenseCategory;
  }[] => {
    if (!description || description.length < 2) return [];
    
    const lower = description.toLowerCase();
    return defaults.descriptionHistory
      .filter(h => h.description.toLowerCase().includes(lower))
      .slice(0, 5);
  }, [defaults]);

  return {
    lastSplitType: defaults.lastSplitType,
    lastExpense: defaults.lastExpense,
    rememberSplitType,
    rememberLastExpense,
    learnCategoryCorrection,
    autoCategorize,
    getSuggestions,
  };
};
