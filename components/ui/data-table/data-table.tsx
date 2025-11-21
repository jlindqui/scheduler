"use client";

import { useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";
import { ColumnDef, SortState } from "./types";
import { ChevronUp, ChevronDown } from "lucide-react";

interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  rowKey: keyof T;
  onRowClick?: (row: T) => void;
  showSelection?: boolean;
  selectedRows?: Set<string>;
  onSelectionChange?: (selectedRows: Set<string>) => void;
  sortState?: SortState | null;
  onSortChange?: (sortState: SortState) => void;
  isLoading?: boolean;
  emptyMessage?: string;
  emptyDescription?: string;
  className?: string;
}

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  rowKey,
  onRowClick,
  showSelection = false,
  selectedRows = new Set(),
  onSelectionChange,
  sortState,
  onSortChange,
  isLoading = false,
  emptyMessage = "No data found",
  emptyDescription = "Try adjusting your filters",
  className = "",
}: DataTableProps<T>) {
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);

  const handleSort = (column: ColumnDef<T>) => {
    if (!column.sortable || !onSortChange) return;

    const newDirection =
      sortState?.column === column.id && sortState.direction === "asc"
        ? "desc"
        : "asc";

    onSortChange({
      column: column.id,
      direction: newDirection,
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (!onSelectionChange) return;

    if (checked) {
      const allIds = new Set(data.map((row) => String(row[rowKey])));
      onSelectionChange(allIds);
    } else {
      onSelectionChange(new Set());
    }
  };

  const handleSelectRow = (rowId: string, checked: boolean) => {
    if (!onSelectionChange) return;

    const newSelection = new Set(selectedRows);
    if (checked) {
      newSelection.add(rowId);
    } else {
      newSelection.delete(rowId);
    }
    onSelectionChange(newSelection);
  };

  const handleRowClick = (row: T, event: React.MouseEvent) => {
    // Don't trigger row click if clicking on interactive elements
    const target = event.target as HTMLElement;
    if (
      target.closest("button") ||
      target.closest("a") ||
      target.closest("input") ||
      target.closest("select") ||
      target.closest("[role='checkbox']")
    ) {
      return;
    }

    // Don't trigger row click if clicking on the checkbox cell (first column)
    const cell = target.closest('td');
    if (cell && showSelection) {
      const row = cell.parentElement;
      if (row && cell === row.children[0]) {
        return;
      }
    }

    if (onRowClick) {
      onRowClick(row);
    }
  };

  const getValue = (row: T, column: ColumnDef<T>) => {
    if (column.accessor) {
      if (typeof column.accessor === "function") {
        return column.accessor(row);
      }
      return row[column.accessor as keyof T];
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="font-medium">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`overflow-x-auto ${className}`}>
      <Table>
        <TableHeader>
          <TableRow className="border-b bg-gray-50/50">
            {showSelection && (
              <TableHead className="w-12">
                <Checkbox
                  checked={
                    data.length > 0 &&
                    data.every((row) => selectedRows.has(String(row[rowKey])))
                  }
                  onCheckedChange={handleSelectAll}
                  aria-label="Select all"
                />
              </TableHead>
            )}
            {columns.map((column) => (
              <TableHead
                key={column.id}
                className={`${column.className || ""} ${
                  column.sortable
                    ? "cursor-pointer hover:bg-gray-100 transition-colors"
                    : ""
                }`}
                style={{ width: column.width }}
                onClick={() => handleSort(column)}
              >
                <div className="flex items-center gap-2">
                  {typeof column.header === "string" ? (
                    <span>{column.header}</span>
                  ) : (
                    column.header
                  )}
                  {column.sortable && sortState?.column === column.id && (
                    <span className="text-primary">
                      {sortState.direction === "asc" ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </span>
                  )}
                </div>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={columns.length + (showSelection ? 1 : 0)}
                className="text-center py-12"
              >
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <div className="text-lg font-medium">{emptyMessage}</div>
                  <div className="text-sm">{emptyDescription}</div>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            data.map((row, index) => {
              const rowId = String(row[rowKey]);
              const isSelected = selectedRows.has(rowId);
              const isHovered = hoveredRow === rowId;

              return (
                <TableRow
                  key={rowId}
                  className={`
                    ${index % 2 === 0 ? "bg-white" : "bg-gray-50/30"}
                    ${isSelected ? "bg-blue-50/50" : ""}
                    ${isHovered ? "bg-gray-100/50" : ""}
                    ${onRowClick ? "cursor-pointer" : ""}
                    hover:bg-gray-100/50 transition-colors
                  `}
                  onClick={(e) => handleRowClick(row, e)}
                  onMouseEnter={() => setHoveredRow(rowId)}
                  onMouseLeave={() => setHoveredRow(null)}
                >
                  {showSelection && (
                    <TableCell className="w-12 px-4">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) =>
                          handleSelectRow(rowId, checked as boolean)
                        }
                        aria-label={`Select row ${rowId}`}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </TableCell>
                  )}
                  {columns.map((column) => (
                    <TableCell
                      key={column.id}
                      className={column.className || ""}
                    >
                      {column.cell
                        ? column.cell(row)
                        : getValue(row, column)}
                    </TableCell>
                  ))}
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}