"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";

interface CostManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  estimatedCost: number | null;
  actualCost: number | null;
  onCostUpdate: (
    field: "estimatedCost" | "actualCost",
    value: number | null
  ) => Promise<void>;
}

export default function CostManagementModal({
  isOpen,
  onClose,
  estimatedCost,
  actualCost,
  onCostUpdate,
}: CostManagementModalProps) {
  const [isSavingCosts, setIsSavingCosts] = useState(false);
  const [estimatedValue, setEstimatedValue] = useState(
    estimatedCost?.toString() || ""
  );
  const [actualValue, setActualValue] = useState(actualCost?.toString() || "");

  // Update local state when props change
  React.useEffect(() => {
    setEstimatedValue(estimatedCost?.toString() || "");
    setActualValue(actualCost?.toString() || "");
  }, [estimatedCost, actualCost]);

  if (!isOpen) return null;

  const handleSave = async () => {
    const estimatedValueNum =
      estimatedValue.trim() === "" ? null : parseFloat(estimatedValue);
    const actualValueNum =
      actualValue.trim() === "" ? null : parseFloat(actualValue);

    setIsSavingCosts(true);
    try {
      // Wait for both cost updates to complete before closing modal
      const updatePromises = [];

      if (estimatedValueNum !== null) {
        updatePromises.push(onCostUpdate("estimatedCost", estimatedValueNum));
      }
      if (actualValueNum !== null) {
        updatePromises.push(onCostUpdate("actualCost", actualValueNum));
      }

      // Wait for all updates to complete
      await Promise.all(updatePromises);

      // Only close modal after updates are complete
      onClose();
    } catch (error) {
      console.error("Failed to update costs:", error);
    } finally {
      setIsSavingCosts(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Cost Management
          </h2>
          <button
            title="close"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          {/* Estimated Cost */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Estimated Cost
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                $
              </span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={estimatedValue}
                onChange={(e) => setEstimatedValue(e.target.value)}
                className="block w-full pl-8 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="0.00"
                id="estimated-cost"
              />
            </div>
          </div>

          {/* Actual Cost */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Actual Cost
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                $
              </span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={actualValue}
                onChange={(e) => setActualValue(e.target.value)}
                className="block w-full pl-8 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="0.00"
                id="actual-cost"
              />
            </div>
          </div>

          {/* Cost Analysis */}
          {estimatedCost &&
            estimatedCost > 0 &&
            actualCost &&
            actualCost > 0 && (
              <div className="pt-3 border-t border-gray-200">
                <h3 className="text-sm font-medium text-gray-700 mb-2">
                  Cost Analysis
                </h3>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Variance:</span>
                    <span
                      className={`font-medium ${
                        actualCost > estimatedCost
                          ? "text-red-600"
                          : actualCost < estimatedCost
                            ? "text-green-600"
                            : "text-gray-600"
                      }`}
                    >
                      {new Intl.NumberFormat("en-CA", {
                        style: "currency",
                        currency: "CAD",
                      }).format(actualCost - estimatedCost)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Variance %:</span>
                    <span
                      className={`font-medium ${
                        actualCost > estimatedCost
                          ? "text-red-600"
                          : actualCost < estimatedCost
                            ? "text-green-600"
                            : "text-gray-600"
                      }`}
                    >
                      {(
                        ((actualCost - estimatedCost) / estimatedCost) *
                        100
                      ).toFixed(1)}
                      %
                    </span>
                  </div>
                </div>
              </div>
            )}

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="button" disabled={isSavingCosts} onClick={handleSave}>
              {isSavingCosts ? "Saving..." : "Save Costs"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
