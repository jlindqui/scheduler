"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatPhoneNumber, formatPhoneInput } from "@/lib/utils";
import {
  Plus,
  Edit,
  Search,
  AlertTriangle,
  FileText,
  Calendar,
  Eye,
} from "lucide-react";

type Member = {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  union: string;
  department: string;
  position: string;
  hireDate: string;
  status: "active" | "inactive" | "on_leave";
  complaintsCount: number;
  grievancesCount: number;
  lastIncident?: string;
};

const mockMembers: Member[] = [
  {
    id: "1",
    employeeId: "EMP001",
    name: "Taylor Smith",
    email: "taylor.smith@example.com",
    phone: "555-123-4567",
    address: "123 Main St, Guelph, ON",
    union: "USW 401",
    department: "Maintenance",
    position: "Maintenance Technician",
    hireDate: "2020-03-15",
    status: "active",
    complaintsCount: 2,
    grievancesCount: 1,
    lastIncident: "2024-01-10",
  },
  {
    id: "2",
    employeeId: "EMP002",
    name: "Jordan Lee",
    email: "jordan.lee@example.com",
    phone: "555-987-6543",
    address: "456 Oak Ave, Guelph, ON",
    union: "CUPE 407",
    department: "Security",
    position: "Security Guard",
    hireDate: "2019-08-22",
    status: "active",
    complaintsCount: 0,
    grievancesCount: 3,
    lastIncident: "2023-12-15",
  },
  {
    id: "3",
    employeeId: "EMP003",
    name: "Alex Johnson",
    email: "alex.johnson@example.com",
    phone: "555-456-7890",
    address: "789 Pine St, Guelph, ON",
    union: "USW 401",
    department: "Facilities",
    position: "Custodian",
    hireDate: "2021-01-10",
    status: "on_leave",
    complaintsCount: 1,
    grievancesCount: 0,
  },
  {
    id: "4",
    employeeId: "EMP004",
    name: "Morgan Davis",
    email: "morgan.davis@example.com",
    phone: "555-321-0987",
    address: "321 Elm St, Guelph, ON",
    union: "CUPE 407",
    department: "Food Services",
    position: "Cook",
    hireDate: "2018-05-30",
    status: "active",
    complaintsCount: 3,
    grievancesCount: 2,
    lastIncident: "2024-01-05",
  },
];

const availableUnions = ["USW 401", "CUPE 407"];
const departments = [
  "Maintenance",
  "Security",
  "Facilities",
  "Food Services",
  "Administration",
  "Grounds",
];

