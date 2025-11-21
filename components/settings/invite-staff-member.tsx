"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, UserPlus } from "lucide-react";
import { inviteStaffMember } from "@/app/actions/staff";
import { MemberRole } from "@prisma/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { BargainingUnitAssignments } from "./bargaining-unit-assignments";
import { formatPhoneInput } from "@/lib/utils";

type BargainingUnit = {
  id: string;
  name: string;
};

interface InviteStaffMemberProps {
  availableBargainingUnits: BargainingUnit[];
}

export function InviteStaffMember({ availableBargainingUnits }: InviteStaffMemberProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  // Invitation form state
  const [inviteForm, setInviteForm] = useState<{
    name: string;
    email: string;
    phone: string;
    title: string;
    role: MemberRole;
    bargainingUnitIds: string[];
  }>({
    name: '',
    email: '',
    phone: '',
    title: '',
    role: MemberRole.Member,
    bargainingUnitIds: availableBargainingUnits.map(u => u.id)
  });

  const resetInviteForm = () => {
    setInviteForm({
      name: '',
      email: '',
      phone: '',
      title: '',
      role: MemberRole.Member,
      bargainingUnitIds: availableBargainingUnits.map(u => u.id)
    });
  };

  const handleInviteStaff = async () => {
    if (!inviteForm.name.trim() || !inviteForm.email.trim()) {
      toast({
        title: "Error",
        description: "Please enter both name and email",
        variant: "destructive"
      });
      return;
    }

    // Only validate bargaining units for non-admin users
    if (inviteForm.role !== MemberRole.Admin && inviteForm.bargainingUnitIds.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one bargaining unit",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      const result = await inviteStaffMember({
        name: inviteForm.name.trim(),
        email: inviteForm.email.trim(),
        phone: inviteForm.phone.trim() || undefined,
        title: inviteForm.title.trim() || undefined,
        role: inviteForm.role,
        bargainingUnitIds: inviteForm.bargainingUnitIds
      });

      if (result.success) {
        toast({
          title: "Success",
          description: result.message
        });
        resetInviteForm();
        // Navigate back to staff management page
        router.push('/product/settings/staff');
      } else {
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Failed to invite staff member:', error);
      toast({
        title: "Error",
        description: "Failed to invite staff member. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleInviteBargainingUnit = (bargainingUnitId: string) => {
    setInviteForm(prev => ({
      ...prev,
      bargainingUnitIds: prev.bargainingUnitIds.includes(bargainingUnitId)
        ? prev.bargainingUnitIds.filter(id => id !== bargainingUnitId)
        : [...prev.bargainingUnitIds, bargainingUnitId]
    }));
  };

  const handleSelectAllBargainingUnits = () => {
    const allSelected = inviteForm.bargainingUnitIds.length === availableBargainingUnits.length;
    setInviteForm(prev => ({
      ...prev,
      bargainingUnitIds: allSelected ? [] : availableBargainingUnits.map(u => u.id)
    }));
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center">
            <UserPlus className="h-5 w-5 mr-2 text-blue-500" />
            Staff Member Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="invite-name" className="flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                Name *
              </Label>
              <Input
                id="invite-name"
                value={inviteForm.name}
                onChange={(e) =>
                  setInviteForm({ ...inviteForm, name: e.target.value })
                }
                className="w-full"
                placeholder="Full name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-email" className="flex items-center gap-2">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Email *
              </Label>
              <Input
                id="invite-email"
                type="email"
                value={inviteForm.email}
                onChange={(e) =>
                  setInviteForm({ ...inviteForm, email: e.target.value })
                }
                className="w-full"
                placeholder="email@example.com"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="invite-phone" className="flex items-center gap-2">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                Phone
              </Label>
              <Input
                id="invite-phone"
                type="tel"
                value={inviteForm.phone}
                onChange={(e) => {
                  const formatted = formatPhoneInput(e.target.value);
                  setInviteForm({ ...inviteForm, phone: formatted });
                }}
                className="w-full"
                placeholder="(555) 555-5555"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-title" className="flex items-center gap-2">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0H8m8 0v2a2 2 0 01-2 2H10a2 2 0 01-2-2V6m8 0H8" />
                </svg>
                Title
              </Label>
              <Input
                id="invite-title"
                value={inviteForm.title}
                onChange={(e) =>
                  setInviteForm({ ...inviteForm, title: e.target.value })
                }
                className="w-full"
                placeholder="Job title or role"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="invite-role" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Organization Role
            </Label>
            <Select
              value={inviteForm.role}
              onValueChange={(value: string) => {
                const newRole = value as MemberRole;
                setInviteForm(prev => {
                  // If changing to Admin, automatically select all bargaining units
                  if (newRole === MemberRole.Admin && prev.role !== MemberRole.Admin) {
                    return {
                      ...prev,
                      role: newRole,
                      bargainingUnitIds: availableBargainingUnits.map(bu => bu.id)
                    };
                  }
                  return { ...prev, role: newRole };
                });
              }}
            >
              <SelectTrigger className="w-full md:w-1/2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={MemberRole.Member}>
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-green-600" />
                    <span>User</span>
                  </div>
                </SelectItem>
                <SelectItem value={MemberRole.Admin}>
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-red-600" />
                    <span>Admin</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4">
            <Link href="/product/settings/staff">
              <Button variant="outline" className="flex items-center gap-2">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Cancel
              </Button>
            </Link>
            <Button
              onClick={handleInviteStaff}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              <UserPlus className="h-4 w-4" />
              {isLoading ? 'Inviting...' : 'Invite Staff Member'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Bargaining Unit Assignments */}
      <BargainingUnitAssignments
        role={inviteForm.role}
        selectedBargainingUnitIds={inviteForm.bargainingUnitIds}
        availableBargainingUnits={availableBargainingUnits}
        onToggleBargainingUnit={toggleInviteBargainingUnit}
        onSelectAll={handleSelectAllBargainingUnits}
        showSelectAll={true}
        required={inviteForm.role !== MemberRole.Admin}
      />
    </div>
  );
}