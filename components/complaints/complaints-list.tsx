"use client"
import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"

import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Edit,
  Mail,
  Copy,
  Printer,
  Trash2,
  User,
  Building2,
  Tag,
  Users,
  FileText,
  CheckCircle,
  Undo2,
  Search,
  Loader2,
  AlertCircle,
  RefreshCw,
  ArrowUpDown,
  AlertTriangle,
} from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { fetchAllComplaints, deleteComplaints, archiveComplaints, duplicateComplaintWithFilesAndNotes, undeleteComplaints, convertComplaintToGrievance } from "@/app/actions/complaints"
import type { ComplaintListItem } from "@/app/actions/complaints"
import { useSession } from "@/lib/auth/use-auth-session"
import { GRIEVANCE_CATEGORIES, getSessionOrganizationType, isOrganizationType } from "@/app/lib/definitions"
import { useToast } from "@/hooks/use-toast"
import { formatSmartDateTime } from "@/lib/utils"

interface ComplaintsListProps {
  isDeletedMode?: boolean;
}

// Helper function for employee display
const getEmployeeDisplay = (complaint: ComplaintListItem) => {
  if (complaint.type === "POLICY") {
    return {
      type: "policy",
      display: "Policy",
      icon: FileText,
      color: "text-purple-600 bg-purple-50 border-purple-200"
    }
  }

  // For individual/group complaints, show employee information
  const hasComplainant = complaint.complainantFirstName || complaint.complainantLastName
  const hasEmployees = complaint.employees && Array.isArray(complaint.employees) && complaint.employees.length > 0

  if (complaint.type === "GROUP" && (hasComplainant || hasEmployees)) {
    // For GROUP complaints, include both complainant and employees in the count
    const totalEmployees = (hasComplainant ? 1 : 0) + (hasEmployees ? complaint.employees.length : 0)
    
    if (totalEmployees === 0) {
      return {
        type: "group",
        display: "No Employee Info",
        icon: Users,
        color: "text-blue-600 bg-blue-50 border-blue-200"
      }
    }
    
    // Show the first available employee (complainant first, then first in employees array)
    let firstEmployee
    if (hasComplainant) {
      firstEmployee = {
        firstName: complaint.complainantFirstName || "",
        lastName: complaint.complainantLastName || ""
      }
    } else if (hasEmployees) {
      firstEmployee = complaint.employees[0]
    }
    
    const firstName = `${firstEmployee.firstName || ""} ${firstEmployee.lastName || ""}`.trim() || "Unknown Employee"
    const extraCount = Math.max(totalEmployees - 1, 0)
    const display = extraCount > 0 ? `${firstName} +${extraCount}` : firstName
    
    return {
      type: "group",
      display,
      icon: Users,
      color: "text-blue-600 bg-blue-50 border-blue-200",
      totalEmployees // Store total for tooltip
    }
  }

  if (hasComplainant) {
    const fullName = `${complaint.complainantFirstName || ""} ${complaint.complainantLastName || ""}`.trim()
    const position = complaint.complainantPosition || complaint.complainantDepartment || ""
    return {
      type: "individual",
      display: fullName || "Unknown Employee",
      subtitle: position,
      icon: User,
      color: "text-green-600 bg-green-50 border-green-200"
    }
  }

  return {
    type: "unknown",
    display: "No Employee Info",
    icon: User,
    color: "text-slate-600 bg-slate-50 border-slate-200"
  }
}

