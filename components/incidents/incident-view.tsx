"use client";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  Card,
  CardContent,  
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Edit,
  FileText,
  Calendar,
  User,
  Building,
  FileUp,
  Clock,
  Trash2,
} from "lucide-react";
import { fetchIncidentById, deleteIncident } from "@/app/actions/incidents";
import { fetchBargainingUnitById } from "@/app/actions/bargaining-unit";
import { getAllAgreements } from "@/app/actions/agreements";
import {
  getIncidentFiles,
} from "@/app/actions/incident-files";
import { uploadIncidentFilesComplete } from "@/app/client/services/storage-client";
import IncidentFileUpload, { IncidentFile } from "./incident-file-upload";
import { useSession } from "@/lib/auth/use-auth-session";
import { useToast } from "@/hooks/use-toast";
import { formatSmartDateTime, formatPhoneNumber } from "@/lib/utils";

interface Employee {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
}

interface EvidenceFile {
  id: string;
  name: string;
  type: string;
  uploadedBy: string;
  uploadedAt: string;
  originalName?: string;
  size?: number;
}

interface BargainingUnit {
  id: string;
  name: string;
  description?: string | null;
}

interface Agreement {
  id: string;
  name: string;
  effectiveDate: Date;
  expiryDate?: Date;
}

export default function IncidentView() {
  const router = useRouter();
  const params = useParams();
  const incidentId = params.id as string;

  const [isLoading, setIsLoading] = useState(true);
  const [incident, setIncident] = useState<any>(null);
  const [bargainingUnit, setBargainingUnit] = useState<BargainingUnit | null>(
    null
  );
  const [agreement, setAgreement] = useState<Agreement | null>(null);
  const [evidenceFiles, setEvidenceFiles] = useState<EvidenceFile[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<IncidentFile[]>([]);
  const [showUploadSection, setShowUploadSection] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { data: session } = useSession();
  const { toast } = useToast();

  // Debug uploadedFiles changes
  useEffect(() => {
    console.log("uploadedFiles changed:", uploadedFiles);
  }, [uploadedFiles]);

  useEffect(() => {
    const fetchIncidentData = async () => {
      try {
        setIsLoading(true);

        // Fetch incident data
        const incidentData = await fetchIncidentById(incidentId);
        setIncident(incidentData);

        // Fetch bargaining unit if available
        if (incidentData.bargainingUnit) {
          const unitData = await fetchBargainingUnitById(
            incidentData.bargainingUnit
          );
          setBargainingUnit(unitData);
        }

        // Fetch agreements and get the newest one
        const agreements = await getAllAgreements();
        if (agreements.length > 0) {
          // Sort by effective date descending and take the newest
          const sortedAgreements = agreements.sort(
            (a: any, b: any) =>
              new Date(b.effectiveDate).getTime() -
              new Date(a.effectiveDate).getTime()
          );
          setAgreement(sortedAgreements[0]);
        }

        // Fetch incident files
        try {
          console.log("Fetching files for incident:", incidentId);
          const files = await getIncidentFiles(incidentId);
          console.log("Received files from server:", files);
          const convertedFiles: EvidenceFile[] = files.map((file) => ({
            id: file.id,
            name: file.name,
            type: file.type,
            uploadedBy: file.uploadedBy,
            uploadedAt: file.uploadedAt.toISOString(),
            originalName: file.originalName,
            size: file.size,
          }));
          console.log("Converted files:", convertedFiles);
          setEvidenceFiles(convertedFiles);
        } catch (error) {
          console.error("Error fetching incident files:", error);
          setEvidenceFiles([]);
        }
      } catch (error) {
        console.error("Error fetching incident data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (incidentId) {
      fetchIncidentData();
    }
  }, [incidentId]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      ACTIVE: { label: "Active", variant: "default" as const },
      WITHDRAWN: { label: "Withdrawn", variant: "secondary" as const },
      SETTLED: { label: "Settled", variant: "default" as const },
      RESOLVED: { label: "Resolved", variant: "default" as const },
    };

    const config =
      statusConfig[status as keyof typeof statusConfig] || statusConfig.ACTIVE;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getEmployeeNames = (employees: Employee[]) => {
    if (!employees || employees.length === 0) return "No employees listed";
    return employees
      .map((emp) => `${emp.firstName} ${emp.lastName}`)
      .join(", ");
  };

  const handleDeleteClick = () => {
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    setIsDeleting(true);
    try {
      await deleteIncident(incidentId);
      router.push("/product/incidents");
    } catch (error) {
      console.error("Error deleting incident:", error);
      toast({
        title: "Delete failed",
        description: "Failed to delete incident. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
  };

  const handleUploadFiles = async () => {
    console.log("handleUploadFiles called with", uploadedFiles.length, "files");
    if (uploadedFiles.length === 0) {
      console.log("No files to upload, returning");
      return;
    }

    setIsUploading(true);
    try {
      console.log("Starting upload for files:", uploadedFiles);

      const fileUploads = uploadedFiles.map((file) => ({
        file: file.file,
        name: file.name,
        uploadedAt: file.uploadedAt,
        uploadedBy: session?.user?.name || file.uploadedBy,
      }));

      console.log("File uploads prepared:", fileUploads);

      // Upload files and save metadata in one call
      const result = await uploadIncidentFilesComplete(incidentId, fileUploads);

      console.log("Upload result:", result);

      // Handle results
      if (result.successful.length > 0) {
        // Add the successfully uploaded files to the existing list
        const newFiles: EvidenceFile[] = result.successful.map((file) => ({
          id: file.id,
          name: file.name,
          type: file.type,
          uploadedBy: file.uploadedBy,
          uploadedAt: file.uploadedAt.toISOString(),
          originalName: file.originalName,
          size: file.size,
        }));

        console.log("New files to add:", newFiles);
        setEvidenceFiles((prev) => {
          const updated = [...prev, ...newFiles];
          console.log("Updated evidence files:", updated);
          return updated;
        });
      }

      // Show detailed results with toast
      if (result.successful.length > 0 && result.failed.length === 0) {
        // All successful
        toast({
          title: "Files uploaded successfully",
          description: `${result.successful.length} file(s) have been uploaded`,
          variant: "default",
        });
      } else if (result.successful.length > 0 && result.failed.length > 0) {
        // Partial success
        toast({
          title: "Some files uploaded",
          description: `${result.successful.length} succeeded, ${result.failed.length} failed. Check console for details.`,
          variant: "default",
        });
        console.warn("Failed uploads:", result.failed);
      } else {
        // All failed
        toast({
          title: "Upload failed",
          description: `All ${result.failed.length} files failed to upload. Check console for details.`,
          variant: "destructive",
        });
        console.error("Failed uploads:", result.failed);
      }

      // Clear upload section if any succeeded
      if (result.successful.length > 0) {
        setUploadedFiles([]);
        setShowUploadSection(false);
      }
    } catch (error) {
      console.error("Error uploading files:", error);
      toast({
        title: "Upload failed",
        description: "Failed to upload files. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-4">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Incident</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this incident? This action
                cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={handleDeleteCancel}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
              >
                {isDeleting ? "Deleting..." : "Delete Incident"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  if (!incident) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">
            Incident Not Found
          </h1>
          <p className="text-gray-600 mt-2">
            The incident you're looking for doesn't exist.
          </p>
          <Button onClick={() => router.back()} className="mt-4">
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Incident Details</h1>
            <p className="text-muted-foreground">
              Incident #{incident.id.slice(-8)}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => router.push(`/product/incidents/${incidentId}/edit`)}
            variant="outline"
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <Button onClick={handleDeleteClick} variant="destructive">
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Incident Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Incident Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Category
                  </label>
                  <p className="text-sm">
                    {incident.category || "Not specified"}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Status
                  </label>
                  <div className="mt-1">{getStatusBadge(incident.status)}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Fixed Date
                  </label>
                  <p className="text-sm flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {incident.filedAt
                      ? formatDate(incident.filedAt)
                      : "Not specified"}
                    {incident.createdAt && (
                      <span className="text-xs text-gray-500 ml-2">
                        (Added: {formatSmartDateTime(incident.createdAt)})
                      </span>
                    )}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Last Updated
                  </label>
                  <p className="text-sm flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {incident.updatedAt
                      ? formatSmartDateTime(incident.updatedAt)
                      : "Not specified"}
                  </p>
                </div>
              </div>

              {incident.description && (
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Description
                  </label>
                  <p className="text-sm mt-1 whitespace-pre-wrap">
                    {incident.description}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Employee Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Employee Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              {incident.employees && incident.employees.length > 0 ? (
                <div className="space-y-3">
                  {incident.employees.map(
                    (employee: Employee, index: number) => (
                      <div key={index} className="p-3 border rounded-lg">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs font-medium text-gray-500">
                              Name
                            </label>
                            <p className="text-sm">
                              {employee.firstName} {employee.lastName}
                            </p>
                          </div>
                          <div>
                            <label className="text-xs font-medium text-gray-500">
                              Email
                            </label>
                            <p className="text-sm">{employee.email}</p>
                          </div>
                          {employee.phone && (
                            <div>
                              <label className="text-xs font-medium text-gray-500">
                                Phone
                              </label>
                              <p className="text-sm">{formatPhoneNumber(employee.phone)}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-500">
                  No employee details available
                </p>
              )}
            </CardContent>
          </Card>

          {/* Uploaded Files */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FileUp className="h-5 w-5" />
                  Uploaded Files
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowUploadSection(!showUploadSection)}
                >
                  {showUploadSection ? "Cancel" : "Add Files"}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* File Upload Section */}
              {showUploadSection && (
                <div className="mb-6 p-4 border rounded-lg bg-gray-50">
                  <IncidentFileUpload
                    files={uploadedFiles}
                    onFilesChange={(files) => {
                      console.log("Files changed:", files);
                      setUploadedFiles(files);
                    }}
                    onFileRemove={(fileId) =>
                      setUploadedFiles(
                        uploadedFiles.filter((f) => f.id !== fileId)
                      )
                    }
                    onFileNameChange={(fileId, newName) =>
                      setUploadedFiles(
                        uploadedFiles.map((f) =>
                          f.id === fileId ? { ...f, name: newName } : f
                        )
                      )
                    }
                  />
                  <div className="flex justify-end gap-2 mt-4">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowUploadSection(false);
                        setUploadedFiles([]);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleUploadFiles}
                      disabled={uploadedFiles.length === 0 || isUploading}
                    >
                      {isUploading ? "Uploading..." : "Upload Files"}
                    </Button>
                  </div>
                </div>
              )}

              {/* Existing Files */}
              {evidenceFiles.length > 0 ? (
                <div className="space-y-3">
                  {evidenceFiles.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-gray-400" />
                        <div>
                          <p className="text-sm font-medium">
                            {file.originalName || file.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            Uploaded by {file.uploadedBy} on{" "}
                            {formatDateTime(file.uploadedAt)}
                            {file.size &&
                              ` • ${(file.size / 1024 / 1024).toFixed(1)} MB`}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {file.type.split("/")[1]?.toUpperCase() || file.type}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileUp className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500 mb-2">
                    No files uploaded
                  </p>
                  <p className="text-xs text-gray-400">
                    Click "Add Files" to upload supporting documents
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Bargaining Unit */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Bargaining Unit
              </CardTitle>
            </CardHeader>
            <CardContent>
              {bargainingUnit ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium">{bargainingUnit.name}</p>
                  {bargainingUnit.description && (
                    <p className="text-xs text-gray-500">
                      {bargainingUnit.description}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-500">
                  No bargaining unit assigned
                </p>
              )}
            </CardContent>
          </Card>

          {/* Collective Agreement */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Collective Agreement
              </CardTitle>
            </CardHeader>
            <CardContent>
              {agreement ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium">{agreement.name}</p>
                  <p className="text-xs text-gray-500">
                    Effective:{" "}
                    {formatDate(agreement.effectiveDate.toISOString())}
                  </p>
                  {agreement.expiryDate && (
                    <p className="text-xs text-gray-500">
                      Expires: {formatDate(agreement.expiryDate.toISOString())}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No agreement assigned</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
