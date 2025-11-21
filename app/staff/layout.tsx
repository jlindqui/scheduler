'use client';

import Link from 'next/link';
import { usePathname, useRouter, useParams } from 'next/navigation';
import { Toaster } from '@/components/ui/toaster';

// Mock employees for testing (matching example schedule)
const MOCK_EMPLOYEES = [
  { id: 'employee_1', staffNumber: 1, name: 'Alex Thompson', fte: 1.0 },
  { id: 'employee_2', staffNumber: 2, name: 'Jordan Martinez', fte: 1.0 },
  { id: 'employee_3', staffNumber: 3, name: 'Sam Chen', fte: 1.0 },
  { id: 'employee_4', staffNumber: 4, name: 'Taylor Johnson', fte: 1.0 },
  { id: 'employee_5', staffNumber: 5, name: 'Casey Rodriguez', fte: 1.0 },
  { id: 'employee_6', staffNumber: 6, name: 'Morgan Davis', fte: 1.0 },
  { id: 'employee_7', staffNumber: 7, name: 'Riley Wilson', fte: 1.0 },
  { id: 'employee_8', staffNumber: 8, name: 'Jamie Anderson', fte: 1.0 },
  { id: 'employee_9', staffNumber: 9, name: 'Avery Brown', fte: 1.0 },
  { id: 'employee_10', staffNumber: 10, name: 'Quinn Miller', fte: 1.0 },
  { id: 'employee_11', staffNumber: 11, name: 'Parker Garcia', fte: 1.0 },
  { id: 'employee_12', staffNumber: 12, name: 'Reese Lee', fte: 1.0 },
  { id: 'employee_13', staffNumber: 13, name: 'Cameron White', fte: 0.6 },
  { id: 'employee_14', staffNumber: 14, name: 'Skyler Harris', fte: 0.6 },
  { id: 'employee_15', staffNumber: 15, name: 'Dakota Clark', fte: 0.6 },
  { id: 'employee_16', staffNumber: 16, name: 'Charlie Lewis', fte: 0.6 },
  { id: 'employee_17', staffNumber: 17, name: 'Finley Walker', fte: 0.6 },
  { id: 'employee_18', staffNumber: 18, name: 'Sage Hall', fte: 0.6 },
  { id: 'employee_19', staffNumber: 19, name: 'River Young', fte: 0.6 },
  { id: 'employee_20', staffNumber: 20, name: 'Phoenix King', fte: 0.6 },
];

export default function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const params = useParams();

  const employeeId = (params.employeeId as string) || 'employee_1';
  const currentEmployee = MOCK_EMPLOYEES.find(e => e.id === employeeId) || MOCK_EMPLOYEES[0];

  function handleEmployeeChange(newEmployeeId: string) {
    router.push(`/staff/${newEmployeeId}`);
  }

  const navItems = [
    { href: '/staff', label: 'Preferences', icon: '⚙️' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Nav */}
      <nav className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-8">
              <Link href="/staff" className="text-xl font-bold text-blue-600">
                CBA Scheduling
              </Link>
              <div className="hidden md:flex items-center space-x-1">
                {navItems.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                        isActive
                          ? 'bg-blue-50 text-blue-700 font-semibold'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <span>{item.icon}</span>
                      <span className="text-sm">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <select
                value={employeeId}
                onChange={(e) => handleEmployeeChange(e.target.value)}
                className="block px-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                {MOCK_EMPLOYEES.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    Staff {emp.staffNumber} - {emp.name} ({emp.fte === 1.0 ? 'FT' : 'PT'})
                  </option>
                ))}
              </select>
              <Link
                href="/admin"
                className="text-xs text-blue-600 hover:text-blue-700 underline"
              >
                Switch to Admin
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </div>
      <Toaster />
    </div>
  );
}
