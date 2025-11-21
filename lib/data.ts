// This file defines navigation structure and data
// ⚠️  IMPORTANT: When adding/removing navigation items, also update:
//    - app/ui/product/sidenav.tsx (filtering logic and permissions)
//    - Global Settings items are managed directly in sidenav.tsx, not here
import {
  ClipboardList,
  FileText,
  Home,
  Settings,
  Briefcase,
  BookOpen,
  Tags,
  Building,
  BeakerIcon,
  Users,
  UserCircle,
  FileCheck,
  BarChart3,
  AlertTriangle,
  AlertCircle,
  Search,
  List,
  History,
} from "lucide-react";

export interface NavLink {
  icon: any;
  name: string;
  href?: string;
  subItems?: NavLink[];
}

// Main navigation structure - filtered and rendered by sidenav.tsx
export const navlinks: NavLink[] = [
  { icon: Home, name: "Dashboard", href: "/product/admin" },
  { icon: AlertCircle, name: "Incidents", href: "/product/incidents" },
  { icon: AlertTriangle, name: "Complaints", href: "/product/complaints" },
  {
    icon: ClipboardList,
    name: "Grievances",
    href: "/product/grievances",
    subItems: [
      {
        icon: Search,
        name: "Search",
        href: "/product/grievances/search",
      },
    ],
  },
  { icon: BeakerIcon, name: "Agreements", href: "/product/agreements/ai" },
  { icon: Tags, name: "Fact Schemas", href: "/product/grievance-types" },
  { icon: BeakerIcon, name: "Rough Justice", href: "/product/scenario-checker" },
  { icon: BarChart3, name: "Reports", href: "/product/reports" },
  {
    icon: Settings,
    name: "Settings",
    // NOTE: Permissions for Settings subItems are filtered in sidenav.tsx getFilteredSettingsSubItems()
    subItems: [
      {
        icon: UserCircle,
        name: "Profile",
        href: "/product/settings/profile",
      },
      {
        icon: FileCheck,
        name: "Bargaining Units",
        href: "/product/settings/bargaining-units",
      },
      { icon: Users, name: "Staff", href: "/product/settings/staff" },
      { icon: History, name: "Session Data", href: "/product/settings/session-data" },

      // {
      //   icon: Building,
      //   name: "Organization",
      //   href: "/product/settings/organization",
      // },
    ],
  },
];

export // Mock data for complaints
const mockComplaints = [
  {
    id: "12345",
    employee: "policy",
    // type: "Individual",
    category: "Unpaid Hours",
    status: "pending",
    date: "2023-05-15",
    unit: "Sales",
    agreement: "Collective Agreement A",
  },
  {
    id: "12343",
    employee: "S. Johnson, ..",
    // type: "Group",
    category: "Workplace Conditions",
    status: "pending",
    date: "2023-06-22",
    unit: "Operations",
    agreement: "Collective Agreement B",
  },
  {
    id: "43242",
    employee: "Michael Brown",
    // type: "Individual",
    category: "Benefits Issue",
    status: "resolved",
    date: "2023-04-10",
    unit: "Marketing",
    agreement: "Collective Agreement A",
  },
  {
    id: "92843",
    employee: "E. Joe, ..",
    // type: "Group",
    category: "Overtime Dispute",
    status: "pending",
    date: "2023-07-05",
    unit: "Human Resources",
    agreement: "Collective Agreement C",
  },
  {
    id: "67284",
    employee: "Robert Wilson",
    // type: "Individual",
    category: "Unpaid Hours",
    status: "resolved",
    date: "2023-03-18",
    unit: "Sales",
    agreement: "Collective Agreement A",
  },
];
export const mockincidents = [
  {
    id: "12",
    type: "assult",
    employee: "faiz m",
    unit: "CCS",
    category: "idk",
    date: "2025-01-01",
    action: "i want to sue",
    status: "pending",
  },
];
