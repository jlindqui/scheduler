"use client";

import { useState } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, Edit, Mail, Shield, Search } from "lucide-react";

type StaffRole = "admin" | "manager" | "staff" | "viewer";

type Staff = {
  id: string;
  name: string;
  email: string;
  role: StaffRole;
  unions: string[];
  invited: boolean;
  lastLogin?: string;
  permissions: string[];
};

const mockStaff: Staff[] = [
  {
    id: "1",
    name: "Faiz Mustansar",
    email: "faizmustansar10@gmail.com",
    role: "admin",
    unions: ["USW 401"],
    invited: true,
    lastLogin: "2024-01-15",
    permissions: [
      "manage_complaints",
      "manage_grievances",
      "manage_staff",
      "view_reports",
    ],
  },
  {
    id: "2",
    name: "Sam Williams",
    email: "sam.williams@example.com",
    role: "manager",
    unions: ["CUPE 407", "USW 401"],
    invited: true,
    lastLogin: "2024-01-14",
    permissions: ["manage_complaints", "manage_grievances", "view_reports"],
  },
  {
    id: "3",
    name: "Joe Sawada",
    email: "joesawada@gmail.com",
    role: "staff",
    unions: ["CUPE 407"],
    invited: false,
    permissions: ["view_complaints", "view_grievances"],
  },
  {
    id: "4",
    name: "Levi Cooperman",
    email: "levicooperman@gmail.com",
    role: "staff",
    unions: ["USW 401"],
    invited: false,
    permissions: ["view_complaints", "view_grievances"],
  },
  {
    id: "5",
    name: "Jeff Lindquist",
    email: "jlindqui@gmail.com",
    role: "viewer",
    unions: ["CUPE 407", "USW 401"],
    invited: true,
    lastLogin: "2024-01-10",
    permissions: ["view_reports"],
  },
];

const availableUnions = ["USW 401", "CUPE 407"];

const rolePermissions = {
  admin: [
    "manage_complaints",
    "manage_grievances",
    "manage_staff",
    "manage_unions",
    "view_reports",
    "manage_settings",
  ],
  manager: [
    "manage_complaints",
    "manage_grievances",
    "view_reports",
    "manage_employees",
  ],
  staff: [
    "view_complaints",
    "view_grievances",
    "create_complaints",
    "create_grievances",
  ],
  viewer: ["view_reports", "view_complaints", "view_grievances"],
};

const getRoleBadgeColor = (role: StaffRole) => {
  switch (role) {
    case "admin":
      return "bg-red-50 text-red-700 border-red-200";
    case "manager":
      return "bg-blue-50 text-blue-700 border-blue-200";
    case "staff":
      return "bg-green-50 text-green-700 border-green-200";
    case "viewer":
      return "bg-gray-50 text-gray-700 border-gray-200";
    default:
      return "bg-gray-50 text-gray-700 border-gray-200";
  }
};

