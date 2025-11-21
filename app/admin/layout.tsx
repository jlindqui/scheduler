'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const manager = {
  name: 'Sarah Johnson',
  email: 'sarah.johnson@cityhospital.org',
  employeeNumber: 'MGR001',
  role: 'MANAGER',
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const navItems = [
    { href: '/admin', label: 'Dashboard', icon: '📊' },
    { href: '/admin/master-schedule', label: 'Master Schedule', icon: '📅' },
    { href: '/admin/requests', label: 'Staff Requests', icon: '📋' },
    { href: '/admin/team', label: 'Team Overview', icon: '👥' },
    { href: '/admin/reports', label: 'Reports', icon: '📈' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Nav */}
      <nav className="bg-gradient-to-r from-indigo-600 to-purple-600 border-b border-indigo-700 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-8">
              <Link href="/admin" className="text-xl font-bold text-white">
                CBA Scheduling • Manager View
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
                          ? 'bg-white/20 text-white font-semibold'
                          : 'text-indigo-100 hover:bg-white/10'
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
                <div className="font-semibold text-white">{manager.name}</div>
                <div className="text-indigo-200 text-xs">Manager • {manager.employeeNumber}</div>
              </div>
              <div className="h-10 w-10 rounded-full bg-white flex items-center justify-center text-indigo-600 font-semibold">
                {manager.name.charAt(0)}
              </div>
              <Link
                href="/staff"
                className="text-xs text-indigo-200 hover:text-white underline"
              >
                Switch to Staff
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
