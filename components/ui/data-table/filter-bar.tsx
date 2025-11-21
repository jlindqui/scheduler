"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, X } from "lucide-react";
import { FilterConfig, FilterState } from "./types";
import { useDebouncedCallback } from "use-debounce";

interface FilterBarProps {
  filters: FilterConfig[];
  currentFilters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  className?: string;
}

export function FilterBar({
  filters,
  currentFilters,
  onFilterChange,
  className = "",
}: FilterBarProps) {
  const [localSearch, setLocalSearch] = useState(currentFilters.search || "");

  const debouncedSearch = useDebouncedCallback((value: string) => {
    onFilterChange({ ...currentFilters, search: value });
  }, 300);

  const handleFilterChange = (filterId: string, value: string) => {
    const newFilters = { ...currentFilters };
    if (value === "all" || value === "") {
      delete newFilters[filterId];
    } else {
      newFilters[filterId] = value;
    }
    onFilterChange(newFilters);
  };

  const handleSearchChange = (value: string) => {
    setLocalSearch(value);
    debouncedSearch(value);
  };

  const hasActiveFilters = () => {
    return Object.keys(currentFilters).some(
      (key) => currentFilters[key] && currentFilters[key] !== ""
    );
  };

  const clearAllFilters = () => {
    setLocalSearch("");
    onFilterChange({});
  };

  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      <div className="flex flex-col lg:flex-row lg:items-center gap-4">
        {filters.map((filter) => {
          if (filter.type === "search") {
            return (
              <div key={filter.id} className="relative flex-1 min-w-[200px] max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={filter.placeholder || "Search..."}
                  value={localSearch}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-9 pr-4 h-10 border-gray-200 focus:border-primary"
                />
              </div>
            );
          }

          if (filter.type === "toggle") {
            const isActive = currentFilters[filter.id] === "true";
            const label = typeof filter.label === "function"
              ? filter.label(isActive)
              : filter.label;
            return (
              <Button
                key={filter.id}
                variant={isActive ? "default" : "outline"}
                size="sm"
                onClick={() =>
                  handleFilterChange(filter.id, isActive ? "" : "true")
                }
                className="h-10"
              >
                {filter.icon && <filter.icon className="h-4 w-4 mr-2" />}
                {label}
              </Button>
            );
          }

          if (filter.type === "select" && filter.options) {
            return (
              <Select
                key={filter.id}
                value={currentFilters[filter.id] || filter.defaultValue || "all"}
                onValueChange={(value) => handleFilterChange(filter.id, value)}
              >
                <SelectTrigger className="w-40 h-10">
                  {filter.icon && <filter.icon className="h-4 w-4 mr-2" />}
                  <SelectValue placeholder={filter.placeholder} />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {filter.options.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            );
          }

          return null;
        })}

        {hasActiveFilters() && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="h-10 text-muted-foreground hover:text-foreground border border-dashed border-muted-foreground/30 hover:border-muted-foreground/50"
          >
            <X className="h-4 w-4 mr-2" />
            Clear filters
          </Button>
        )}
      </div>
    </div>
  );
}