export function StaffSettings() {
  const [staff, setStaff] = useState<Staff[]>(mockStaff);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [newStaff, setNewStaff] = useState<Partial<Staff>>({
    unions: [],
    role: "staff",
    permissions: [],
  });

  const filteredStaff = staff.filter(
    (member) =>
      member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddStaff = () => {
    if (newStaff.name && newStaff.email && newStaff.role) {
      const staffMember: Staff = {
        id: Date.now().toString(),
        name: newStaff.name,
        email: newStaff.email,
        role: newStaff.role as StaffRole,
        unions: newStaff.unions || [],
        invited: false,
        permissions: rolePermissions[newStaff.role as StaffRole] || [],
      };

      setStaff([...staff, staffMember]);
      setNewStaff({ unions: [], role: "staff", permissions: [] });
      setIsAddDialogOpen(false);
    }
  };

  const handleEditStaff = () => {
    if (editingStaff) {
      setStaff(staff.map((s) => (s.id === editingStaff.id ? editingStaff : s)));
      setEditingStaff(null);
      setIsEditDialogOpen(false);
    }
  };

  const handleDeleteStaff = (id: string) => {
    setStaff(staff.filter((s) => s.id !== id));
  };

  const handleSendInvite = (id: string) => {
    // we can later on edit this and actually send an email to the user
    setStaff(staff.map((s) => (s.id === id ? { ...s, invited: true } : s)));
  };

  const toggleUnion = (unionName: string, isEditing = false) => {
    if (isEditing && editingStaff) {
      const unions = editingStaff.unions || [];
      setEditingStaff({
        ...editingStaff,
        unions: unions.includes(unionName)
          ? unions.filter((u) => u !== unionName)
          : [...unions, unionName],
      });
    } else {
      setNewStaff((prev) => {
        const unions = prev.unions || [];
        return {
          ...prev,
          unions: unions.includes(unionName)
            ? unions.filter((u) => u !== unionName)
            : [...unions, unionName],
        };
      });
    }
  };

  const handleRoleChange = (role: StaffRole, isEditing = false) => {
    const permissions = rolePermissions[role] || [];
    if (isEditing && editingStaff) {
      setEditingStaff({
        ...editingStaff,
        role,
        permissions,
      });
    } else {
      setNewStaff({
        ...newStaff,
        role,
        permissions,
      });
    }
  };

  const openEditDialog = (staffMember: Staff) => {
    setEditingStaff({ ...staffMember });
    setIsEditDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Staff Management</h3>
        <p className="text-sm text-muted-foreground">
          Manage platform users including labour directors, union stewards, and
          other staff members who use the B&B AI system.
        </p>
      </div>
      <Separator />

      <div className="flex justify-between items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search staff members..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Add Staff Member
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Staff Member</DialogTitle>
              <DialogDescription>
                Add a new platform user who will have access to the B&B AI
                system.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Name
                </Label>
                <Input
                  id="name"
                  value={newStaff.name || ""}
                  onChange={(e) =>
                    setNewStaff({ ...newStaff, name: e.target.value })
                  }
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="email" className="text-right">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={newStaff.email || ""}
                  onChange={(e) =>
                    setNewStaff({ ...newStaff, email: e.target.value })
                  }
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="role" className="text-right">
                  Role
                </Label>
                <Select
                  onValueChange={(value) =>
                    handleRoleChange(value as StaffRole)
                  }
                  value={newStaff.role}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">
                      Admin - Full system access
                    </SelectItem>
                    <SelectItem value="manager">
                      Manager - Manage complaints & grievances
                    </SelectItem>
                    <SelectItem value="staff">
                      Staff - Handle day-to-day operations
                    </SelectItem>
                    <SelectItem value="viewer">
                      Viewer - Read-only access
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-start gap-4">
                <Label className="text-right pt-2">Assign Unions</Label>
                <div className="col-span-3 space-y-2">
                  {availableUnions.map((union) => (
                    <div key={union} className="flex items-center space-x-2">
                      <Checkbox
                        id={`union-${union}`}
                        checked={(newStaff.unions || []).includes(union)}
                        onCheckedChange={() => toggleUnion(union)}
                      />
                      <Label htmlFor={`union-${union}`}>{union}</Label>
                    </div>
                  ))}
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="all-unions"
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setNewStaff({
                            ...newStaff,
                            unions: [...availableUnions],
                          });
                        } else {
                          setNewStaff({ ...newStaff, unions: [] });
                        }
                      }}
                    />
                    <Label htmlFor="all-unions">Assign to all unions</Label>
                  </div>
                </div>
              </div>
              {newStaff.role && (
                <div className="grid grid-cols-4 items-start gap-4">
                  <Label className="text-right pt-2">Permissions</Label>
                  <div className="col-span-3">
                    <div className="flex flex-wrap gap-2">
                      {rolePermissions[newStaff.role as StaffRole]?.map(
                        (permission) => (
                          <Badge
                            key={permission}
                            variant="outline"
                            className="text-xs"
                          >
                            {permission.replace("_", " ")}
                          </Badge>
                        )
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Permissions are automatically assigned based on the
                      selected role.
                    </p>
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsAddDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleAddStaff}>Add Staff Member</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Assigned Unions</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Login</TableHead>
                <TableHead className="w-[150px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStaff.map((staffMember) => (
                <TableRow key={staffMember.id}>
                  <TableCell className="font-medium">
                    {staffMember.name}
                  </TableCell>
                  <TableCell>{staffMember.email}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={getRoleBadgeColor(staffMember.role)}
                    >
                      <Shield className="w-3 h-3 mr-1" />
                      {staffMember.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {staffMember.unions.map((union) => (
                        <Badge key={union} variant="outline">
                          {union}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    {staffMember.invited ? (
                      <Badge
                        variant="outline"
                        className="bg-green-50 text-green-700 border-green-200"
                      >
                        Active
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="bg-yellow-50 text-yellow-700 border-yellow-200"
                      >
                        Pending Invite
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {staffMember.lastLogin ? (
                      <span className="text-sm text-muted-foreground">
                        {staffMember.lastLogin}
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        Never
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={staffMember.invited}
                        onClick={() => handleSendInvite(staffMember.id)}
                        title="Send Invite"
                      >
                        <Mail className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(staffMember)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteStaff(staffMember.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Staff/Legal</DialogTitle>
            <DialogDescription>
              Update the staff/legals's information and permissions.
            </DialogDescription>
          </DialogHeader>
          {editingStaff && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-name" className="text-right">
                  Name
                </Label>
                <Input
                  id="edit-name"
                  value={editingStaff.name}
                  onChange={(e) =>
                    setEditingStaff({ ...editingStaff, name: e.target.value })
                  }
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-email" className="text-right">
                  Email
                </Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editingStaff.email}
                  onChange={(e) =>
                    setEditingStaff({ ...editingStaff, email: e.target.value })
                  }
                  className="col-span-3"
                />
              </div>
              {/* <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-role" className="text-right">
                  Role
                </Label>
                <Select
                  onValueChange={(value) =>
                    handleRoleChange(value as StaffRole, true)
                  }
                  value={editingStaff.role}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">
                      Admin - Full system access
                    </SelectItem>
                    <SelectItem value="manager">
                      Manager - Manage complaints & grievances
                    </SelectItem>
                    <SelectItem value="staff">
                      Staff - Handle day-to-day operations
                    </SelectItem>
                    <SelectItem value="viewer">
                      Viewer - Read-only access
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div> */}
              <div className="grid grid-cols-4 items-start gap-4">
                <Label className="text-right pt-2">Bargaining Units</Label>
                <div className="col-span-3 space-y-2">
                  {availableUnions.map((union) => (
                    <div key={union} className="flex items-center space-x-2">
                      <Checkbox
                        id={`edit-union-${union}`}
                        checked={editingStaff.unions.includes(union)}
                        onCheckedChange={() => toggleUnion(union, true)}
                      />
                      <Label htmlFor={`edit-union-${union}`}>{union}</Label>
                    </div>
                  ))}
                </div>
              </div>
              {/* <div className="grid grid-cols-4 items-start gap-4">
                <Label className="text-right pt-2">Permissions</Label>
                <div className="col-span-3">
                  <div className="flex flex-wrap gap-2">
                    {editingStaff.permissions.map((permission) => (
                      <Badge
                        key={permission}
                        variant="outline"
                        className="text-xs"
                      >
                        {permission.replace("_", " ")}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div> */}
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleEditStaff}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