const getStatusBadgeColor = (status: string) => {
  switch (status) {
    case "active":
      return "bg-green-50 text-green-700 border-green-200";
    case "inactive":
      return "bg-red-50 text-red-700 border-red-200";
    case "on_leave":
      return "bg-yellow-50 text-yellow-700 border-yellow-200";
    default:
      return "bg-gray-50 text-gray-700 border-gray-200";
  }
};

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>(mockMembers);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [viewingMember, setViewingMember] = useState<Member | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterUnion, setFilterUnion] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [newMember, setNewMember] = useState<Partial<Member>>({
    status: "active",
  });

  const filteredMembers = members.filter((member) => {
    const matchesSearch =
      member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.employeeId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.department.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesUnion = filterUnion === "all" || member.union === filterUnion;
    const matchesStatus =
      filterStatus === "all" || member.status === filterStatus;

    return matchesSearch && matchesUnion && matchesStatus;
  });

  const handleAddMember = () => {
    if (newMember.name && newMember.email && newMember.union) {
      const member: Member = {
        id: Date.now().toString(),
        employeeId:
          newMember.employeeId || `EMP${Date.now().toString().slice(-4)}`,
        name: newMember.name,
        email: newMember.email,
        phone: newMember.phone || "",
        address: newMember.address || "",
        union: newMember.union,
        department: newMember.department || "",
        position: newMember.position || "",
        hireDate: newMember.hireDate || new Date().toISOString().split("T")[0],
        status: (newMember.status as Member["status"]) || "active",
        complaintsCount: 0,
        grievancesCount: 0,
      };

      setMembers([...members, member]);
      setNewMember({ status: "active" });
      setIsAddDialogOpen(false);
    }
  };

  const handleEditMember = () => {
    if (editingMember) {
      setMembers(
        members.map((m) => (m.id === editingMember.id ? editingMember : m))
      );
      setEditingMember(null);
      setIsEditDialogOpen(false);
    }
  };

  const handleDeleteMember = (id: string) => {
    setMembers(members.filter((m) => m.id !== id));
  };

  const openEditDialog = (member: Member) => {
    setEditingMember({ ...member });
    setIsEditDialogOpen(true);
  };

  const openViewDialog = (member: Member) => {
    setViewingMember(member);
    setIsViewDialogOpen(true);
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight">
            Members / Employees
          </h1>
          <p className="text-muted-foreground">
            Manage unionized workers and their complaint/grievance history.
          </p>
        </div>

        <Tabs defaultValue="list" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="list">Member List</TabsTrigger>
            <TabsTrigger disabled value="upload">Bulk Upload</TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="space-y-6">
            {/* Filters and Search */}
            <Card>
              <CardHeader>
                <CardTitle>Filters</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search members..."
                      className="pl-8"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <Select value={filterUnion} onValueChange={setFilterUnion}>
                    <SelectTrigger className="w-full md:w-[180px]">
                      <SelectValue placeholder="Filter by union" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Unions</SelectItem>
                      {availableUnions.map((union) => (
                        <SelectItem key={union} value={union}>
                          {union}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-full md:w-[180px]">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="on_leave">On Leave</SelectItem>
                    </SelectContent>
                  </Select>
                  <Dialog
                    open={isAddDialogOpen}
                    onOpenChange={setIsAddDialogOpen}
                  >
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Member
                      </Button>
                    </DialogTrigger>
                  </Dialog>
                </div>
              </CardContent>
            </Card>

            {/* Members Table */}
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Member</TableHead>
                      {/* <TableHead>Employee ID</TableHead> */}
                      <TableHead>Union</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Complaints</TableHead>
                      <TableHead>Grievances</TableHead>
                      <TableHead>Last Incident</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMembers.map((member) => (
                      <TableRow key={member.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {/* <Avatar className="h-8 w-8">
                              <AvatarImage
                                src={`/placeholder.svg?height=32&width=32`}
                                alt={member.name}
                              />
                              <AvatarFallback>
                                {getInitials(member.name)}
                              </AvatarFallback>
                            </Avatar> */}
                            <div>
                              <div className="font-medium">{member.name}</div>
                              {/* <div className="text-sm text-muted-foreground">
                                {member.email}
                              </div> */}
                            </div>
                          </div>
                        </TableCell>
                        {/* <TableCell className="font-mono">
                          {member.employeeId}
                        </TableCell> */}
                        <TableCell>
                          <Badge variant="outline">{member.union}</Badge>
                        </TableCell>
                        <TableCell>{member.department}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={getStatusBadgeColor(member.status)}
                          >
                            {member.status.replace("_", " ")}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {member.complaintsCount > 0 && (
                              <AlertTriangle className="h-4 w-4 text-orange-500" />
                            )}
                            <span>{member.complaintsCount}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {member.grievancesCount > 0 && (
                              <FileText className="h-4 w-4 text-red-500" />
                            )}
                            <span>{member.grievancesCount}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {member.lastIncident ? (
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">
                                {member.lastIncident}
                              </span>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">
                              None
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openViewDialog(member)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditDialog(member)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            {/* <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteMember(member.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button> */}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* <TabsContent value="upload" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Bulk Upload Members</CardTitle>
                <CardDescription>
                  Upload a spreadsheet with member information.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-12">
                  <FileUp className="h-8 w-8 text-muted-foreground mb-4" />
                  <div className="space-y-2 text-center">
                    <h3 className="text-lg font-semibold">
                      Upload Spreadsheet
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Drag and drop your spreadsheet file here or click to
                      browse
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Supported formats: .xlsx, .csv
                    </p>
                  </div>
                  <Button variant="outline" className="mt-4">
                    <Upload className="mr-2 h-4 w-4" />
                    Browse Files
                  </Button>
                </div>

                <div>
                  <h4 className="text-sm font-medium mb-2">Template Format</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    Your spreadsheet should include the following columns:
                  </p>
                  <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
                    <li>Employee ID</li>
                    <li>Name</li>
                    <li>Email</li>
                    <li>Phone</li>
                    <li>Address</li>
                    <li>Union/Local</li>
                    <li>Department</li>
                    <li>Position</li>
                    <li>Hire Date</li>
                    <li>Status</li>
                  </ul>
                  <Button variant="link" className="p-0 h-auto mt-2">
                    <Download className="mr-2 h-4 w-4" />
                    Download Template
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent> */}
        </Tabs>

        {/* Add Member Dialog */}
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Member</DialogTitle>
              <DialogDescription>
                Add a new unionized worker to the system.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="employeeId">Employee ID</Label>
                  <Input
                    id="employeeId"
                    value={newMember.employeeId || ""}
                    onChange={(e) =>
                      setNewMember({ ...newMember, employeeId: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={newMember.name || ""}
                    onChange={(e) =>
                      setNewMember({ ...newMember, name: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newMember.email || ""}
                    onChange={(e) =>
                      setNewMember({ ...newMember, email: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={newMember.phone || ""}
                    onChange={(e) =>
                      setNewMember({ ...newMember, phone: e.target.value })
                    }
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={newMember.address || ""}
                  onChange={(e) =>
                    setNewMember({ ...newMember, address: e.target.value })
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="union">Union/Local *</Label>
                  <Select
                    onValueChange={(value) =>
                      setNewMember({ ...newMember, union: value })
                    }
                    value={newMember.union}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a union" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableUnions.map((union) => (
                        <SelectItem key={union} value={union}>
                          {union}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="department">Department</Label>
                  <Select
                    onValueChange={(value) =>
                      setNewMember({ ...newMember, department: value })
                    }
                    value={newMember.department}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((dept) => (
                        <SelectItem key={dept} value={dept}>
                          {dept}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="position">Position</Label>
                  <Input
                    id="position"
                    value={newMember.position || ""}
                    onChange={(e) =>
                      setNewMember({ ...newMember, position: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="hireDate">Hire Date</Label>
                  <Input
                    id="hireDate"
                    type="date"
                    value={newMember.hireDate || ""}
                    onChange={(e) =>
                      setNewMember({ ...newMember, hireDate: e.target.value })
                    }
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="status">Status</Label>
                <Select
                  onValueChange={(value) =>
                    setNewMember({
                      ...newMember,
                      status: value as Member["status"],
                    })
                  }
                  value={newMember.status}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="on_leave">On Leave</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsAddDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleAddMember}>Add Member</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Member Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Member</DialogTitle>
              <DialogDescription>
                Update the member's information.
              </DialogDescription>
            </DialogHeader>
            {editingMember && (
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-employeeId">Employee ID</Label>
                    <Input
                      id="edit-employeeId"
                      value={editingMember.employeeId}
                      onChange={(e) =>
                        setEditingMember({
                          ...editingMember,
                          employeeId: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-name">Name</Label>
                    <Input
                      id="edit-name"
                      value={editingMember.name}
                      onChange={(e) =>
                        setEditingMember({
                          ...editingMember,
                          name: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-email">Email</Label>
                    <Input
                      id="edit-email"
                      type="email"
                      value={editingMember.email}
                      onChange={(e) =>
                        setEditingMember({
                          ...editingMember,
                          email: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-phone">Phone</Label>
                    <Input
                      id="edit-phone"
                      value={editingMember.phone}
                      onChange={(e) =>
                        setEditingMember({
                          ...editingMember,
                          phone: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="edit-address">Address</Label>
                  <Input
                    id="edit-address"
                    value={editingMember.address}
                    onChange={(e) =>
                      setEditingMember({
                        ...editingMember,
                        address: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-union">Union/Local</Label>
                    <Select
                      onValueChange={(value) =>
                        setEditingMember({ ...editingMember, union: value })
                      }
                      value={editingMember.union}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {availableUnions.map((union) => (
                          <SelectItem key={union} value={union}>
                            {union}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="edit-department">Department</Label>
                    <Select
                      onValueChange={(value) =>
                        setEditingMember({
                          ...editingMember,
                          department: value,
                        })
                      }
                      value={editingMember.department}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {departments.map((dept) => (
                          <SelectItem key={dept} value={dept}>
                            {dept}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-position">Position</Label>
                    <Input
                      id="edit-position"
                      value={editingMember.position}
                      onChange={(e) =>
                        setEditingMember({
                          ...editingMember,
                          position: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-status">Status</Label>
                    <Select
                      onValueChange={(value) =>
                        setEditingMember({
                          ...editingMember,
                          status: value as Member["status"],
                        })
                      }
                      value={editingMember.status}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                        <SelectItem value="on_leave">On Leave</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleEditMember}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* View Member Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Member Details</DialogTitle>
              <DialogDescription>
                View member information and complaint/grievance history.
              </DialogDescription>
            </DialogHeader>
            {viewingMember && (
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage
                      src={`/placeholder.svg?height=64&width=64`}
                      alt={viewingMember.name}
                    />
                    <AvatarFallback className="text-lg">
                      {getInitials(viewingMember.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="text-lg font-semibold">
                      {viewingMember.name}
                    </h3>
                    <p className="text-muted-foreground">
                      {viewingMember.position}
                    </p>
                    <Badge
                      variant="outline"
                      className={getStatusBadgeColor(viewingMember.status)}
                    >
                      {viewingMember.status.replace("_", " ")}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Employee ID</Label>
                    <p className="font-mono">{viewingMember.employeeId}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Union</Label>
                    <p>{viewingMember.union}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Department</Label>
                    <p>{viewingMember.department}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Hire Date</Label>
                    <p>{viewingMember.hireDate}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Email</Label>
                    <p>{viewingMember.email}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Phone</Label>
                    <p>{formatPhoneNumber(viewingMember.phone)}</p>
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium">Address</Label>
                  <p>{viewingMember.address}</p>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <AlertTriangle className="h-5 w-5 text-orange-500" />
                        <span className="text-2xl font-bold">
                          {viewingMember.complaintsCount}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Complaints
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <FileText className="h-5 w-5 text-red-500" />
                        <span className="text-2xl font-bold">
                          {viewingMember.grievancesCount}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Grievances
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <Calendar className="h-5 w-5 text-blue-500" />
                        <span className="text-sm font-medium">
                          {viewingMember.lastIncident || "None"}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Last Incident
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsViewDialogOpen(false)}
              >
                Close
              </Button>
              <Button
                onClick={() => {
                  setIsViewDialogOpen(false);
                  if (viewingMember) openEditDialog(viewingMember);
                }}
              >
                Edit Member
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
