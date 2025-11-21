"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ChevronDown } from "lucide-react";
import { BulkAction } from "./types";

interface BulkActionsProps<T> {
  selectedCount: number;
  selectedIds: string[];
  actions: BulkAction<T>[];
  onClearSelection?: () => void;
  className?: string;
}

export function BulkActions<T>({
  selectedCount,
  selectedIds,
  actions,
  onClearSelection,
  className = "",
}: BulkActionsProps<T>) {
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    action: BulkAction<T> | null;
  }>({
    open: false,
    action: null,
  });
  const [isProcessing, setIsProcessing] = useState(false);

  const handleActionClick = async (action: BulkAction<T>) => {
    if (action.requireConfirmation) {
      setConfirmDialog({ open: true, action });
    } else {
      await executeAction(action);
    }
  };

  const executeAction = async (action: BulkAction<T>) => {
    setIsProcessing(true);
    try {
      await action.action(selectedIds);
      if (onClearSelection) {
        onClearSelection();
      }
    } catch (error) {
      console.error(`Error executing action ${action.id}:`, error);
    } finally {
      setIsProcessing(false);
      setConfirmDialog({ open: false, action: null });
    }
  };

  const handleConfirm = async () => {
    if (confirmDialog.action) {
      await executeAction(confirmDialog.action);
    }
  };

  if (selectedCount === 0) {
    return null;
  }

  // Separate destructive actions from others
  const destructiveActions = actions.filter((a) => a.variant === "destructive");
  const otherActions = actions.filter((a) => a.variant !== "destructive");

  return (
    <>
      <div
        className={`flex items-center gap-3 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg ${className}`}
      >
        <span className="text-sm font-medium text-blue-700">
          {selectedCount} selected
        </span>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-8 border-blue-200 text-blue-700 hover:bg-blue-100 bg-transparent"
              disabled={isProcessing}
            >
              Actions
              <ChevronDown className="h-4 w-4 ml-2" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            {otherActions.map((action) => {
              const Icon = action.icon;
              const isDisabled = action.disabled
                ? action.disabled(selectedIds)
                : false;

              return (
                <DropdownMenuItem
                  key={action.id}
                  onClick={() => handleActionClick(action)}
                  disabled={isDisabled || isProcessing}
                  className="text-sm"
                >
                  {Icon && <Icon className="h-4 w-4 mr-2" />}
                  {action.label}
                </DropdownMenuItem>
              );
            })}

            {destructiveActions.length > 0 && otherActions.length > 0 && (
              <DropdownMenuSeparator />
            )}

            {destructiveActions.map((action) => {
              const Icon = action.icon;
              const isDisabled = action.disabled
                ? action.disabled(selectedIds)
                : false;

              return (
                <DropdownMenuItem
                  key={action.id}
                  onClick={() => handleActionClick(action)}
                  disabled={isDisabled || isProcessing}
                  className="text-sm text-red-600 focus:text-red-600"
                >
                  {Icon && <Icon className="h-4 w-4 mr-2" />}
                  {action.label}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>

        {onClearSelection && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearSelection}
            className="h-8 text-blue-700 hover:bg-blue-100"
            disabled={isProcessing}
          >
            Clear selection
          </Button>
        )}
      </div>

      {/* Confirmation Dialog */}
      <Dialog
        open={confirmDialog.open}
        onOpenChange={(open) =>
          setConfirmDialog({ open, action: confirmDialog.action })
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmDialog.action?.confirmationTitle || "Confirm Action"}
            </DialogTitle>
            <DialogDescription>
              {confirmDialog.action?.confirmationDescription ||
                "Are you sure you want to perform this action?"}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmDialog({ open: false, action: null })}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              variant={confirmDialog.action?.variant || "default"}
              onClick={handleConfirm}
              disabled={isProcessing}
            >
              {isProcessing ? "Processing..." : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}