// Helper function for status badge styling
const getStatusBadgeClass = (status: string) => {
  switch (status) {
    case "OPEN":
      return "bg-green-100 text-green-800 border-green-200";
    case "CLOSED":
      return "bg-red-100 text-red-800 border-red-200";
    case "GRIEVED":
      return "bg-orange-100 text-orange-800 border-orange-200";
    case "DELETED":
      return "bg-gray-100 text-gray-800 border-gray-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
};

export default function ComplaintsList({ isDeletedMode = false }: ComplaintsListProps = {}) {
  const { data: session } = useSession()
  const router = useRouter()
  const { toast } = useToast()
  const [complaints, setComplaints] = useState<ComplaintListItem[]>([])
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedComplaints, setSelectedComplaints] = useState<Set<string>>(new Set())
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showArchiveDialog, setShowArchiveDialog] = useState(false)
  const [showRestoreDialog, setShowRestoreDialog] = useState(false)
  const [isElevateDialogOpen, setIsElevateDialogOpen] = useState(false)
  const [isElevating, setIsElevating] = useState(false)
  const [search, setSearch] = useState("")
  const [unitFilter, setUnitFilter] = useState("all")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [isNavigating, setIsNavigating] = useState(false)
  const [clickedRowId, setClickedRowId] = useState<string | null>(null)
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: "ascending" | "descending";
  }>({
    key: "createdAt",
    direction: "descending",
  })

  // Get organization type for conditional actions
  const organizationType = getSessionOrganizationType(session)
  const isUnion = isOrganizationType(organizationType, 'Union')

  // Fetch complaints function
  const fetchComplaints = async () => {
    try {
      setIsLoading(true)
      const organizationId = session?.user?.organization?.id
      if (!organizationId) {
        setComplaints([])
        setIsLoading(false)
        return
      }
      
      // Pass the correct status filter based on mode
      const statusFilter = isDeletedMode ? "DELETED" : undefined
      const complaintsData = await fetchAllComplaints(statusFilter)
      setComplaints(complaintsData)
    } catch (error) {
      console.error("Error fetching complaints:", error)
      toast({
        title: "Error loading complaints",
        description: "Failed to load complaints. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Initialize pageSize from localStorage after component mounts
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('complaintsPageSize')
      if (saved) {
        const savedPageSize = parseInt(saved)
        if (savedPageSize !== pageSize) {
          setPageSize(savedPageSize)
        }
      }
    }
  }, [])

  // Fetch complaints on component mount and when switching between deleted/active mode
  useEffect(() => {
    if (session) fetchComplaints()
  }, [session, isDeletedMode])

  // Client-side filtering and sorting
  const processedComplaints = useMemo(() => {
    let filtered = complaints.filter((c) => {
      const matchesUnit = !unitFilter || unitFilter === "all" || c.bargainingUnit?.name === unitFilter
      const matchesCategory = !categoryFilter || categoryFilter === "all" || c.category === categoryFilter
      const matchesStatus = !statusFilter || statusFilter === "all" || c.status === statusFilter
      const matchesSearch =
        !search ||
        c.complaintNumber?.toLowerCase().includes(search.toLowerCase()) ||
        c.category?.toLowerCase().includes(search.toLowerCase()) ||
        c.settlementDesired?.toLowerCase().includes(search.toLowerCase()) ||
        // Search in employee names
        `${c.complainantFirstName || ""} ${c.complainantLastName || ""}`.toLowerCase().includes(search.toLowerCase()) ||
        c.complainantEmail?.toLowerCase().includes(search.toLowerCase()) ||
        c.complainantPosition?.toLowerCase().includes(search.toLowerCase()) ||
        c.complainantDepartment?.toLowerCase().includes(search.toLowerCase())

      return matchesUnit && matchesCategory && matchesStatus && matchesSearch
    })

    // Apply sorting
    if (sortConfig.key) {
      filtered.sort((a, b) => {
        let aValue: any;
        let bValue: any;

        switch (sortConfig.key) {
          case "complaintNumber":
            aValue = (a.complaintNumber || "").toLowerCase();
            bValue = (b.complaintNumber || "").toLowerCase();
            break;
          case "employee":
            aValue = `${a.complainantFirstName || ""} ${a.complainantLastName || ""}`.toLowerCase();
            bValue = `${b.complainantFirstName || ""} ${b.complainantLastName || ""}`.toLowerCase();
            break;
          case "unit":
            aValue = (a.bargainingUnit?.name || "").toLowerCase();
            bValue = (b.bargainingUnit?.name || "").toLowerCase();
            break;
          case "category":
            aValue = (a.category || "").toLowerCase();
            bValue = (b.category || "").toLowerCase();
            break;
          case "status":
            aValue = (a.status || "").toLowerCase();
            bValue = (b.status || "").toLowerCase();
            break;
          case "createdAt":
            aValue = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            bValue = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            break;
          case "updatedAt":
            aValue = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
            bValue = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
            break;
          default:
            aValue = "";
            bValue = "";
        }

        if (aValue < bValue) {
          return sortConfig.direction === "ascending" ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === "ascending" ? 1 : -1;
        }
        return 0;
      });
    }

    return filtered
  }, [complaints, search, unitFilter, categoryFilter, statusFilter, sortConfig])

  // Get paginated data
  const paginatedComplaints = useMemo(() => {
    return processedComplaints.slice((page - 1) * pageSize, page * pageSize)
  }, [processedComplaints, page, pageSize])
  
  const pageCount = Math.ceil(processedComplaints.length / pageSize)

  // Get unique bargaining units from complaints with names
  const uniqueUnits = Array.from(
    new Map(
      complaints.filter((c) => c.bargainingUnit).map((c) => [c.bargainingUnit!.name, c.bargainingUnit!.id]),
    ).entries(),
  ).map(([name, id]) => ({ name, id }))

  const handleDelete = async (id: string) => {
    try {
      await deleteComplaints([id])
      setComplaints((prev) => prev.filter((c) => c.id !== id))
      toast({
        title: "Complaint deleted",
        description: "The complaint has been deleted successfully.",
        variant: "default",
      })
    } catch (error) {
      console.error("Error deleting complaint:", error)
      toast({
        title: "Error deleting complaint",
        description: error instanceof Error ? error.message : "Failed to delete complaint. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleRowClick = async (id: string) => {
    setClickedRowId(id)
    setIsNavigating(true)
    try {
      await router.push(`/product/complaints/${id}/view`)
    } catch (error) {
      console.error("Navigation error:", error)
      setIsNavigating(false)
      setClickedRowId(null)
    }
  }

  // Bulk action handlers
  const handleBulkEdit = () => {
    if (selectedComplaints.size === 1) {
      const complaintId = Array.from(selectedComplaints)[0]
      router.push(`/product/complaints/${complaintId}/view`)
    }
  }

  const handleBulkEmail = () => {
    console.log("Bulk email:", Array.from(selectedComplaints))
  }

  const handleBulkElevateToGrievance = () => {
    setIsElevateDialogOpen(true)
  }

  const handleElevateToGrievance = async () => {
    if (selectedComplaints.size !== 1) return

    const complaintId = Array.from(selectedComplaints)[0]
    const complaint = complaints.find(c => c.id === complaintId)
    
    if (!complaint || !complaint.agreementId) {
      toast({
        title: "Cannot Convert",
        description: "Complaint must have an associated collective agreement to convert to grievance.",
        variant: "destructive",
      })
      return
    }

    setIsElevating(true)
    setIsElevateDialogOpen(false)

    try {
      const result = await convertComplaintToGrievance(complaintId)

      toast({
        title: result.isNew ? "Complaint Converted" : "Grievance Found",
        description: result.isNew
          ? "Complaint has been successfully converted to a grievance."
          : "A grievance already exists for this complaint.",
        variant: "default",
      })

      // Clear selection
      setSelectedComplaints(new Set())
      
      // Refresh the complaints list
      await fetchComplaints()

      // Redirect to the grievance
      router.push(`/product/grievances/${result.grievanceId}`)
    } catch (error) {
      console.error("Error converting complaint:", error)
      toast({
        title: "Conversion Failed",
        description: error instanceof Error ? error.message : "Failed to convert complaint to grievance.",
        variant: "destructive",
      })
    } finally {
      setIsElevating(false)
    }
  }

  const handleBulkDuplicate = async () => {
    if (selectedComplaints.size === 1) {
      const complaintId = Array.from(selectedComplaints)[0]
      const complaint = complaints.find(c => c.id === complaintId)
      if (complaint) {
        try {
          // Use the comprehensive duplication function that copies files and notes
          const newComplaint = await duplicateComplaintWithFilesAndNotes(complaintId)

          // Clear selection
          setSelectedComplaints(new Set())

          // Show success message
          toast({
            title: "Complaint duplicated successfully",
            description: `Complaint ${complaint.complaintNumber || complaint.id} has been duplicated with all files and notes. New complaint: ${newComplaint.complaintNumber}`,
          })

          router.push(`/product/complaints/${newComplaint.id}/view`)
        } catch (error) {
          toast({
            title: "Error duplicating complaint",
            description: "There was an error duplicating the complaint. Please try again.",
            variant: "destructive",
          })
        }
      }
    }
  }

  const handleBulkDelete = () => {
    setShowDeleteDialog(true)
  }

  const confirmBulkDelete = async () => {
    try {
      const complaintIds = Array.from(selectedComplaints)
      console.log("Bulk delete:", complaintIds)
      
      // Call the server action to mark complaints as deleted
      await deleteComplaints(complaintIds)
      
      // Refresh the complaints list to show updated data
      await fetchComplaints()
      
      setSelectedComplaints(new Set())
      setShowDeleteDialog(false)
      
      toast({
        title: "Complaints deleted",
        description: `${complaintIds.length} complaint(s) have been deleted successfully.`,
        variant: "default",
      })
    } catch (error) {
      console.error("Error deleting complaints:", error)
      toast({
        title: "Error deleting complaints",
        description: error instanceof Error ? error.message : "Failed to delete complaints. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleBulkArchive = () => {
    setShowArchiveDialog(true)
  }

  const handleBulkPrint = () => {
    console.log("Bulk print:", Array.from(selectedComplaints))
  }

  const handleBulkRestore = () => {
    setShowRestoreDialog(true)
  }


  const confirmBulkArchive = async () => {
    try {
      const complaintIds = Array.from(selectedComplaints)
      console.log("Bulk archive:", complaintIds)
      
      // Call the server action to archive complaints
      await archiveComplaints(complaintIds)
      
      // Refresh the complaints list to show updated data
      await fetchComplaints()
      
      setSelectedComplaints(new Set())
      setShowArchiveDialog(false)
      
      toast({
        title: "Complaint elevated to grievance",
        description: `The complaint has been elevated to grievance status successfully.`,
        variant: "default",
      })
    } catch (error) {
      console.error("Error archiving complaints:", error)
      toast({
        title: "Error elevating complaint to grievance",
        description: error instanceof Error ? error.message : "Failed to elevate complaint to grievance. Please try again.",
        variant: "destructive",
      })
    }
  }

  const confirmBulkRestore = async () => {
    try {
      const complaintIds = Array.from(selectedComplaints)
      console.log("Bulk restore:", complaintIds)
      
      // Call the server action to restore complaints
      await undeleteComplaints(complaintIds)
      
      // Refresh the complaints list to show updated data
      await fetchComplaints()
      
      setSelectedComplaints(new Set())
      setShowRestoreDialog(false)
      
      toast({
        title: "Complaints restored",
        description: `${complaintIds.length} complaint(s) have been restored to their previous status.`,
        variant: "default",
      })
    } catch (error) {
      console.error("Error restoring complaints:", error)
      toast({
        title: "Error restoring complaints",
        description: error instanceof Error ? error.message : "Failed to restore complaints. Please try again.",
        variant: "destructive",
      })
    }
  }


  // Checkbox handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedComplaints(new Set(paginatedComplaints.map((c) => c.id)))
    } else {
      setSelectedComplaints(new Set())
    }
  }

  const handleSelectComplaint = (complaintId: string, checked: boolean) => {
    const newSelected = new Set(selectedComplaints)
    if (checked) {
      newSelected.add(complaintId)
    } else {
      newSelected.delete(complaintId)
    }
    setSelectedComplaints(newSelected)
  }

  const requestSort = (key: string) => {
    let direction: "ascending" | "descending" = "ascending";
    if (sortConfig.key === key && sortConfig.direction === "ascending") {
      direction = "descending";
    }
    setSortConfig({ key, direction });
  };

  const getSortDirectionIndicator = (key: string) => {
    if (sortConfig.key !== key) return null;
    return sortConfig.direction === "ascending" ? (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="inline-block ml-1 h-4 w-4"
      >
        <path d="m18 15-6-6-6 6" />
      </svg>
    ) : (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="inline-block ml-1 h-4 w-4"
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    );
  };

  if (isLoading && complaints.length === 0) {
    return (
      <Card className="border-0 shadow-sm bg-white/50 backdrop-blur-sm">
        <CardContent className="p-12">
          <div className="flex items-center justify-center">
            <div className="flex items-center gap-3 text-slate-600">
              <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
              <span className="font-medium">Loading complaints...</span>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card className="border-0 shadow-sm bg-white/50 backdrop-blur-sm">
        <CardContent className="p-6">
        <div className="flex flex-col lg:flex-row lg:flex-wrap lg:items-center lg:justify-between gap-4 lg:gap-6 mb-4 relative z-[1]">
          <div className="flex items-center gap-4 flex-nowrap overflow-x-auto order-1 lg:order-none">
            {isLoading && (
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Loading complaints...</span>
              </div>
            )}
            {selectedComplaints.size > 0 && (
              <div className="flex items-center gap-3 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg min-w-fit whitespace-nowrap">
                <span className="text-sm font-medium text-blue-700">{selectedComplaints.size} selected</span>
                {isDeletedMode ? (
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={handleBulkRestore}
                      variant="outline"
                      size="sm"
                      className="h-8 border-green-200 text-green-700 hover:bg-green-100 bg-transparent whitespace-nowrap"
                    >
                      <Undo2 className="h-4 w-4 mr-2" />
                      Restore Complaints
                    </Button>
                  </div>
                ) : (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 border-blue-200 text-blue-700 hover:bg-blue-100 bg-transparent whitespace-nowrap"
                      >
                        Actions
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-48">
                      <DropdownMenuItem
                        onClick={handleBulkEdit}
                        className="text-sm"
                        disabled={selectedComplaints.size > 1}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Selected
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleBulkEmail} className="text-sm">
                        <Mail className="h-4 w-4 mr-2" />
                        Share by Email
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={handleBulkDuplicate} 
                        className="text-sm"
                        disabled={selectedComplaints.size !== 1}
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={handleBulkPrint}
                        className="text-sm"
                      >
                        <Printer className="h-4 w-4 mr-2" />
                        Print
                      </DropdownMenuItem>
                      {isUnion && (
                        <DropdownMenuItem
                          onClick={handleBulkElevateToGrievance}
                          className="text-sm"
                        >
                          Elevate to Grievance
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem 
                        onClick={handleBulkElevateToGrievance} 
                        className="text-sm"
                        disabled={selectedComplaints.size !== 1}
                      >
                        <ArrowUpDown className="h-4 w-4 mr-2" />
                        Elevate to Grievance
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleBulkDelete} className="text-sm text-red-600 focus:text-red-600">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 order-2 lg:order-none w-full lg:w-auto">
            <div className="relative min-w-0 flex-1 sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search complaints..."
                className="pl-10 pr-4 h-10 border-slate-200 bg-white/80 backdrop-blur-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2 flex-nowrap">
              <Select value={unitFilter} onValueChange={setUnitFilter}>
                <SelectTrigger className="w-36 h-10 border-slate-200 bg-white/80 backdrop-blur-sm flex-shrink-0">
                  <Building2 className="h-4 w-4 mr-2 text-slate-500" />
                  <SelectValue placeholder="Unit" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="all">All Units</SelectItem>
                    {uniqueUnits.map((unit) => (
                      <SelectItem key={unit.id} value={unit.name}>
                        {unit.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>

              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-40 h-10 border-slate-200 bg-white/80 backdrop-blur-sm flex-shrink-0">
                  <Tag className="h-4 w-4 mr-2 text-slate-500" />
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="all">All Categories</SelectItem>
                    {GRIEVANCE_CATEGORIES.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>

              {!isDeletedMode && (
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-36 h-10 border-slate-200 bg-white/80 backdrop-blur-sm flex-shrink-0">
                    <CheckCircle className="h-4 w-4 mr-2 text-slate-500" />
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="OPEN">Open</SelectItem>
                      <SelectItem value="GRIEVED">Grieved</SelectItem>
                      <SelectItem value="CLOSED">Closed</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              )}

              {/* <Button
                variant="outline"
                size="sm"
                onClick={fetchComplaints}
                disabled={isLoading}
                className="h-10 px-3 border-slate-200 bg-white/80 backdrop-blur-sm hover:bg-slate-50"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button> */}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-slate-200 bg-slate-50/80">
                <TableHead className="w-12 py-2">
                  <Checkbox
                    checked={
                      paginatedComplaints.length > 0 && paginatedComplaints.every((c) => selectedComplaints.has(c.id))
                    }
                    onCheckedChange={handleSelectAll}
                    aria-label="Select all"
                    className="border-slate-300"
                  />
                </TableHead>
                <TableHead 
                  className="py-2 font-semibold text-slate-700 cursor-pointer hover:text-blue-600 select-none"
                  onClick={() => requestSort("complaintNumber")}
                >
                  Complaint #
                  {getSortDirectionIndicator("complaintNumber")}
                </TableHead>
                <TableHead 
                  className="py-2 font-semibold text-slate-700 cursor-pointer hover:text-blue-600 select-none"
                  onClick={() => requestSort("employee")}
                >
                  Employee
                  {getSortDirectionIndicator("employee")}
                </TableHead>
                <TableHead 
                  className="py-2 font-semibold text-slate-700 cursor-pointer hover:text-blue-600 select-none"
                  onClick={() => requestSort("unit")}
                >
                  Unit
                  {getSortDirectionIndicator("unit")}
                </TableHead>
                <TableHead 
                  className="py-2 font-semibold text-slate-700 cursor-pointer hover:text-blue-600 select-none"
                  onClick={() => requestSort("category")}
                >
                  Category
                  {getSortDirectionIndicator("category")}
                </TableHead>
                <TableHead 
                  className="py-2 font-semibold text-slate-700 cursor-pointer hover:text-blue-600 select-none"
                  onClick={() => requestSort("status")}
                >
                  Status
                  {getSortDirectionIndicator("status")}
                </TableHead>
                <TableHead 
                  className="py-2 font-semibold text-slate-700 cursor-pointer hover:text-blue-600 select-none"
                  onClick={() => requestSort("createdAt")}
                >
                  Created
                  {getSortDirectionIndicator("createdAt")}
                </TableHead>
                <TableHead 
                  className="py-2 font-semibold text-slate-700 cursor-pointer hover:text-blue-600 select-none"
                  onClick={() => requestSort("updatedAt")}
                >
                  Updated
                  {getSortDirectionIndicator("updatedAt")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedComplaints.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12">
                    <div className="flex flex-col items-center gap-3 text-slate-500">
                      <AlertCircle className="h-8 w-8 text-slate-400" />
                      <div className="text-lg font-medium">No complaints found</div>
                      <div className="text-sm">Try adjusting your search or filter criteria</div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedComplaints.map((complaint) => {
                  const employeeDisplay = getEmployeeDisplay(complaint)
                  const isSelected = selectedComplaints.has(complaint.id)
                  const isClicked = clickedRowId === complaint.id && isNavigating

                  return (
                    <TableRow
                      key={complaint.id}
                      className={`
                        border-b border-slate-100 transition-all duration-200 cursor-pointer
                        ${isSelected ? "bg-blue-50/80" : "hover:bg-slate-50/80"}
                        ${isClicked ? "bg-blue-100/80" : ""}
                        group
                      `}
                      onClick={() => handleRowClick(complaint.id)}
                    >
                      <TableCell className="py-2">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(checked) => handleSelectComplaint(complaint.id, checked as boolean)}
                          onClick={(e) => e.stopPropagation()}
                          aria-label={`Select complaint ${complaint.complaintNumber || complaint.id}`}
                          className="border-slate-300"
                        />
                      </TableCell>
                      <TableCell className="py-2">
                        <div className="font-mono text-sm text-slate-600 font-medium">
                          {complaint.complaintNumber || "N/A"}
                        </div>
                      </TableCell>
                      <TableCell className="py-2">
                        <div className="space-y-1">
                          {employeeDisplay.type === "group" ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="text-sm font-medium text-slate-900 cursor-help hover:text-blue-600 transition-colors">
                                  {employeeDisplay.display}
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <div className="space-y-1">
                                  {/* Show primary complainant first if exists */}
                                  {(complaint.complainantFirstName || complaint.complainantLastName) && (
                                    <div key="complainant" className="text-sm font-medium">
                                      {`${complaint.complainantFirstName || ""} ${complaint.complainantLastName || ""}`.trim() || "Unknown Employee"}
                                    </div>
                                  )}
                                  {/* Show additional employees */}
                                  {complaint.employees?.map((e: any, index: number) => (
                                    <div key={`${e.firstName}-${e.lastName}-${index}`} className="text-sm">
                                      {`${e.firstName || ""} ${e.lastName || ""}`.trim() || "Unknown Employee"}
                                    </div>
                                  ))}
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          ) : (
                            <div className={`text-sm font-medium text-slate-900 ${
                              employeeDisplay.type === "policy" 
                                ? "font-serif uppercase text-purple-700" 
                                : ""
                            }`}>
                              {employeeDisplay.display}
                            </div>
                          )}
                          {employeeDisplay.subtitle && (
                            <div className="text-xs text-slate-500">
                              {employeeDisplay.subtitle}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="py-2">
                        <span className="text-sm text-slate-700 font-medium">
                          {complaint.bargainingUnit?.name || "N/A"}
                        </span>
                      </TableCell>
                      <TableCell className="py-2">
                        {complaint.category ? (
                          <Badge variant="outline" className="text-xs font-medium px-2 py-1">
                            {complaint.category}
                          </Badge>
                        ) : (
                          <span className="text-slate-500 text-sm">N/A</span>
                        )}
                      </TableCell>
                      <TableCell className="py-2">
                        {complaint.status ? (
                          <Badge variant="outline" className={`text-xs font-medium px-2 py-1 ${getStatusBadgeClass(complaint.status)}`}>
                            {complaint.status}
                          </Badge>
                        ) : (
                          <span className="text-slate-500 text-sm">N/A</span>
                        )}
                      </TableCell>
                      <TableCell className="py-2">
                        <div className="text-xs text-slate-500">
                          {complaint.createdAt ? formatSmartDateTime(complaint.createdAt) : 'N/A'}
                        </div>
                      </TableCell>
                      <TableCell className="py-2">
                        <div className="text-xs text-slate-500">
                          {complaint.updatedAt ? formatSmartDateTime(complaint.updatedAt) : 'N/A'}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <CardFooter className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-100 px-6 py-4 bg-slate-50/50">
        <div className="flex items-center gap-4">
          {processedComplaints.length > 0 ? (
            <div className="text-sm text-slate-600 font-medium">
              <span className="font-semibold text-slate-900">
                {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, processedComplaints.length)}
              </span>{" "}
              of <span className="font-semibold text-slate-900">{processedComplaints.length}</span>
            </div>
          ) : (
            <div className="text-sm text-slate-500">No complaints found</div>
          )}
        </div>

        {pageCount > 1 && (
          <div className="flex items-center gap-1">
            {page > 1 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page - 1)}
                className="h-8 px-3 border-slate-200 hover:bg-slate-100"
              >
                Previous
              </Button>
            )}
            
            {Array.from({ length: Math.min(5, pageCount) }, (_, i) => {
              const pageNum = i + 1
              return (
                <Button
                  key={pageNum}
                  variant={page === pageNum ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPage(pageNum)}
                  className={`h-8 w-8 p-0 ${
                    page === pageNum
                      ? "bg-blue-600 hover:bg-blue-700 border-blue-600"
                      : "border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {pageNum}
                </Button>
              )
            })}
            
            {page < pageCount && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page + 1)}
                className="h-8 px-3 border-slate-200 hover:bg-slate-100"
              >
                Next
              </Button>
            )}
          </div>
        )}

        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600">Show:</span>
            <Select value={pageSize.toString()} onValueChange={(value) => {
              const newPageSize = parseInt(value)
              setPageSize(newPageSize)
              setPage(1) // Reset to first page when changing page size
              // Store user's preference in localStorage
              if (typeof window !== 'undefined') {
                localStorage.setItem('complaintsPageSize', newPageSize.toString())
              }
            }}>
              <SelectTrigger className="w-20 h-8 border-slate-200 bg-white/80 backdrop-blur-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
            <span className="text-sm text-slate-600">per page</span>
          </div>
         
          {!isDeletedMode && (
            <button
              onClick={() => router.push("/product/complaints/deleted")}
              className="text-xs text-slate-500 hover:text-slate-700 underline cursor-pointer"
            >
              View deleted complaints
            </button>
          )}
        </div>
      </CardFooter>
    </Card>

    {/* Delete Confirmation Dialog */}
    <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Complaints</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete the selected complaints? They will be marked as deleted and hidden from the list.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={confirmBulkDelete}>
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>


    {/* Elevate to Grievance Confirmation Dialog */}
    <Dialog open={isElevateDialogOpen} onOpenChange={setIsElevateDialogOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Elevate to Grievance
          </DialogTitle>
          <DialogDescription className="text-left">
            This will change the status of the complaint to <strong>Grieved</strong> and create a new grievance
            copying all the details of the complaint.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => setIsElevateDialogOpen(false)}
            disabled={isElevating}
          >
            Cancel
          </Button>
          <Button
            onClick={handleElevateToGrievance}
            disabled={isElevating}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isElevating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Converting...
              </>
            ) : (
              "Continue"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Restore Confirmation Dialog */}
    <Dialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Restore Complaints</DialogTitle>
          <DialogDescription>
            Are you sure you want to restore the selected complaints? They will be returned to their previous status.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowRestoreDialog(false)}>
            Cancel
          </Button>
          <Button variant="default" onClick={confirmBulkRestore} className="bg-green-600 hover:bg-green-700">
            Restore
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

  </>
  )
}