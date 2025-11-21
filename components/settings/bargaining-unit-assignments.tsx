"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Users } from "lucide-react";
import { MemberRole } from "@prisma/client";
import { AdminBargainingUnitsInfo } from "./admin-bargaining-units-info";

type BargainingUnit = {
  id: string;
  name: string;
};

interface BargainingUnitAssignmentsProps {
  role: MemberRole;
  selectedBargainingUnitIds: string[];
  availableBargainingUnits: BargainingUnit[];
  onToggleBargainingUnit: (bargainingUnitId: string) => void;
  onSelectAll?: () => void;
  showSelectAll?: boolean;
  required?: boolean;
}

/**
 * Reusable component for managing bargaining unit assignments.
 * Used in both staff invite and edit forms.
 */
export function BargainingUnitAssignments({
  role,
  selectedBargainingUnitIds,
  availableBargainingUnits,
  onToggleBargainingUnit,
  onSelectAll,
  showSelectAll = true,
  required = false
}: BargainingUnitAssignmentsProps) {
  const allSelected = selectedBargainingUnitIds.length === availableBargainingUnits.length;

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center">
          <Users className="h-5 w-5 mr-2 text-blue-500" />
          Bargaining Unit Assignments
        </CardTitle>
      </CardHeader>
      <CardContent>
        {role === MemberRole.Admin ? (
          /* Admin view - show info message */
          <div className="space-y-4">
            <AdminBargainingUnitsInfo />
          </div>
        ) : (
          /* Member view - show checkbox list */
          <>
            {availableBargainingUnits.length > 0 ? (
              <div className="space-y-3">
                {showSelectAll && availableBargainingUnits.length > 1 && onSelectAll && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={onSelectAll}
                  >
                    {allSelected ? 'Deselect All' : 'Select All'}
                  </Button>
                )}
                <div className="text-xs text-gray-500 mt-3">
                  Select the bargaining units this staff member should have access to
                  {required && <span className="text-red-500 ml-1">*</span>}
                </div>
                {availableBargainingUnits.map((unit) => (
                  <div key={unit.id} className="flex items-center space-x-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors">
                    <Checkbox
                      id={`unit-${unit.id}`}
                      checked={selectedBargainingUnitIds.includes(unit.id)}
                      onCheckedChange={() => onToggleBargainingUnit(unit.id)}
                    />
                    <Label htmlFor={`unit-${unit.id}`} className="flex-1 cursor-pointer">
                      {unit.name}
                    </Label>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-gray-500">
                <Users className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No bargaining units available</p>
                <p className="text-xs">Create bargaining units first to assign them to staff members</p>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
