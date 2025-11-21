'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

// Simulating logged-in staff (Staff #1 - Alex Thompson)
const currentStaff = {
  staffNumber: 1,
  name: 'Alex Thompson',
  email: 'alex.thompson@cityhospital.org',
  employeeNumber: 'EMP001',
  role: 'STAFF',
};

export default function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const navItems = [
    { href: '/staff', label: 'My Dashboard', icon: '🏠' },
    { href: '/staff/schedule', label: 'My Schedule', icon: '📅' },
    { href: '/staff/chat', label: 'AI Assistant', icon: '🤖' },
    { href: '/staff/timeoff', label: 'My Time Off', icon: '🏖️' },
    { href: '/staff/swaps', label: 'Shift Swaps', icon: '🔄' },
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
              <div className="text-sm text-right">
                <div className="font-semibold text-gray-900">{currentStaff.name}</div>
                <div className="text-gray-500 text-xs">{currentStaff.employeeNumber}</div>
              </div>
              <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
                {currentStaff.name.charAt(0)}
              </div>
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
    </div>
  );
}
