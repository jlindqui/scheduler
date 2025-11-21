import { Organization } from "@/app/lib/definitions";

// Keep the same interface structure as your NextAuth session
export interface ExtendedSessionUser {
  id: string;
  email: string;
  name?: string;
  image?: string;
  title?: string;
  phone?: string;
  timezone?: string;
  organization?: Organization & {
    members: Array<{
      role: "Admin" | "Member";
      userId: string;
    }>;
  };
  isSuperAdmin?: boolean;
}
