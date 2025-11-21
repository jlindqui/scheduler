"use client";
import { useState, useEffect } from "react";
import React from "react";
import Link from "next/link";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Clock,
  CheckCircle,
  AlertCircle,
  Trash2,
  Plus,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fetchAllIncidents, IncidentListItem } from "@/app/actions/incidents";

export default function IncidentsList() {
  const [incidents, setIncidents] = useState<IncidentListItem[]>([]);
  const [filteredIncidents, setFilteredIncidents] = useState<IncidentListItem[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [unitFilter, setUnitFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const pageSize = 10;

  // Fetch grievances on component mount
  useEffect(() => {
    const fetchIncidents = async () => {
      setIsLoading(true);
      try {
        const grievances = await fetchAllIncidents();
        setIncidents(grievances);
        setFilteredIncidents(grievances);
      } catch (error) {
        console.error('Error fetching incidents:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchIncidents();
  }, []);

  // Filtering and searching
  useEffect(() => {
    const filtered = incidents.filter(c => {
      const matchesStatus = !statusFilter || statusFilter === "all" || c.status === statusFilter;
      const matchesUnit = !unitFilter || unitFilter === "all" || c.bargainingUnit === unitFilter;
      const matchesSearch = !search || 
        c.category?.toLowerCase().includes(search.toLowerCase()) ||
        c.description?.toLowerCase().includes(search.toLowerCase());
      
      return matchesStatus && matchesUnit && matchesSearch;
    });
    
    setFilteredIncidents(filtered);
    setPage(1); // Reset to first page when filtering
  }, [incidents, search, statusFilter, unitFilter]);

  const paginatedIncidents = filteredIncidents.slice((page - 1) * pageSize, page * pageSize);
  const pageCount = Math.ceil(filteredIncidents.length / pageSize);

  // Get unique units from incidents
  const uniqueUnits = Array.from(new Set(
    incidents.flatMap(c => c.bargainingUnit ? [c.bargainingUnit] : [])
  )).filter(Boolean);

  const handleDelete = (id: string) => {
    setIncidents(prev => prev.filter(c => c.id !== id));
  };

  const getEmployeeNames = (incident: IncidentListItem) => {
    if (!incident.employees) return "N/A";
    try {
      const employees = Array.isArray(incident.employees) ? incident.employees : [];
      return employees.map((emp: any) => emp.name || "Unknown").join(", ");
    } catch {
      return "N/A";
    }
  };

  const getUnit = (incident: IncidentListItem) => {
    return incident.bargainingUnit || "N/A";
  };

  if (isLoading) {
    return (
      <Card className="shadow-lg border-0 overflow-hidden">
        <CardHeader className="pb-4 bg-gray-50 border-b">
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-1/4 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="animate-pulse">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 bg-gray-100 border-b"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (incidents.length === 0) {
    return (
      <Card className="shadow-lg border-0 overflow-hidden">
        <CardContent className="p-8">
          <div className="text-center text-gray-500">
            <p className="mb-4">No incidents found.</p>
            <Link href="/product/incidents/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Incident
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg border-0 overflow-hidden">
      <CardHeader className="pb-4 bg-gray-50 border-b">
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search incidents..."
              className="pl-9 pr-4 py-2 border-gray-200 focus:border-primary"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32 h-9">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="WITHDRAWN">Withdrawn</SelectItem>
                  <SelectItem value="SETTLED">Settled</SelectItem>
                  <SelectItem value="RESOLVED_ARBITRATION">Resolved</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
            <Select value={unitFilter} onValueChange={setUnitFilter}>
              <SelectTrigger className="w-32 h-9">
                <SelectValue placeholder="Unit" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="all">All Units</SelectItem>
                  {uniqueUnits.map(unit => (
                    <SelectItem key={unit} value={unit || ""}>{unit || "Unknown"}</SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <SortableTable 
          filteredIncidents={filteredIncidents} 
          page={page} 
          pageSize={pageSize}
          onDelete={handleDelete}
        />
      </CardContent>
      <CardFooter className="flex items-center justify-between border-t px-6 py-4 bg-gray-50">
        <div className="text-sm text-muted-foreground">
          Showing <strong>{(page - 1) * pageSize + 1}-{Math.min(page * pageSize, filteredIncidents.length)}</strong> of <strong>{filteredIncidents.length}</strong> incidents
        </div>
        <div className="flex items-center space-x-2">
          <Button 
            variant="outline" 
            size="sm" 
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >
            Previous
          </Button>
          {Array.from({ length: Math.min(5, pageCount) }, (_, i) => {
            const pageNum = i + 1;
            return (
              <Button
                key={pageNum}
                variant={page === pageNum ? "default" : "outline"}
                size="sm"
                onClick={() => setPage(pageNum)}
              >
                {pageNum}
              </Button>
            );
          })}
          <Button 
            variant="outline" 
            size="sm"
            disabled={page >= pageCount}
            onClick={() => setPage(page + 1)}
          >
            Next
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}

function SortableTable({ 
  filteredIncidents, 
  page, 
  pageSize,
  onDelete 
}: { 
  filteredIncidents: IncidentListItem[]; 
  page: number; 
  pageSize: number;
  onDelete: (id: string) => void;
}) {
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: "ascending" | "descending";
  }>({
    key: "filedAt",
    direction: "descending",
  });

  const sortedIncidents = React.useMemo(() => {
    const sortableIncidents = [...filteredIncidents];
    if (sortConfig.key) {
      sortableIncidents.sort((a, b) => {
        let aValue: any;
        let bValue: any;

        switch (sortConfig.key) {
          case "employee":
            aValue = getEmployeeNames(a).toLowerCase();
            bValue = getEmployeeNames(b).toLowerCase();
            break;
          case "unit":
            aValue = getUnit(a).toLowerCase();
            bValue = getUnit(b).toLowerCase();
            break;
          case "category":
            aValue = (a.category || "").toLowerCase();
            bValue = (b.category || "").toLowerCase();
            break;
          case "status":
            aValue = a.status.toLowerCase();
            bValue = b.status.toLowerCase();
            break;
          case "filedAt":
            aValue = a.filedAt ? new Date(a.filedAt).getTime() : 0;
            bValue = b.filedAt ? new Date(b.filedAt).getTime() : 0;
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
    return sortableIncidents;
  }, [sortConfig, filteredIncidents]);

  // Paginate after sorting
  const paginatedIncidents = sortedIncidents.slice((page - 1) * pageSize, page * pageSize);

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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return (
          <Badge
            variant="outline"
            className="bg-sky-50 text-sky-700 border-sky-200 flex items-center gap-1"
          >
            <AlertCircle className="h-3 w-3" /> Active
          </Badge>
        );
      case "WITHDRAWN":
        return (
          <Badge
            variant="outline"
            className="bg-gray-50 text-gray-700 border-gray-200 flex items-center gap-1"
          >
            <Clock className="h-3 w-3" /> Withdrawn
          </Badge>
        );
      case "SETTLED":
        return (
          <Badge
            variant="outline"
            className="bg-emerald-50 text-emerald-700 border-emerald-200 flex items-center gap-1"
          >
            <CheckCircle className="h-3 w-3" /> Settled
          </Badge>
        );
      case "RESOLVED_ARBITRATION":
        return (
          <Badge
            variant="outline"
            className="bg-purple-50 text-purple-700 border-purple-200 flex items-center gap-1"
          >
            <CheckCircle className="h-3 w-3" /> Resolved
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getEmployeeNames = (incident: IncidentListItem) => {
    if (!incident.employees) return "N/A";
    try {
      const employees = Array.isArray(incident.employees) ? incident.employees : [];
      return employees.map((emp: any) => emp.name || "Unknown").join(", ");
    } catch {
      return "N/A";
    }
  };

  const getUnit = (incident: IncidentListItem) => {
    return incident.bargainingUnit || "N/A";
  };

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader className="bg-gray-50">
          <TableRow>
            <TableHead
              className="cursor-pointer hover:bg-gray-100 transition-colors"
              onClick={() => requestSort("employee")}
            >
              <div className="flex items-center">
                Employee(s) {getSortDirectionIndicator("employee")}
              </div>
            </TableHead>
            <TableHead
              className="cursor-pointer hover:bg-gray-100 transition-colors"
              onClick={() => requestSort("unit")}
            >
              <div className="flex items-center">
                Bargaining Unit {getSortDirectionIndicator("unit")}
              </div>
            </TableHead>
            <TableHead
              className="cursor-pointer hover:bg-gray-100 transition-colors"
              onClick={() => requestSort("category")}
            >
              <div className="flex items-center">
                Category {getSortDirectionIndicator("category")}
              </div>
            </TableHead>
            <TableHead
              className="cursor-pointer hover:bg-gray-100 transition-colors"
              onClick={() => requestSort("status")}
            >
              <div className="flex items-center">
                Status {getSortDirectionIndicator("status")}
              </div>
            </TableHead>
            <TableHead
              className="cursor-pointer hover:bg-gray-100 transition-colors"
              onClick={() => requestSort("filedAt")}
            >
              <div className="flex items-center">
                Date {getSortDirectionIndicator("filedAt")}
              </div>
            </TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedIncidents.map((incident, index) => (
            <TableRow
              key={incident.id}
              className={`${index % 2 === 0 ? "bg-white" : "bg-gray-50/50"} cursor-pointer hover:bg-gray-100 transition-colors`}
              onClick={() => window.location.href = `/product/incidents/${incident.id}/edit`}
            >
              <TableCell>{getEmployeeNames(incident)}</TableCell>
              <TableCell>{getUnit(incident)}</TableCell>
              <TableCell>{incident.category || "N/A"}</TableCell>
              <TableCell>{getStatusBadge(incident.status)}</TableCell>
              <TableCell>
                {incident.filedAt ? new Date(incident.filedAt).toLocaleDateString() : "N/A"}
              </TableCell>
              <TableCell className="text-right">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-red-600 hover:bg-red-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(incident.id);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="sr-only">Delete</span>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
} 