"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { StaffMemberWithBargainingUnits, updateStaffMember } from "@/app/actions/staff";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { User, Mail, Shield, Users, Save, X, AlertCircle } from "lucide-react";
import { MemberRole } from "@prisma/client";
import { BargainingUnitAssignments } from "./bargaining-unit-assignments";
import { formatPhoneNumber, formatPhoneInput } from "@/lib/utils";

type BargainingUnit = {
  id: string;
  name: string;
};

interface StaffEditFormProps {
  staffMember: StaffMemberWithBargainingUnits;
  availableBargainingUnits: BargainingUnit[];
  currentUserId?: string;
  isAdmin?: boolean;
}

const getRoleBadgeColor = (role: MemberRole) => {
  switch (role) {
    case MemberRole.Admin:
      return "bg-red-50 text-red-700 border-red-200";
    case MemberRole.Member:
      return "bg-green-50 text-green-700 border-green-200";
    default:
      return "bg-gray-50 text-gray-700 border-gray-200";
  }
};

// Removed custom phone validation and formatting - now using formatPhoneInput and formatPhoneNumber from utils

export function StaffEditForm({
  staffMember,
  availableBargainingUnits,
  currentUserId,
  isAdmin = false
}: StaffEditFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: staffMember.name || '',
    email: staffMember.email || '',
    phone: formatPhoneNumber(staffMember.phone) || '',
    title: staffMember.title || '',
    role: staffMember.role,
    bargainingUnitIds: staffMember.bargainingUnits.map(bu => bu.id)
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await updateStaffMember(staffMember.id, {
        name: formData.name || undefined,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        title: formData.title || undefined,
        role: formData.role,
        bargainingUnitIds: formData.bargainingUnitIds
      });

      toast({
        title: "Success",
        description: "Staff member updated successfully"
      });

      router.push("/product/settings/staff");
    } catch (error) {
      console.error('Failed to update staff member:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to update staff member',
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    router.push("/product/settings/staff");
  };

  const toggleBargainingUnit = (bargainingUnitId: string) => {
    setFormData(prev => ({
      ...prev,
      bargainingUnitIds: prev.bargainingUnitIds.includes(bargainingUnitId)
        ? prev.bargainingUnitIds.filter(id => id !== bargainingUnitId)
        : [...prev.bargainingUnitIds, bargainingUnitId]
    }));
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneInput(e.target.value);
    setFormData(prev => ({ ...prev, phone: formatted }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Information Card */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center">
            <User className="h-5 w-5 mr-2 text-blue-500" />
            Basic Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Name
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter name"
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="Enter email"
                className="w-full"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center gap-2">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                Phone
              </Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={handlePhoneChange}
                placeholder="(555) 555-5555"
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="title" className="flex items-center gap-2">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0H8m8 0v2a2 2 0 01-2 2H10a2 2 0 01-2-2V6m8 0H8" />
                </svg>
                Title
              </Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter job title"
                className="w-full"
              />
            </div>
          </div>

          {/* Role - Editable for admins, read-only for members */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Organization Role
            </Label>
            {isAdmin ? (
              <>
                <Select
                  value={formData.role}
                  onValueChange={(value) => {
                    const newRole = value as MemberRole;
                    setFormData(prev => {
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
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={MemberRole.Admin}>
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-red-600" />
                        <span>Admin</span>
                      </div>
                    </SelectItem>
                    <SelectItem value={MemberRole.Member}>
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-green-600" />
                        <span>Member</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">
                  Admins can manage organization settings and staff members
                  {formData.role === MemberRole.Admin && " (all bargaining units automatically assigned)"}
                </p>
              </>
            ) : (
              <>
                <Badge
                  variant="outline"
                  className={`text-sm font-medium px-3 py-1 w-fit ${getRoleBadgeColor(staffMember.role)}`}
                >
                  <Shield className="w-3 h-3 mr-1" />
                  {staffMember.role}
                </Badge>
                <p className="text-xs text-gray-500">
                  Contact an administrator to change organization roles
                </p>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Bargaining Units Card */}
      <BargainingUnitAssignments
        role={formData.role}
        selectedBargainingUnitIds={formData.bargainingUnitIds}
        availableBargainingUnits={availableBargainingUnits}
        onToggleBargainingUnit={toggleBargainingUnit}
        showSelectAll={false}
        required={false}
      />

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={handleCancel}
          disabled={isLoading}
          className="flex items-center gap-2"
        >
          <X className="h-4 w-4" />
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isLoading}
          className="flex items-center gap-2"
        >
          <Save className="h-4 w-4" />
          {isLoading ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </form>
  );
}