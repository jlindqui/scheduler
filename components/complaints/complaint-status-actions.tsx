"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
  AlertTriangle, 
  CheckCircle, 
  FileText, 
  ExternalLink,
  Loader2,
  RefreshCw,
  ArrowUpDown
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface ComplaintStatusActionsProps {
  complaintId: string;
  currentStatus: string;
  resolution?: string | null;
  grievanceId?: string | null;
  onStatusChange?: (newStatus: string, resolution?: string) => void;
}

export default function ComplaintStatusActions({ 
  complaintId, 
  currentStatus, 
  resolution,
  grievanceId,
  onStatusChange 
}: ComplaintStatusActionsProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [isResolutionDialogOpen, setIsResolutionDialogOpen] = useState(false);
  const [isElevateDialogOpen, setIsElevateDialogOpen] = useState(false);
  const [resolutionText, setResolutionText] = useState(resolution || "");
  const { toast } = useToast();
  const router = useRouter();

  const getStatusColor = (status: string) => {
    switch (status) {
      case "OPEN":
        return "bg-green-100 text-green-800 border-green-200";
      case "CLOSED":
        return "bg-red-100 text-red-800 border-red-200";
      case "GRIEVED":
        return "bg-orange-100 text-orange-800 border-orange-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const handleStatusUpdate = async (newStatus: string, resolutionText?: string) => {
    setIsUpdating(true);
    try {
      const formData = new FormData();
      formData.append("complaintId", complaintId);
      formData.append("status", newStatus);
      if (resolutionText) {
        formData.append("resolution", resolutionText);
      }

      const response = await fetch("/api/complaints/update-status", {
        method: "POST",
        body: formData,
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(`Failed to update status: ${responseData.error || response.statusText}`);
      }

      toast({
        title: "Status updated",
        description: `Complaint status changed to ${newStatus}`,
      });

      onStatusChange?.(newStatus, resolutionText);
      setIsResolutionDialogOpen(false);
      router.refresh();
    } catch (error) {
      console.error("Error updating status:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update complaint status",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleElevateToGrievance = async () => {
    setIsUpdating(true);
    setIsElevateDialogOpen(false);

    try {
      // Import the convert function dynamically to avoid circular imports
      const { convertComplaintToGrievance } = await import("@/app/actions/complaints");
      const result = await convertComplaintToGrievance(complaintId);

      toast({
        title: result.isNew ? "Complaint Converted" : "Grievance Found",
        description: result.isNew
          ? "Complaint has been successfully converted to a grievance."
          : "A grievance already exists for this complaint.",
        variant: "default",
      });

      // Redirect to the grievance
      router.push(`/product/grievances/${result.grievanceId}`);
    } catch (error) {
      console.error("Error converting complaint:", error);
      toast({
        title: "Conversion Failed",
        description: error instanceof Error ? error.message : "Failed to convert complaint to grievance.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCloseWithResolution = () => {
    if (!resolutionText.trim()) {
      toast({
        title: "Resolution Required",
        description: "Please provide a resolution before closing the complaint.",
        variant: "destructive",
      });
      return;
    }
    handleStatusUpdate("CLOSED", resolutionText);
  };

  const handleReopen = () => {
    handleStatusUpdate("OPEN");
  };

  const handleCloseAndUpdateResolution = () => {
    if (!resolutionText.trim()) {
      toast({
        title: "Resolution Required",
        description: "Please provide a resolution before closing the complaint.",
        variant: "destructive",
      });
      return;
    }
    handleStatusUpdate("CLOSED", resolutionText);
  };

  // Check if complaint was previously closed (has resolution)
  const wasPreviouslyClosed = Boolean(resolution);

  // Render different actions based on current status
  const renderStatusActions = () => {
    switch (currentStatus) {
      case "OPEN":
        return (
          <div className="flex items-center gap-2">
            <Dialog open={isElevateDialogOpen} onOpenChange={setIsElevateDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm"
                  disabled={isUpdating}
                  className="border-blue-200 text-blue-700 hover:bg-blue-50"
                >
                  <ArrowUpDown className="h-4 w-4 mr-2" />
                  Elevate to Grievance
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                    Elevate to Grievance
                  </DialogTitle>
                  <DialogDescription className="text-left">
                    This will change the status of the complaint to <strong>Grieved</strong> and create a new grievance
                    copying all the details of the complaint.
                    <br />
                    <br />
                    <strong>Do you want to continue?</strong>
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter className="gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setIsElevateDialogOpen(false)}
                    disabled={isUpdating}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleElevateToGrievance}
                    disabled={isUpdating}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {isUpdating ? (
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
            
            <Dialog open={isResolutionDialogOpen} onOpenChange={setIsResolutionDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm"
                  disabled={isUpdating}
                  className="border-orange-200 text-orange-700 hover:bg-orange-50"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {wasPreviouslyClosed ? "Close and Update Resolution" : "Close and Add Resolution"}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Close Complaint</DialogTitle>
                  <DialogDescription>
                    Please provide a resolution for this complaint before closing it.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="resolution">Resolution</Label>
                    <Textarea
                      id="resolution"
                      value={resolutionText}
                      onChange={(e) => setResolutionText(e.target.value)}
                      placeholder="Describe how this complaint was resolved..."
                      className="min-h-[120px]"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button 
                    variant="outline" 
                    onClick={() => setIsResolutionDialogOpen(false)}
                    disabled={isUpdating}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleCloseWithResolution}
                    disabled={isUpdating || !resolutionText.trim()}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    {isUpdating ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Closing...
                      </>
                    ) : (
                      "Close Complaint"
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        );

      case "CLOSED":
        return (
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleReopen}
            disabled={isUpdating}
            className="border-green-200 text-green-700 hover:bg-green-50"
          >
            {isUpdating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Reopening...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Reopen
              </>
            )}
          </Button>
        );

      case "GRIEVED":
        return grievanceId ? (
          <Link href={`/product/grievances/${grievanceId}`}>
            <Button 
              variant="outline" 
              size="sm"
              className="border-blue-200 text-blue-700 hover:bg-blue-50"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Go to Grievance
            </Button>
          </Link>
        ) : (
          <Badge variant="outline" className="border-orange-200 text-orange-700">
            Grievance Created
          </Badge>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex items-center gap-3">
      {/* <Badge className={getStatusColor(currentStatus)}>
        {currentStatus}
      </Badge> */}
      {renderStatusActions()}
    </div>
  );
}
