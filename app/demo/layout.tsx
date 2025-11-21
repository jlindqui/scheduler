'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { currentUser } from '@/app/lib/mock-data';

export default function DemoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const navItems = [
    { href: '/demo', label: 'Dashboard', icon: '📊' },
    { href: '/demo/schedule', label: 'Master Schedule', icon: '📅' },
    { href: '/demo/agent', label: 'AI Agent (Live)', icon: '🤖' },
    { href: '/demo/swap', label: 'Shift Swaps', icon: '🔄' },
    { href: '/demo/timeoff', label: 'Time Off', icon: '🏖️' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Nav */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/" className="text-xl font-bold text-blue-600">
                CBA Scheduling
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm">
                <div className="font-semibold text-gray-900">{currentUser.name}</div>
                <div className="text-gray-500">{currentUser.employeeNumber}</div>
              </div>
              <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
                {currentUser.name?.charAt(0)}
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Side Nav + Content */}
      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 bg-white border-r border-gray-200 min-h-screen">
          <nav className="p-4 space-y-2">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 font-semibold'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span className="text-xl">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Demo Notice */}
          <div className="p-4 mt-8">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <div className="text-xs font-semibold text-yellow-800 mb-1">
                DEMO MODE
              </div>
              <div className="text-xs text-yellow-700">
                Using mock data - no database required
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-8">{children}</div>
      </div>
    </div>
  );
}
