"use client";

import { useState, useEffect } from "react";
import { formatSmartDate, formatPhoneNumber } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, Mail, Search, RefreshCw, User, Crown } from "lucide-react";
import {
  StaffMemberWithBargainingUnits,
  removeStaffMember,
  inviteStaffMember
} from "@/app/actions/staff";
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

type BargainingUnit = {
  id: string;
  name: string;
};

interface StaffSettingsProps {
  initialStaff: StaffMemberWithBargainingUnits[];
  availableBargainingUnits: BargainingUnit[];
  currentUserId?: string;
}

const getInvitationStatus = (member: StaffMemberWithBargainingUnits) => {
  // Check if this is a pending invitation (ID starts with "pending-")
  const isPendingInvitation = member.id.startsWith('pending-');
  
  if (isPendingInvitation) {
    return {
      status: "Invitation Sent",
      description: "Waiting for user to accept invitation",
      color: "bg-blue-50 text-blue-700 border-blue-200",
      icon: Mail
    };
  } else if (!member.emailVerified && member.invitedAt) {
    return {
      status: "Pending",
      description: "Invitation sent, awaiting email verification",
      color: "bg-yellow-50 text-yellow-700 border-yellow-200",
      icon: Mail
    };
  } else if (member.emailVerified && member.invitationAcceptedAt) {
    return {
      status: "Active",
      description: "Email verified and invitation accepted",
      color: "bg-green-50 text-green-700 border-green-200",
      icon: null
    };
  } else if (member.emailVerified && !member.invitedAt) {
    // User who joined without invitation (e.g., super admin)
    return {
      status: "Active",
      description: "Active user",
      color: "bg-green-50 text-green-700 border-green-200",
      icon: null
    };
  } else {
    return {
      status: "Unknown",
      description: "Status unclear",
      color: "bg-gray-50 text-gray-700 border-gray-200",
      icon: null
    };
  }
};

const formatDateSafely = (date: Date | string | null): string => {
  if (!date) return '';
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return formatSmartDate(dateObj);
  } catch {
    return '';
  }
};

