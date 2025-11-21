"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, ChevronRight, FileText, Filter, X, Download } from "lucide-react";
import { fetchSessionData, type SessionDataEntry, type SessionDataFilters } from "@/app/actions/session-data";
import { GrievanceEventType } from "@prisma/client";
import { formatSmartDateTime } from "@/lib/utils";
import Link from "next/link";

const EVENT_TYPE_LABELS: Record<GrievanceEventType, string> = {
  CREATED: "Created",
  STATUS_CHANGED: "Status Changed",
  EVIDENCE_ADDED: "Evidence Added",
  EVIDENCE_REMOVED: "Evidence Removed",
  AGREEMENT_CHANGED: "Agreement Changed",
  CATEGORY_CHANGED: "Category Changed",
  STATEMENT_UPDATED: "Statement Updated",
  ASSIGNEE_CHANGED: "Assignee Changed",
  STEP_COMPLETED: "Step Completed",
  TIMELINE_ENTRY_ADDED: "Timeline Entry Added",
  COST_UPDATED: "Cost Updated",
  GRIEVANCE_WITHDRAWN: "Grievance Withdrawn",
  GRIEVANCE_SETTLED: "Grievance Settled",
};

const EVENT_TYPE_COLORS: Record<GrievanceEventType, string> = {
  CREATED: "bg-blue-100 text-blue-800",
  STATUS_CHANGED: "bg-purple-100 text-purple-800",
  EVIDENCE_ADDED: "bg-green-100 text-green-800",
  EVIDENCE_REMOVED: "bg-red-100 text-red-800",
  AGREEMENT_CHANGED: "bg-yellow-100 text-yellow-800",
  CATEGORY_CHANGED: "bg-orange-100 text-orange-800",
  STATEMENT_UPDATED: "bg-cyan-100 text-cyan-800",
  ASSIGNEE_CHANGED: "bg-indigo-100 text-indigo-800",
  STEP_COMPLETED: "bg-teal-100 text-teal-800",
  TIMELINE_ENTRY_ADDED: "bg-pink-100 text-pink-800",
  COST_UPDATED: "bg-amber-100 text-amber-800",
  GRIEVANCE_WITHDRAWN: "bg-gray-100 text-gray-800",
  GRIEVANCE_SETTLED: "bg-emerald-100 text-emerald-800",
};

