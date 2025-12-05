'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Shield, UserPlus, Settings, Trash2, Crown } from 'lucide-react';
import { formatSmartDateTime } from '@/lib/utils';
import {
  toggleUserSuperAdmin,
  addUserToOrganization,
  updateUserOrganizationRole,
  removeUserFromOrganization,
} from '@/app/actions/prisma/user-management-actions';
import { useToast } from '@/hooks/use-toast';
import { MemberRole } from '@/app/lib/definitions';

type User = {
  id: string;
  name: string | null;
  email: string | null;
  isSuperAdmin: boolean;
  createdAt: Date;
  currentOrganizationId: string | null;
  organizations: {
    id: string;
    role: MemberRole;
    organization: {
      id: string;
      name: string;
    };
  }[];
};

type Organization = {
  id: string;
  name: string;
};

interface UserManagementTableProps {
  users: User[];
  organizations: Organization[];
}

export function UserManagementTable({ users, organizations }: UserManagementTableProps) {
  const { toast } = useToast();
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isAddingToOrg, setIsAddingToOrg] = useState(false);
  const [selectedOrganization, setSelectedOrganization] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<MemberRole>(MemberRole.EMPLOYEE);
  const [isLoading, setIsLoading] = useState<string | null>(null);

  const handleToggleSuperAdmin = async (userId: string, currentStatus: boolean) => {
    const loadingKey = `toggle-admin-${userId}`;
    setIsLoading(loadingKey);
    
    try {
      await toggleUserSuperAdmin(userId, !currentStatus);
      toast({
        title: 'Success',
        description: `User ${!currentStatus ? 'granted' : 'removed'} super admin status.`,
      });
    } catch (error) {
      console.error('Failed to toggle super admin status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update super admin status. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(null);
    }
  };

  const handleAddToOrganization = async () => {
    if (!selectedUser || !selectedOrganization) return;

    const loadingKey = `add-org-${selectedUser.id}`;
    setIsLoading(loadingKey);

    try {
      await addUserToOrganization(selectedUser.id, selectedOrganization, selectedRole);
      const orgName = organizations.find(org => org.id === selectedOrganization)?.name || 'organization';
      toast({
        title: 'Success',
        description: `User added to ${orgName} as ${selectedRole}.`,
      });
      setIsAddingToOrg(false);
      setSelectedOrganization('');
      setSelectedRole(MemberRole.EMPLOYEE);
    } catch (error) {
      console.error('Failed to add user to organization:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to add user to organization. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(null);
    }
  };

  const handleUpdateRole = async (userId: string, organizationId: string, newRole: MemberRole) => {
    const loadingKey = `update-role-${userId}-${organizationId}`;
    setIsLoading(loadingKey);

    try {
      await updateUserOrganizationRole(userId, organizationId, newRole);
      const orgName = organizations.find(org => org.id === organizationId)?.name || 'organization';
      toast({
        title: 'Success',
        description: `User role updated to ${newRole} in ${orgName}.`,
      });
    } catch (error) {
      console.error('Failed to update user role:', error);
      toast({
        title: 'Error',
        description: 'Failed to update user role. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(null);
    }
  };

  const handleRemoveFromOrganization = async (userId: string, organizationId: string) => {
    const loadingKey = `remove-org-${userId}-${organizationId}`;
    setIsLoading(loadingKey);

    try {
      await removeUserFromOrganization(userId, organizationId);
      const orgName = organizations.find(org => org.id === organizationId)?.name || 'organization';
      toast({
        title: 'Success',
        description: `User removed from ${orgName}.`,
      });
    } catch (error) {
      console.error('Failed to remove user from organization:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove user from organization. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(null);
    }
  };

  const getAvailableOrganizations = (user: User | null) => {
    if (!user || !user.organizations) return organizations;
    const userOrgIds = user.organizations.map(org => org.organization.id);
    return organizations.filter(org => !userOrgIds.includes(org.id));
  };

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Super Admin</TableHead>
            <TableHead>Organizations</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell>
                <div className="flex items-center gap-2">
                  {user.isSuperAdmin && <Crown className="h-4 w-4 text-yellow-500" />}
                  <span className="font-medium">{user.name || 'Unknown'}</span>
                </div>
              </TableCell>
              <TableCell>{user.email}</TableCell>
              <TableCell>
                <Button
                  variant={user.isSuperAdmin ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleToggleSuperAdmin(user.id, user.isSuperAdmin)}
                  disabled={isLoading === `toggle-admin-${user.id}`}
                  className="flex items-center gap-1"
                >
                  <Shield className="h-3 w-3" />
                  {isLoading === `toggle-admin-${user.id}` ? 'Updating...' : (user.isSuperAdmin ? 'Yes' : 'No')}
                </Button>
              </TableCell>
              <TableCell>
                <div className="space-y-1">
                  {user.organizations.map((membership) => (
                    <div key={membership.organization.id} className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {membership.organization.name}
                      </Badge>
                      <Select
                        value={membership.role}
                        onValueChange={(value: MemberRole) =>
                          handleUpdateRole(user.id, membership.organization.id, value)
                        }
                        disabled={isLoading === `update-role-${user.id}-${membership.organization.id}`}
                      >
                        <SelectTrigger className="w-28 h-6 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={MemberRole.EMPLOYEE}>Employee</SelectItem>
                          <SelectItem value={MemberRole.MANAGER}>Manager</SelectItem>
                          <SelectItem value={MemberRole.ADMIN}>Admin</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveFromOrganization(user.id, membership.organization.id)}
                        disabled={isLoading === `remove-org-${user.id}-${membership.organization.id}`}
                        className="h-6 w-6 p-0"
                        title="Remove from organization"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </TableCell>
              <TableCell>{formatSmartDateTime(user.createdAt)}</TableCell>
              <TableCell>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedUser(user)}
                      className="flex items-center gap-1"
                    >
                      <UserPlus className="h-3 w-3" />
                      Add to Org
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add User to Organization</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium">User</label>
                        <p className="text-sm text-muted-foreground">
                          {selectedUser?.name} ({selectedUser?.email})
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Organization</label>
                        <Select value={selectedOrganization} onValueChange={setSelectedOrganization}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select organization" />
                          </SelectTrigger>
                          <SelectContent>
                            {getAvailableOrganizations(selectedUser).map((org) => (
                              <SelectItem key={org.id} value={org.id}>
                                {org.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Role</label>
                        <Select value={selectedRole} onValueChange={(value: MemberRole) => setSelectedRole(value)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={MemberRole.EMPLOYEE}>Employee</SelectItem>
                            <SelectItem value={MemberRole.MANAGER}>Manager</SelectItem>
                            <SelectItem value={MemberRole.ADMIN}>Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button 
                        onClick={handleAddToOrganization} 
                        disabled={!selectedOrganization || isLoading === `add-org-${selectedUser?.id}`}
                      >
                        {isLoading === `add-org-${selectedUser?.id}` ? 'Adding...' : 'Add to Organization'}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}