export function StaffSettings({ initialStaff, availableBargainingUnits, currentUserId }: StaffSettingsProps) {
  const [staff, setStaff] = useState<StaffMemberWithBargainingUnits[]>(initialStaff);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState<Record<string, boolean>>({});
  const [isHydrated, setIsHydrated] = useState(false);
  const { toast } = useToast();

  // Prevent hydration mismatch with dates
  useEffect(() => {
    setIsHydrated(true);
  }, []);


  const filteredStaff = staff.filter(
    (member) =>
      member.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.role.toLowerCase().includes(searchTerm.toLowerCase())
  );


  const handleDeleteStaff = async (id: string, name: string, userId: string) => {
    // Prevent users from removing themselves
    if (userId === currentUserId) {
      toast({
        title: "Error",
        description: "You cannot remove yourself from the organization",
        variant: "destructive"
      });
      return;
    }

    if (!confirm(`Are you sure you want to remove ${name} from the organization?`)) {
      return;
    }

    setIsLoading(prev => ({ ...prev, [`delete-${id}`]: true }));
    
    try {
      await removeStaffMember(id);
      setStaff(staff.filter((s) => s.id !== id));
      toast({
        title: "Success",
        description: `${name} has been removed from the organization`
      });
    } catch (error) {
      console.error('Failed to remove staff member:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to remove staff member',
        variant: "destructive"
      });
    } finally {
      setIsLoading(prev => ({ ...prev, [`delete-${id}`]: false }));
    }
  };





  const handleResendInvitation = async (staffMember: StaffMemberWithBargainingUnits) => {
    if (!staffMember.name || !staffMember.email) {
      toast({
        title: "Error",
        description: "Staff member missing required information",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(prev => ({ ...prev, [`resend-${staffMember.id}`]: true }));
    
    try {
      const result = await inviteStaffMember({
        name: staffMember.name,
        email: staffMember.email,
        role: staffMember.role,
        bargainingUnitIds: staffMember.bargainingUnits.map(bu => bu.id)
      });

      if (result.success) {
        toast({
          title: "Success",
          description: "Invitation resent successfully"
        });
      } else {
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Failed to resend invitation:', error);
      toast({
        title: "Error",
        description: "Failed to resend invitation. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(prev => ({ ...prev, [`resend-${staffMember.id}`]: false }));
    }
  };

  const handleCancelInvitation = async (staffMember: StaffMemberWithBargainingUnits) => {
    if (!confirm(`Are you sure you want to cancel the invitation for ${staffMember.name || staffMember.email}?`)) {
      return;
    }

    setIsLoading(prev => ({ ...prev, [`cancel-${staffMember.id}`]: true }));
    
    try {
      // Call API to cancel invitation (clear pending fields)
      const response = await fetch('/api/invitation/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: staffMember.userId }),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Invitation cancelled successfully"
        });
        // Refresh the staff list
        window.location.reload();
      } else {
        const data = await response.json();
        toast({
          title: "Error",
          description: data.error || "Failed to cancel invitation",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Failed to cancel invitation:', error);
      toast({
        title: "Error",
        description: "Failed to cancel invitation. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(prev => ({ ...prev, [`cancel-${staffMember.id}`]: false }));
    }
  };

  return (
    <>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Staff Management
          </h1>
          <p className="text-gray-500 mt-1">
            Manage organization staff members and their bargaining unit assignments
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/product/settings/staff/invite">
            <Button className="shadow-md transition-all">
              <Plus className="h-4 w-4 mr-2" />
              Invite Staff Member
            </Button>
          </Link>
        </div>
      </div>


      <Card className="border-0 shadow-sm bg-white/50 backdrop-blur-sm">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-4">
            <div className="flex items-center gap-4">
              <div className="text-sm text-muted-foreground">
                {staff.length} staff member{staff.length !== 1 ? 's' : ''}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative min-w-0 flex-1 sm:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search staff members..."
                  className="pl-10 pr-4 h-10 border-slate-200 bg-white/80 backdrop-blur-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-slate-200 bg-slate-50/80">
                <TableHead className="py-2 font-semibold text-slate-700">Name</TableHead>
                <TableHead className="py-2 font-semibold text-slate-700">Email</TableHead>
                <TableHead className="py-2 font-semibold text-slate-700">Phone</TableHead>
                <TableHead className="py-2 font-semibold text-slate-700">Title</TableHead>
                <TableHead className="py-2 font-semibold text-slate-700">Bargaining Units</TableHead>
                <TableHead className="py-2 font-semibold text-slate-700">Status</TableHead>
                <TableHead className="py-2 font-semibold text-slate-700 w-[150px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStaff.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12">
                    <div className="flex flex-col items-center gap-3 text-slate-500">
                      <User className="h-8 w-8 text-slate-400" />
                      <div className="text-lg font-medium">No staff members found</div>
                      <div className="text-sm">{searchTerm ? 'Try adjusting your search criteria' : 'Get started by inviting your first staff member'}</div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredStaff.map((staffMember) => (
                  <TableRow
                    key={staffMember.id}
                    className="border-b border-slate-100 transition-all duration-200 cursor-pointer hover:bg-slate-50/80 group"
                    onClick={(e) => {
                      // Don't navigate if clicking on interactive elements
                      if (e.target instanceof HTMLElement &&
                          (e.target.closest('button') ||
                           e.target.closest('a') ||
                           e.target.closest('form') ||
                           e.target.closest('input') ||
                           e.target.closest('select'))) {
                        return;
                      }
                      // Only navigate for non-pending invitations
                      if (!staffMember.id.startsWith('pending-')) {
                        window.location.href = `/product/settings/staff/${staffMember.id}/edit`;
                      }
                    }}
                  >
                    <TableCell className="py-2">
                      <div className="flex items-center gap-2">
                        {staffMember.role === MemberRole.Admin && (
                          <Crown className="h-5 w-5 text-amber-500" />
                        )}
                        <div className="font-medium text-slate-900">
                          {staffMember.name || 'Unknown'}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-2">
                      <span className="text-sm text-slate-700">
                        {staffMember.email || 'No email'}
                      </span>
                    </TableCell>
                    <TableCell className="py-2">
                      <span className="text-sm text-slate-700">
                        {staffMember.phone ? formatPhoneNumber(staffMember.phone) : '-'}
                      </span>
                    </TableCell>
                    <TableCell className="py-2">
                      <span className="text-sm text-slate-700">
                        {staffMember.title || '-'}
                      </span>
                    </TableCell>
                    <TableCell className="py-2">
                      <div className="flex flex-wrap gap-1">
                        {staffMember.bargainingUnits.length > 0 ? (
                          staffMember.bargainingUnits.map((unit) => (
                            <Badge key={unit.id} variant="outline" className="text-xs font-medium px-2 py-1">
                              {unit.name}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-sm text-slate-500">No assignments</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-2">
                      {(() => {
                        const statusInfo = getInvitationStatus(staffMember);
                        return (
                          <div className="space-y-1">
                            <Badge
                              variant="outline"
                              className={`text-xs font-medium px-2 py-1 ${statusInfo.color}`}
                              title={statusInfo.description}
                            >
                              {statusInfo.icon && <statusInfo.icon className="w-3 h-3 mr-1" />}
                              {statusInfo.status}
                            </Badge>
                            {isHydrated && staffMember.invitedAt && !staffMember.emailVerified && (
                              <div className="text-xs text-slate-500">
                                Invited {formatDateSafely(staffMember.invitedAt)}
                              </div>
                            )}
                            {isHydrated && staffMember.invitationAcceptedAt && (
                              <div className="text-xs text-slate-500">
                                Joined {formatDateSafely(staffMember.invitationAcceptedAt)}
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </TableCell>
                    <TableCell className="py-2 text-right">
                      <div className="flex justify-end gap-3" onClick={(e) => e.stopPropagation()}>
                        {(() => {
                          const isPendingInvitation = staffMember.id.startsWith('pending-');

                          if (isPendingInvitation) {
                            // For pending invitations, show resend and cancel options
                            return (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleResendInvitation(staffMember)}
                                  disabled={isLoading[`resend-${staffMember.id}`]}
                                  title="Resend invitation email"
                                >
                                  <RefreshCw className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleCancelInvitation(staffMember)}
                                  disabled={isLoading[`cancel-${staffMember.id}`]}
                                  title="Cancel invitation"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            );
                          } else {
                            // For active members, show resend (if needed) and delete only
                            return (
                              <>
                                {!staffMember.emailVerified && staffMember.invitedAt && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleResendInvitation(staffMember)}
                                    disabled={isLoading[`resend-${staffMember.id}`]}
                                    title="Resend invitation email"
                                  >
                                    <RefreshCw className="h-4 w-4" />
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeleteStaff(staffMember.id, staffMember.name || 'this user', staffMember.userId)}
                                  disabled={isLoading[`delete-${staffMember.id}`]}
                                  title="Remove from organization"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            );
                          }
                        })()}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>


    </>
  );
}