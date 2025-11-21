'use client';

import GrievanceNotes, { GrievanceNote } from '@/components/grievances/grievance-notes';

interface NotesTabProps {
  grievanceId: string;
  initialNotes?: GrievanceNote[];
}

export default function NotesTab({ grievanceId, initialNotes }: NotesTabProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
      <GrievanceNotes grievanceId={grievanceId} initialNotes={initialNotes} />
    </div>
  );
}
