'use client';

import { getStatusInfo, normalizeStatus } from '@/app/lib/definitions';

interface StatusSelectorProps {
  currentStatus: string;
}

export default function StatusSelector({ 
  currentStatus
}: StatusSelectorProps) {
  const normalizedStatus = normalizeStatus(currentStatus);
  const statusInfo = normalizedStatus ? getStatusInfo(normalizedStatus) : undefined;
  
  return (
    <div className="flex items-center">
      <span className={`text-sm font-medium rounded-lg px-3 py-2 ${statusInfo?.color || 'bg-white text-gray-700'}`}>
        {statusInfo?.displayName || currentStatus.replace(/_/g, ' ')}
      </span>
    </div>
  );
} 