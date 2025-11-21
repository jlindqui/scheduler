import { ReactNode } from "react";

export interface FilterOption {
  label: string;
  value: string;
  icon?: React.ComponentType<{ className?: string }>;
}

export interface FilterConfig {
  id: string;
  label: string | ((isActive: boolean) => string);
  type: "select" | "toggle" | "search";
  options?: FilterOption[];
  placeholder?: string;
  icon?: React.ComponentType<{ className?: string }>;
  defaultValue?: string;
}

export interface ColumnDef<T> {
  id: string;
  header: string | ReactNode;
  accessor?: keyof T | ((row: T) => any);
  cell?: (row: T) => ReactNode;
  sortable?: boolean;
  width?: string;
  className?: string;
}

export interface BulkAction<T> {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  action: (selectedIds: string[]) => void | Promise<void>;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost";
  requireConfirmation?: boolean;
  confirmationTitle?: string;
  confirmationDescription?: string;
  disabled?: (selectedIds: string[]) => boolean;
}

export interface TableConfig<T> {
  data: T[];
  columns: ColumnDef<T>[];
  filters?: FilterConfig[];
  bulkActions?: BulkAction<T>[];
  pageSize?: number;
  pageSizeOptions?: number[];
  showSelection?: boolean;
  showPagination?: boolean;
  onRowClick?: (row: T) => void;
  rowKey: keyof T;
  emptyMessage?: string;
  emptyDescription?: string;
  className?: string;
}

export interface PaginationState {
  page: number;
  pageSize: number;
  total: number;
}

export interface SortState {
  column: string;
  direction: "asc" | "desc";
}

export interface FilterState {
  [key: string]: string | undefined;
}