export function SessionDataSettings() {
  const { toast } = useToast();
  const [logs, setLogs] = useState<SessionDataEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 50;

  // Filters
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedEventType, setSelectedEventType] = useState<GrievanceEventType | "ALL">("ALL");
  const [hasActiveFilters, setHasActiveFilters] = useState(false);

  // Load session data logs
  const loadLogs = async (page: number = 1) => {
    setIsLoading(true);
    try {
      const filters: SessionDataFilters = {};

      if (startDate) {
        filters.startDate = new Date(startDate);
      }
      if (endDate) {
        // Set to end of day
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);
        filters.endDate = endDateTime;
      }
      if (selectedEventType !== "ALL") {
        filters.eventTypes = [selectedEventType];
      }

      const result = await fetchSessionData(filters, page, pageSize);
      setLogs(result.logs);
      setTotal(result.total);
      setTotalPages(result.totalPages);
      setCurrentPage(page);
    } catch (error) {
      console.error("Error loading session data:", error);
      toast({
        title: "Error",
        description: "Failed to load session data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Load logs on mount and when filters change
  useEffect(() => {
    loadLogs(1);
    // Check if we have active filters
    const hasFilters = startDate !== "" || endDate !== "" || selectedEventType !== "ALL";
    setHasActiveFilters(hasFilters);
  }, [startDate, endDate, selectedEventType]);

  const handleClearFilters = () => {
    setStartDate("");
    setEndDate("");
    setSelectedEventType("ALL");
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      loadLogs(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      loadLogs(currentPage + 1);
    }
  };

  const handleDownloadAll = async () => {
    setIsDownloading(true);
    try {
      // Build filters
      const filters: SessionDataFilters = {};
      if (startDate) {
        filters.startDate = new Date(startDate);
      }
      if (endDate) {
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);
        filters.endDate = endDateTime;
      }
      if (selectedEventType !== "ALL") {
        filters.eventTypes = [selectedEventType];
      }

      // Fetch all logs (no pagination)
      const result = await fetchSessionData(filters, 1, 999999);
      const allLogs = result.logs;

      if (allLogs.length === 0) {
        toast({
          title: "No Data",
          description: "No session data entries to download",
          variant: "destructive",
        });
        return;
      }

      // Convert to CSV
      const headers = [
        "Date & Time",
        "User Name",
        "User Email",
        "User ID",
        "Event Type",
        "Grievance ID",
        "Grievance External ID",
      ];

      const csvRows = [
        headers.join(","),
        ...allLogs.map((log) => {
          const row = [
            `"${formatSmartDateTime(log.createdAt)}"`,
            `"${log.userName || ""}"`,
            `"${log.userEmail}"`,
            `"${log.userId}"`,
            `"${EVENT_TYPE_LABELS[log.eventType]}"`,
            `"${log.grievanceId}"`,
            `"${log.grievanceExternalId || ""}"`,
          ];
          return row.join(",");
        }),
      ];

      const csvContent = csvRows.join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);

      // Generate filename with date range if applicable
      let filename = "session-data";
      if (startDate || endDate) {
        filename += `_${startDate || "start"}_to_${endDate || "end"}`;
      }
      filename += `.csv`;

      link.setAttribute("href", url);
      link.setAttribute("download", filename);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Download Complete",
        description: `Downloaded ${allLogs.length} session data entries`,
      });
    } catch (error) {
      console.error("Error downloading session data:", error);
      toast({
        title: "Download Failed",
        description: "Failed to download session data",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl">
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center">
                <FileText className="h-5 w-5 mr-2 text-blue-500" />
                Session Data
              </CardTitle>
              <CardDescription>
                Track all system events and changes to grievances in your organization
              </CardDescription>
            </div>
            <Button
              onClick={handleDownloadAll}
              disabled={isDownloading || isLoading || total === 0}
              variant="outline"
              size="sm"
            >
              {isDownloading ? (
                <>
                  <Download className="h-4 w-4 mr-2 animate-pulse" />
                  Downloading...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Download All
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Filters */}
          <div className="border rounded-lg p-4 bg-gray-50">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-gray-500" />
                <Label className="text-sm font-medium">Filters</Label>
              </div>
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearFilters}
                  className="h-8 text-xs"
                >
                  <X className="h-3 w-3 mr-1" />
                  Clear Filters
                </Button>
              )}
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <Label htmlFor="start-date" className="text-sm">
                  Start Date
                </Label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="end-date" className="text-sm">
                  End Date
                </Label>
                <Input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="event-type" className="text-sm">
                  Event Type
                </Label>
                <Select
                  value={selectedEventType}
                  onValueChange={(value) => setSelectedEventType(value as GrievanceEventType | "ALL")}
                >
                  <SelectTrigger id="event-type" className="mt-1">
                    <SelectValue placeholder="All Events" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    <SelectItem value="ALL">All Events</SelectItem>
                    {Object.entries(EVENT_TYPE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Results Summary */}
          {!isLoading && (
            <div className="text-sm text-gray-600">
              Showing {logs.length > 0 ? ((currentPage - 1) * pageSize) + 1 : 0} to{" "}
              {Math.min(currentPage * pageSize, total)} of {total} events
            </div>
          )}

          {/* Table */}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="font-semibold">Date & Time</TableHead>
                  <TableHead className="font-semibold">User</TableHead>
                  <TableHead className="font-semibold">Event Type</TableHead>
                  <TableHead className="font-semibold">Grievance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  // Loading skeleton
                  Array.from({ length: 10 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Skeleton className="h-4 w-32" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-40" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-6 w-24" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-20" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                      No session data entries found
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-sm">
                        {formatSmartDateTime(log.createdAt)}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div className="font-medium">{log.userName || "Unknown"}</div>
                          <div className="text-xs text-gray-500">{log.userEmail}</div>
                          <div className="text-xs text-gray-400 font-mono mt-0.5">{log.userId}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`${EVENT_TYPE_COLORS[log.eventType]} border-0`}
                        >
                          {EVENT_TYPE_LABELS[log.eventType]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/product/grievances/${log.grievanceId}`}
                          className="text-blue-600 hover:text-blue-800 hover:underline text-sm"
                        >
                          {log.grievanceExternalId || log.grievanceId.slice(0, 8)}
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {!isLoading && totalPages > 1 && (
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePreviousPage}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
