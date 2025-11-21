"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Plus, Trash2, Edit, Upload, FileUp, Download, Search } from "lucide-react"

type Employee = {
  id: string
  employeeId: string
  name: string
  email: string
  phone: string
  address: string
  union: string
}

const mockEmployees: Employee[] = [
  {
    id: "1",
    employeeId: "EMP001",
    name: "Taylor Smith",
    email: "taylor.smith@example.com",
    phone: "555-123-4567",
    address: "123 Main St, Guelph, ON",
    union: "USW 401",
  },
  {
    id: "2",
    employeeId: "EMP002",
    name: "Jordan Lee",
    email: "jordan.lee@example.com",
    phone: "555-987-6543",
    address: "456 Oak Ave, Guelph, ON",
    union: "CUPE 407",
  },
]

export function EmployeeSettings() {
  const [employees, setEmployees] = useState<Employee[]>(mockEmployees)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [newEmployee, setNewEmployee] = useState<Partial<Employee>>({})
  const [searchTerm, setSearchTerm] = useState("")

  const handleAddEmployee = () => {
    if (newEmployee.name && newEmployee.email && newEmployee.union) {
      const employee: Employee = {
        id: Date.now().toString(),
        employeeId: newEmployee.employeeId || `EMP${Date.now().toString().slice(-4)}`,
        name: newEmployee.name,
        email: newEmployee.email,
        phone: newEmployee.phone || "",
        address: newEmployee.address || "",
        union: newEmployee.union,
      }

      setEmployees([...employees, employee])
      setNewEmployee({})
      setIsAddDialogOpen(false)
    }
  }

  const handleDeleteEmployee = (id: string) => {
    setEmployees(employees.filter((employee) => employee.id !== id))
  }

  const filteredEmployees = employees.filter(
    (employee) =>
      employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.employeeId.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Employee Directory</h3>
        <p className="text-sm text-muted-foreground">Manage employee information and union assignments.</p>
      </div>
      <Separator />

      <Tabs defaultValue="list" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="list">Employee List</TabsTrigger>
          <TabsTrigger value="upload">Bulk Upload</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search employees..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Employee
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Employee</DialogTitle>
                  <DialogDescription>Enter the details for the new employee.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="employeeId" className="text-right">
                      Employee ID
                    </Label>
                    <Input
                      id="employeeId"
                      value={newEmployee.employeeId || ""}
                      onChange={(e) => setNewEmployee({ ...newEmployee, employeeId: e.target.value })}
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="name" className="text-right">
                      Name
                    </Label>
                    <Input
                      id="name"
                      value={newEmployee.name || ""}
                      onChange={(e) => setNewEmployee({ ...newEmployee, name: e.target.value })}
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
                      value={newEmployee.email || ""}
                      onChange={(e) => setNewEmployee({ ...newEmployee, email: e.target.value })}
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="phone" className="text-right">
                      Phone
                    </Label>
                    <Input
                      id="phone"
                      value={newEmployee.phone || ""}
                      onChange={(e) => setNewEmployee({ ...newEmployee, phone: e.target.value })}
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="address" className="text-right">
                      Address
                    </Label>
                    <Input
                      id="address"
                      value={newEmployee.address || ""}
                      onChange={(e) => setNewEmployee({ ...newEmployee, address: e.target.value })}
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="union" className="text-right">
                      Union/Local
                    </Label>
                    <Select
                      onValueChange={(value) => setNewEmployee({ ...newEmployee, union: value })}
                      value={newEmployee.union}
                    >
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Select a union" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USW 401">USW 401</SelectItem>
                        <SelectItem value="CUPE 407">CUPE 407</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddEmployee}>Add Employee</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Union/Local</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmployees.map((employee) => (
                    <TableRow key={employee.id}>
                      <TableCell>{employee.employeeId}</TableCell>
                      <TableCell className="font-medium">{employee.name}</TableCell>
                      <TableCell>{employee.email}</TableCell>
                      <TableCell>{employee.phone}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{employee.union}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button variant="ghost" size="icon">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteEmployee(employee.id)}>
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
        </TabsContent>

        <TabsContent value="upload" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Bulk Upload Employees</CardTitle>
              <CardDescription>Upload a spreadsheet with employee information.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-12">
                <FileUp className="h-8 w-8 text-muted-foreground mb-4" />
                <div className="space-y-2 text-center">
                  <h3 className="text-lg font-semibold">Upload Spreadsheet</h3>
                  <p className="text-sm text-muted-foreground">
                    Drag and drop your spreadsheet file here or click to browse
                  </p>
                  <p className="text-xs text-muted-foreground">Supported formats: .xlsx, .csv</p>
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
                </ul>
                <Button variant="link" className="p-0 h-auto mt-2">
                  <Download className="mr-2 h-4 w-4" />
                  Download Template
                </Button>
              </div>
            </CardContent>
            <CardFooter>
              <Select>
                <SelectTrigger className="w-[180px] mr-4">
                  <SelectValue placeholder="Select union" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USW 401">USW 401</SelectItem>
                  <SelectItem value="CUPE 407">CUPE 407</SelectItem>
                </SelectContent>
              </Select>
              <Button className="ml-auto">Upload and Process</Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
