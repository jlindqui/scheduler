"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Building, Plus, Upload, Trash2, Edit, FileUp } from 'lucide-react'

type Union = {
  id: string
  name: string
  contactName: string
  contactEmail: string
  contactPhone: string
  contactAddress: string
}

const mockUnions: Union[] = [
  {
    id: "1",
    name: "USW 401",
    contactName: "Jane Smith",
    contactEmail: "jane.smith@usw401.org",
    contactPhone: "555-123-4567",
    contactAddress: "123 Union St, Guelph, ON"
  },
  {
    id: "2",
    name: "CUPE 407",
    contactName: "John Brown",
    contactEmail: "john.brown@cupe407.org",
    contactPhone: "555-987-6543",
    contactAddress: "456 Labor Ave, Guelph, ON"
  }
]

export function UnionSettings() {
  const [unions, setUnions] = useState<Union[]>(mockUnions)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [newUnion, setNewUnion] = useState<Partial<Union>>({})

  const handleAddUnion = () => {
    if (newUnion.name && newUnion.contactName && newUnion.contactEmail) {
      const union: Union = {
        id: Date.now().toString(),
        name: newUnion.name,
        contactName: newUnion.contactName,
        contactEmail: newUnion.contactEmail,
        contactPhone: newUnion.contactPhone || "",
        contactAddress: newUnion.contactAddress || ""
      }
      
      setUnions([...unions, union])
      setNewUnion({})
      setIsAddDialogOpen(false)
    }
  }

  const handleDeleteUnion = (id: string) => {
    setUnions(unions.filter(union => union.id !== id))
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Union/Local Management</h3>
        <p className="text-sm text-muted-foreground">
          Manage unions and locals associated with your organization.
        </p>
      </div>
      <Separator />
      
      <Tabs defaultValue="list" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="list">Union List</TabsTrigger>
          <TabsTrigger value="upload">Bulk Upload</TabsTrigger>
        </TabsList>
        
        <TabsContent value="list" className="space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="text-sm font-medium">Unions/Locals</h4>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Union
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Union</DialogTitle>
                  <DialogDescription>
                    Enter the details for the new union or local.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="name" className="text-right">
                      Name
                    </Label>
                    <Input
                      id="name"
                      value={newUnion.name || ""}
                      onChange={(e) => setNewUnion({...newUnion, name: e.target.value})}
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="contactName" className="text-right">
                      Contact Name
                    </Label>
                    <Input
                      id="contactName"
                      value={newUnion.contactName || ""}
                      onChange={(e) => setNewUnion({...newUnion, contactName: e.target.value})}
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="contactEmail" className="text-right">
                      Contact Email
                    </Label>
                    <Input
                      id="contactEmail"
                      type="email"
                      value={newUnion.contactEmail || ""}
                      onChange={(e) => setNewUnion({...newUnion, contactEmail: e.target.value})}
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="contactPhone" className="text-right">
                      Contact Phone
                    </Label>
                    <Input
                      id="contactPhone"
                      value={newUnion.contactPhone || ""}
                      onChange={(e) => setNewUnion({...newUnion, contactPhone: e.target.value})}
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="contactAddress" className="text-right">
                      Contact Address
                    </Label>
                    <Input
                      id="contactAddress"
                      value={newUnion.contactAddress || ""}
                      onChange={(e) => setNewUnion({...newUnion, contactAddress: e.target.value})}
                      className="col-span-3"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleAddUnion}>Add Union</Button>
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
                    <TableHead>Contact Name</TableHead>
                    <TableHead>Contact Email</TableHead>
                    <TableHead>Contact Phone</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {unions.map((union) => (
                    <TableRow key={union.id}>
                      <TableCell className="font-medium">{union.name}</TableCell>
                      <TableCell>{union.contactName}</TableCell>
                      <TableCell>{union.contactEmail}</TableCell>
                      <TableCell>{union.contactPhone}</TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button variant="ghost" size="icon">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleDeleteUnion(union.id)}
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
        </TabsContent>
        
        <TabsContent value="upload" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Bulk Upload Unions/Locals</CardTitle>
              <CardDescription>
                Upload a spreadsheet with union/local information.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-12">
                <FileUp className="h-8 w-8 text-muted-foreground mb-4" />
                <div className="space-y-2 text-center">
                  <h3 className="text-lg font-semibold">Upload Spreadsheet</h3>
                  <p className="text-sm text-muted-foreground">
                    Drag and drop your spreadsheet file here or click to browse
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
                  <li>Union Name</li>
                  <li>Primary Contact Name</li>
                  <li>Primary Contact Email</li>
                  <li>Primary Contact Phone</li>
                  <li>Primary Contact Address</li>
                </ul>
                <Button variant="link" className="p-0 h-auto mt-2">
                  Download Template
                </Button>
              </div>
            </CardContent>
            <CardFooter>
              <Button className="ml-auto">Upload and Process</Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
