"use client";

import { useState } from "react";
import { Notification } from "@/components/ui/notification";
import { useUpdateGrievanceAssignee } from "@/hooks/use-grievances";
import { useSession } from "@/lib/auth/use-auth-session";

interface AssigneeSelectorProps {
  grievanceId: string;
  organizationId: string;
  currentAssignee: { id: string; name: string | null } | null;
  hideLabel?: boolean;
  users: {
    id: string;
    name: string | null;
    email: string | null;
  }[];
}

export function AssigneeSelector({
  grievanceId,
  organizationId,
  currentAssignee,
  hideLabel = false,
  users = [],
}: AssigneeSelectorProps) {
  const [selectedUserId, setSelectedUserId] = useState(
    currentAssignee?.id || ""
  );
  const [showNotification, setShowNotification] = useState(false);
  const { data: session } = useSession();
  const updateAssigneeMutation = useUpdateGrievanceAssignee();

  const handleAssigneeChange = async (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    if (!session?.user) return;

    const newValue = e.target.value;
    setSelectedUserId(newValue);

    try {
      await updateAssigneeMutation.mutateAsync({
        grievanceId,
        assignedToId: newValue || null,
      });
      setShowNotification(true);
    } catch (error) {
      console.error("Failed to update assignee:", error);
      // Revert on error
      setSelectedUserId(currentAssignee?.id || "");
    }
  };

  return (
    <>
      <div className="flex items-center assignee-selector">
        <select
          title="handle assignee"
          id="assignee"
          name="assignee"
          className="text-sm font-medium rounded-lg px-3 py-2 pr-8 border border-gray-200 bg-white text-gray-700 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200"
          value={selectedUserId}
          onChange={handleAssigneeChange}
          disabled={!session?.user || updateAssigneeMutation.isPending}
        >
          <option value="">Unassigned</option>
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.name}
            </option>
          ))}
        </select>
      </div>
      {showNotification && (
        <Notification
          message="Assignee updated successfully"
          onClose={() => setShowNotification(false)}
        />
      )}
    </>
  );
}
