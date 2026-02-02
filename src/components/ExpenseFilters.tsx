import { Search, Filter, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";

type ExpenseCategory = "rent" | "utilities" | "groceries" | "household_supplies" | "shared_meals" | "purchases" | "other";

export interface FilterState {
  search: string;
  category: ExpenseCategory | "all";
  paidBy: "all" | "me" | "roommate";
  type: "all" | "expense" | "payment";
}

interface ExpenseFiltersProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
}

const ExpenseFilters = ({ filters, onFiltersChange }: ExpenseFiltersProps) => {
  const activeFilterCount = [
    filters.category !== "all",
    filters.paidBy !== "all",
    filters.type !== "all",
  ].filter(Boolean).length;

  const clearFilters = () => {
    onFiltersChange({
      ...filters,
      category: "all",
      paidBy: "all",
      type: "all",
    });
  };

  return (
    <div className="flex items-center gap-2">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search expenses..."
          value={filters.search}
          onChange={(e) =>
            onFiltersChange({ ...filters, search: e.target.value })
          }
          className="pl-9 h-10"
        />
        {filters.search && (
          <button
            onClick={() => onFiltersChange({ ...filters, search: "" })}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="icon" className="relative h-10 w-10">
            <Filter className="h-4 w-4" />
            {activeFilterCount > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-[10px] text-primary-foreground flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72" align="end">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Filters</h4>
              {activeFilterCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="h-auto py-1 px-2 text-xs"
                >
                  Clear all
                </Button>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Category</label>
              <Select
                value={filters.category}
                onValueChange={(v) =>
                  onFiltersChange({ ...filters, category: v as ExpenseCategory | "all" })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  <SelectItem value="rent">Rent</SelectItem>
                  <SelectItem value="utilities">Utilities</SelectItem>
                  <SelectItem value="groceries">Groceries</SelectItem>
                  <SelectItem value="household_supplies">Household</SelectItem>
                  <SelectItem value="shared_meals">Meals</SelectItem>
                  <SelectItem value="purchases">Purchases</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Paid by</label>
              <Select
                value={filters.paidBy}
                onValueChange={(v) =>
                  onFiltersChange({ ...filters, paidBy: v as "all" | "me" | "roommate" })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Anyone" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Anyone</SelectItem>
                  <SelectItem value="me">Me</SelectItem>
                  <SelectItem value="roommate">Roommate</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Type</label>
              <Select
                value={filters.type}
                onValueChange={(v) =>
                  onFiltersChange({ ...filters, type: v as "all" | "expense" | "payment" })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="expense">Expenses only</SelectItem>
                  <SelectItem value="payment">Payments only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default ExpenseFilters;
