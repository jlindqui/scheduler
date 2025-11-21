import { Shield } from "lucide-react";

/**
 * Reusable component that displays information about admin user access to bargaining units.
 * Shows that admin users automatically have access to all bargaining units.
 */
export function AdminBargainingUnitsInfo() {
  return (
    <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
      <Shield className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
      <div>
        <p className="text-sm font-medium text-amber-900">
          Admins see all bargaining units
        </p>
        <p className="text-xs text-amber-700 mt-1">
          Admin users automatically have access to all bargaining units and can add staff and create new bargaining units.
        </p>
      </div>
    </div>
  );
}
