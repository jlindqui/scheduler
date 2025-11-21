"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X, ChevronDown } from "lucide-react";
import Image from "next/image";
import { useSession } from "@/lib/auth/use-auth-session";

export default function SiteNavigation() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const { data: session } = useSession();

  // Timer for dropdown delay
  const [hoverTimer, setHoverTimer] = useState<NodeJS.Timeout | null>(null);

  // Close dropdown when mobile menu closes
  const handleMenuToggle = () => {
    setIsMenuOpen(!isMenuOpen);
    if (isMenuOpen) {
      setIsDropdownOpen(false);
    }
  };

  // Handle dropdown hover with delay
  const handleDropdownEnter = () => {
    if (hoverTimer) {
      clearTimeout(hoverTimer);
      setHoverTimer(null);
    }
    setIsDropdownOpen(true);
  };

  const handleDropdownLeave = () => {
    const timer = setTimeout(() => {
      setIsDropdownOpen(false);
    }, 150); // 150ms delay before closing
    setHoverTimer(timer);
  };

  const isActive = (path: string) => {
    return pathname === path
      ? "text-navy-900 border-b-2 border-navy-900"
      : "text-navy-900 hover:text-blue-600";
  };

  return (
    <nav className="bg-white shadow-sm fixed w-full z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-[88px]">
          <div className="flex items-center">
            <Link href="/" className="flex items-center" style={{ height: '317px' }}>
              <Image
                src="/logos/blue_logo_full.png"
                alt="Brown and Beatty Solutions"
                width={5280}
                height={3180}
                priority
                style={{ height: '100%', width: 'auto' }}
              />
            </Link>
          </div>

          {/* Mobile menu button */}
          <div className="flex items-center md:hidden">
            <button
              onClick={handleMenuToggle}
              className="inline-flex items-center justify-center p-2 rounded-md text-navy-900 hover:text-blue-600 focus:outline-none"
            >
              {isMenuOpen ? (
                <X className="block h-6 w-6" />
              ) : (
                <Menu className="block h-6 w-6" />
              )}
            </button>
          </div>

          {/* Desktop menu */}
          <div className="hidden md:flex md:space-x-8 md:items-center">
            {/* Employer & Union Solutions Dropdown */}
            <div
              className="relative"
              onMouseEnter={handleDropdownEnter}
              onMouseLeave={handleDropdownLeave}
            >
              <button
                className={`inline-flex items-center px-1 pt-1 text-sm font-medium ${isActive("/employer_union")} gap-1`}
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              >
                Employer & Union Solutions
                <ChevronDown
                  className={`w-4 h-4 transition-transform ${isDropdownOpen ? "rotate-180" : ""}`}
                />
              </button>

              {/* Dropdown Menu */}
              {isDropdownOpen && (
                <div className="absolute left-0 mt-1 w-64 bg-white rounded-md shadow-lg border border-gray-200 z-50">
                  <div className="py-2">
                    <Link
                      href="/grievance-management"
                      className="block px-4 py-3 text-sm text-navy-900 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                    >
                      <div className="font-medium">Grievances</div>
                      <div className="text-xs text-gray-500 mt-1">
                        End-to-end grievance tracking and resolution
                      </div>
                    </Link>
                    <Link
                      href="/agreement-navigator"
                      className="block px-4 py-3 text-sm text-navy-900 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                    >
                      <div className="font-medium">Collective Agreements</div>
                      <div className="text-xs text-gray-500 mt-1">
                        AI-powered agreement search and analysis
                      </div>
                    </Link>
                    <Link
                      href="/complaints-incidents"
                      className="block px-4 py-3 text-sm text-navy-900 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                    >
                      <div className="font-medium">Complaints & Incidents</div>
                      <div className="text-xs text-gray-500 mt-1">
                        Track informal complaints and identify trends to prevent escalation
                      </div>
                    </Link>
                    <div className="border-t border-gray-100 my-2"></div>
                    <Link
                      href="/enterprise"
                      className="block px-4 py-3 text-sm text-navy-900 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                    >
                      <div className="font-medium">Enterprise</div>
                      <div className="text-xs text-gray-500 mt-1">
                        HRIS integration, institutional memory, and advanced analytics
                      </div>
                    </Link>
                  </div>
                </div>
              )}
            </div>

            <Link
              href="/privacy"
              className={`inline-flex items-center px-1 pt-1 text-sm font-medium ${isActive("/privacy")}`}
            >
              Privacy Policy
            </Link>
            <Link
              href="/about"
              className={`inline-flex items-center px-1 pt-1 text-sm font-medium ${isActive("/about")}`}
            >
              About Us
            </Link>
            <Link
              href="/contact"
              className={`inline-flex items-center px-1 pt-1 text-sm font-medium ${isActive("/contact")}`}
            >
              Contact Us
            </Link>
          </div>
        </div>

        {/* Mobile menu */}
        {isMenuOpen && (
          <div className="md:hidden">
            <div className="pt-2 pb-3 space-y-1">
              {/* Mobile Employer & Union Solutions */}
              <div>
                <button
                  className="flex items-center justify-between w-full px-3 py-2 text-base font-medium text-navy-900 hover:text-blue-600"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                >
                  Employer & Union Solutions
                  <ChevronDown
                    className={`w-4 h-4 transition-transform ${isDropdownOpen ? "rotate-180" : ""}`}
                  />
                </button>

                {/* Mobile Dropdown Items */}
                {isDropdownOpen && (
                  <div className="pl-6 space-y-1">
                    <Link
                      href="/grievance-management"
                      className="block px-3 py-2 text-sm text-navy-900 hover:text-blue-600"
                      onClick={() => {
                        setIsMenuOpen(false);
                        setIsDropdownOpen(false);
                      }}
                    >
                      Grievances
                    </Link>
                    <Link
                      href="/agreement-navigator"
                      className="block px-3 py-2 text-sm text-navy-900 hover:text-blue-600"
                      onClick={() => {
                        setIsMenuOpen(false);
                        setIsDropdownOpen(false);
                      }}
                    >
                      Collective Agreements
                    </Link>
                    <Link
                      href="/complaints-incidents"
                      className="block px-3 py-2 text-sm text-navy-900 hover:text-blue-600"
                      onClick={() => {
                        setIsMenuOpen(false);
                        setIsDropdownOpen(false);
                      }}
                    >
                      Complaints & Incidents
                    </Link>
                    <Link
                      href="/enterprise"
                      className="block px-3 py-2 text-sm text-navy-900 hover:text-blue-600"
                      onClick={() => {
                        setIsMenuOpen(false);
                        setIsDropdownOpen(false);
                      }}
                    >
                      Enterprise
                    </Link>
                  </div>
                )}
              </div>

              <Link
                href="/privacy"
                className={`block px-3 py-2 text-base font-medium ${isActive("/privacy")}`}
                onClick={() => setIsMenuOpen(false)}
              >
                Privacy Policy
              </Link>
              <Link
                href="/about"
                className={`block px-3 py-2 text-base font-medium ${isActive("/about")}`}
                onClick={() => setIsMenuOpen(false)}
              >
                About Us
              </Link>
              <Link
                href="/contact"
                className={`block px-3 py-2 text-base font-medium ${isActive("/contact")}`}
                onClick={() => setIsMenuOpen(false)}
              >
                Contact Us
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
