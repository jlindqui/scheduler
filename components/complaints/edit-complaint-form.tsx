"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type React from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import FileUpload, { ComplaintFile } from "./file-upload";
import FileDisplay, { ComplaintFileDisplay } from "./file-display";
import {
  updateComplaintFileName,
  deleteComplaintFile,
} from "@/app/actions/complaint-files";
import { uploadComplaintFilesComplete } from "@/app/client/services/storage-client";
import { updateComplaint } from "@/app/actions/complaints";
import ComplaintNotes from "./complaint-notes";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Edit,
  FileText,
  Tag,
  User,
  CheckCircle,
  Check,
  Loader2,
  Upload,
  Plus,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { useSession } from "@/lib/auth/use-auth-session";
import { fetchBargainingUnits } from "@/app/actions/bargaining-unit";
import { fetchAgreementsByBargainingUnit } from "@/app/actions/agreements";
import { GRIEVANCE_CATEGORIES } from "@/app/lib/definitions";

interface EditComplaintFormProps {
  complaintId: string;
  complaintData?: any;
  onLoadingChange?: (isLoading: boolean) => void;
}

export default function EditComplaintForm({
  complaintId,
  complaintData,
  onLoadingChange,
}: EditComplaintFormProps) {
  // Disable editing if complaint is grieved
  const isDisabled = complaintData?.status === "GRIEVED";
  const router = useRouter();
  const { toast } = useToast();
  const { data: session } = useSession();

  // Form state - populated from complaint data
  const [formData, setFormData] = useState({
    complaintNumber: complaintData?.complaintNumber || "",
    type: complaintData?.type || "INDIVIDUAL",
    category: complaintData?.category || "",
    bargainingUnitId: complaintData?.bargainingUnitId || "",
    agreementId: complaintData?.agreementId || "",
    issue: complaintData?.issue || "",
    settlementDesired: complaintData?.settlementDesired || "",
    resolution: complaintData?.resolution || "",
    supportingDocuments: complaintData?.supportingDocuments || [],
    articlesViolated: complaintData?.articlesViolated || [],
    status: complaintData?.status || "OPEN",
    // Employee information
    complainantFirstName: complaintData?.complainantFirstName || "",
    complainantLastName: complaintData?.complainantLastName || "",
    complainantEmail: complaintData?.complainantEmail || "",
    complainantPhone: complaintData?.complainantPhone || "",
    complainantPosition: complaintData?.complainantPosition || "",
    complainantDepartment: complaintData?.complainantDepartment || "",
    complainantSupervisor: complaintData?.complainantSupervisor || "",
    employees: complaintData?.employees || [] as Array<{
      id: string;
      firstName: string;
      lastName: string;
      email: string;
      phoneNumber: string;
      position: string;
      department: string;
      supervisor: string;
    }>,
  });

  // State for agreements
  const [agreements, setAgreements] = useState<Array<{ id: string; name: string }>>([]);
  const [isLoadingAgreements, setIsLoadingAgreements] = useState(true);

  // Update form data when complaintData changes
  useEffect(() => {
    if (complaintData) {
      // Convert existing employees data to the new format if needed
      let employees = complaintData.employees || [];
      if (Array.isArray(employees) && employees.length > 0 && !employees[0].id) {
        // Convert old format to new format
        employees = employees.map((emp: any, index: number) => ({
          id: emp.id || `emp-${index}`,
          firstName: emp.firstName || emp.first_name || "",
          lastName: emp.lastName || emp.last_name || "",
          email: emp.email || "",
          phoneNumber: emp.phoneNumber || emp.phone_number || "",
          position: emp.position || "",
          department: emp.department || "",
          supervisor: emp.supervisor || "",
        }));
      }

      setFormData({
        complaintNumber: complaintData.complaintNumber || "",
        type: complaintData.type || "INDIVIDUAL",
        category: complaintData.category || "",
        bargainingUnitId: complaintData.bargainingUnitId || "",
        agreementId: complaintData.agreementId || "",
        issue: complaintData.issue || "",
        settlementDesired: complaintData.settlementDesired || "",
        resolution: complaintData.resolution || "",
        supportingDocuments: complaintData.supportingDocuments || [],
        articlesViolated: complaintData.articlesViolated || [],
        status: complaintData.status || "OPEN",
        // Employee information
        complainantFirstName: complaintData.complainantFirstName || "",
        complainantLastName: complaintData.complainantLastName || "",
        complainantEmail: complaintData.complainantEmail || "",
        complainantPhone: complaintData.complainantPhone || "",
        complainantPosition: complaintData.complainantPosition || "",
        complainantDepartment: complaintData.complainantDepartment || "",
        complainantSupervisor: complaintData.complainantSupervisor || "",
        employees: employees,
      });
    }
  }, [complaintData]);

  // Load existing files when complaintData changes
  useEffect(() => {
    if (complaintData?.evidence) {
      const files = complaintData.evidence.map((file: any) => {
        // Extract user information from facts_json
        const facts = file.facts_json || {};
        const userInfo = {
          uploadedBy: facts.uploadedBy || "Unknown",
          uploadedById: facts.uploadedById || "",
          uploadedByEmail: facts.uploadedByEmail || "",
          uploadedAt: facts.uploadedAt
            ? new Date(facts.uploadedAt)
            : new Date(file.date),
        };

        return {
          id: file.id,
          name: file.name,
          originalName: file.source,
          uploadedAt: userInfo.uploadedAt,
          uploadedBy: userInfo.uploadedBy,
          fileSize: 0, // This should come from evidence data
          fileUrl: file.source,
          isEditing: false,
        };
      });
      setExistingFiles(files);
    }
  }, [complaintData]);

  // Fetch bargaining units
  useEffect(() => {
    const fetchUnits = async () => {
      try {
        const units = await fetchBargainingUnits();
        setBargainingUnits(units);
      } catch (error) {
        console.error("Error fetching bargaining units:", error);
        toast({
          title: "Error",
          description: "Failed to load bargaining units. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoadingUnits(false);
      }
    };
    fetchUnits();
  }, [toast]);

  // Fetch agreements when bargaining unit changes
  useEffect(() => {
    const fetchAgreementsForUnit = async () => {
      if (!formData.bargainingUnitId) {
        setAgreements([]);
        setFormData((prev) => ({ ...prev, agreementId: "" }));
        return;
      }
      try {
        setIsLoadingAgreements(true);
        const agreementsList = await fetchAgreementsByBargainingUnit(formData.bargainingUnitId);
        setAgreements(agreementsList);

        // Auto-select agreement if there's only one for this unit
        if (agreementsList.length === 1) {
          setFormData((prev) => ({
            ...prev,
            agreementId: agreementsList[0].id,
          }));
        } else if (agreementsList.length > 0) {
          // If multiple agreements, set the first as default
          setFormData((prev) => ({
            ...prev,
            agreementId: agreementsList[0].id,
          }));
        } else {
          // Clear agreement if none available for this unit
          setFormData((prev) => ({ ...prev, agreementId: "" }));
        }
      } catch (error) {
        console.error("Error fetching agreements for unit:", error);
        toast({
          title: "Error",
          description: "Failed to load agreements for this bargaining unit. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoadingAgreements(false);
      }
    };
    fetchAgreementsForUnit();
  }, [formData.bargainingUnitId, toast]);

  // Form errors state
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Dialog state
  const [isResolveDialogOpen, setIsResolveDialogOpen] = useState(false);
  const [resolutionAttachment, setResolutionAttachment] = useState("");
  const [showFileDeleteDialog, setShowFileDeleteDialog] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<ComplaintFile[]>([]);
  const [existingFiles, setExistingFiles] = useState<ComplaintFileDisplay[]>(
    []
  );
  const [bargainingUnits, setBargainingUnits] = useState<any[]>([]);
  const [isLoadingUnits, setIsLoadingUnits] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  // Notify parent component when loading state changes
  useEffect(() => {
    onLoadingChange?.(isUpdating);
  }, [isUpdating, onLoadingChange]);

  // Handle input changes
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { id, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [id]: value,
    }));

    // Clear error for this field when user types
    if (errors[id]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[id];
        return newErrors;
      });
    }
  };

  // Handle select changes
  const handleSelectChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Clear error for this field when user selects
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);

    try {
      const formDataToSubmit = new FormData();
      
      // Add all form fields
      formDataToSubmit.append("complaintNumber", formData.complaintNumber);
      formDataToSubmit.append("type", formData.type);
      formDataToSubmit.append("category", formData.category);
      formDataToSubmit.append("bargainingUnitId", formData.bargainingUnitId);
      formDataToSubmit.append("agreementId", formData.agreementId);
      formDataToSubmit.append("issue", formData.issue);
      formDataToSubmit.append("settlementDesired", formData.settlementDesired);
      formDataToSubmit.append("resolution", formData.resolution);
              formDataToSubmit.append("supportingDocuments", formData.supportingDocuments.join(","));
        formDataToSubmit.append("articlesViolated", formData.articlesViolated.join(","));
        formDataToSubmit.append("status", formData.status);
        
        // Employee information
      formDataToSubmit.append("complainantFirstName", formData.complainantFirstName);
      formDataToSubmit.append("complainantLastName", formData.complainantLastName);
      formDataToSubmit.append("complainantEmail", formData.complainantEmail);
      formDataToSubmit.append("complainantPhone", formData.complainantPhone);
      formDataToSubmit.append("complainantPosition", formData.complainantPosition);
      formDataToSubmit.append("complainantDepartment", formData.complainantDepartment);
      formDataToSubmit.append("complainantSupervisor", formData.complainantSupervisor);
      formDataToSubmit.append("employees", JSON.stringify(formData.employees));

      await updateComplaint(complaintId, formDataToSubmit);

      // Upload files if any
      if (uploadedFiles.length > 0) {
        try {
          const currentUser = session?.user;
          const fileUploads = uploadedFiles.map((file) => ({
            id: file.id,
            file: file.file,
            name: file.name,
            uploadedAt: file.uploadedAt,
            uploadedBy: currentUser?.name || file.uploadedBy,
          }));

          // Upload files and save metadata in one call
          await uploadComplaintFilesComplete(complaintId, fileUploads);
        } catch (fileError) {
          console.error("Error uploading files:", fileError);
          toast({
            title: "Warning",
            description: "Complaint updated but some files failed to upload.",
            variant: "destructive",
          });
        }
      }

      toast({
        title: "Complaint updated",
        description: "The complaint has been successfully updated!",
      });

      router.push(`/product/complaints/${complaintId}/view`);
    } catch (error) {
      console.error("Error updating complaint:", error);
      toast({
        title: "Error",
        description: "Failed to update complaint. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle resolution submission
  const handleResolveSubmit = () => {
    toast({
      title: "Complaint resolved",
      description: "The complaint has been resolved!",
      variant: "default",
    });
    setIsResolveDialogOpen(false);
    router.push("/product/complaints");
  };

  const handleUpdate = async () => {
    setIsUpdating(true);
    
    try {
      // Show loading toast
      toast({
        title: "Updating complaint...",
        description: "Please wait while we save your changes.",
        variant: "default",
      });

      // Upload files if any
      if (uploadedFiles.length > 0) {
        try {
          const currentUser = session?.user;
          const fileUploads = uploadedFiles.map((file) => ({
            id: file.id,
            file: file.file,
            name: file.name,
            uploadedAt: file.uploadedAt,
            uploadedBy: currentUser?.name || file.uploadedBy,
          }));

          // Upload files and save metadata in one call
          await uploadComplaintFilesComplete(complaintId, fileUploads);
        } catch (fileError) {
          console.error("Error uploading files:", fileError);
          toast({
            title: "Warning",
            description: "Complaint updated but some files failed to upload.",
            variant: "destructive",
          });
        }
      }

      // TODO: Add actual complaint update logic here
      // await updateComplaint(complaintId, formData);

      toast({
        title: "Success",
        description: "The complaint has been successfully updated.",
        variant: "default",
      });
      
      router.push("/product/complaints");
    } catch (error) {
      console.error("Error updating complaint:", error);
      toast({
        title: "Error",
        description: "Failed to update complaint. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancel = () => {
    router.push("/product/complaints");
  };

  // Handle existing file name change
  const handleExistingFileNameChange = async (
    fileId: string,
    newName: string
  ) => {
    try {
      await updateComplaintFileName(fileId, newName);

      // Update local state
      setExistingFiles(
        existingFiles.map((f) =>
          f.id === fileId ? { ...f, name: newName, isEditing: false } : f
        )
      );

      toast({
        title: "File name updated",
        description: "The file name has been updated successfully",
        variant: "default",
      });
    } catch (error) {
      console.error("Error updating file name:", error);
      toast({
        title: "Error",
        description: "Failed to update file name. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle existing file deletion
  const handleExistingFileDelete = (fileId: string) => {
    setFileToDelete(fileId);
    setShowFileDeleteDialog(true);
  };

  const confirmFileDelete = async () => {
    if (!fileToDelete) return;

    try {
      await deleteComplaintFile(fileToDelete);

      // Update local state
      setExistingFiles(existingFiles.filter((f) => f.id !== fileToDelete));

      toast({
        title: "File deleted",
        description: "The file has been deleted successfully",
        variant: "default",
      });

      setShowFileDeleteDialog(false);
      setFileToDelete(null);
    } catch (error) {
      console.error("Error deleting file:", error);
      toast({
        title: "Error",
        description: "Failed to delete file. Please try again.",
        variant: "destructive",
      });
    }
  };

  const cancelFileDelete = () => {
    setShowFileDeleteDialog(false);
    setFileToDelete(null);
  };

  // Show loading state if complaintData is not available
  if (!complaintData) {
    return (
      <Card className="shadow-lg border-0 border-t-4 border-t-amber-500 overflow-hidden">
        <CardHeader className="pb-4 bg-gray-50 border-b">
          <div>
            <CardTitle className="text-2xl font-bold text-gray-900 flex items-center">
              <Edit className="h-5 w-5 mr-2 text-amber-500" />
              Edit Complaint #{complaintId}
            </CardTitle>
            <CardDescription className="mt-1">
              Update an existing complaint record
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-8">
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
              <span className="text-gray-600">
                Loading complaint details...
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center">
          <Edit className="h-8 w-8 mr-3 text-blue-600" />
          Edit Complaint #{complaintData?.complaintNumber || complaintId}
        </h1>
        <p className="text-gray-600 mt-2">
          Update the complaint details and supporting information
        </p>
      </div>

      <form id="edit-complaint-form" onSubmit={handleSubmit}>
        {isDisabled && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              <p className="text-orange-800 font-medium">
                This complaint has been elevated to a grievance and cannot be edited.
              </p>
            </div>
          </div>
        )}
        
        {/* Main Grid Container */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {/* Left Column - Basic Info */}
          <div className="space-y-6">
            {/* Basic Information Card */}
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center">
                  <FileText className="h-5 w-5 mr-2 text-blue-500" />
                  Basic Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Type</Label>
                    <Select value={formData.type} onValueChange={(value) => handleSelectChange("type", value)} disabled>
                      <SelectTrigger className="w-full h-8">
                        <SelectValue placeholder="Select Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectItem value="INDIVIDUAL">Individual</SelectItem>
                          <SelectItem value="GROUP">Group</SelectItem>
                          <SelectItem value="POLICY">Policy</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Category</Label>
                    <Select value={formData.category} onValueChange={(value) => handleSelectChange("category", value)}>
                      <SelectTrigger className="w-full h-8">
                        <SelectValue placeholder="Select Category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {GRIEVANCE_CATEGORIES.map((category) => (
                            <SelectItem key={category} value={category}>
                              {category}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div>
                  <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Bargaining Unit</Label>
                  {isLoadingUnits ? (
                    <div className="h-8 bg-gray-100 rounded-md animate-pulse"></div>
                  ) : bargainingUnits.length === 0 ? (
                    <div className="h-8 bg-gray-50 rounded-md flex items-center px-3 text-sm text-gray-500">
                      No bargaining units available
                    </div>
                  ) : (
                    <Select value={formData.bargainingUnitId} onValueChange={(value) => handleSelectChange("bargainingUnitId", value)}>
                      <SelectTrigger className="w-full h-8">
                      <SelectValue placeholder="Select Unit" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {bargainingUnits.map((unit) => (
                        <SelectItem key={unit.id} value={unit.id}>
                          {unit.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              )}
            </div>

            <div>
              <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Collective Agreement</Label>
              {isLoadingAgreements ? (
                <div className="h-8 bg-gray-100 rounded-md animate-pulse"></div>
              ) : agreements.length === 0 ? (
                <div className="h-8 bg-gray-50 rounded-md flex items-center px-3 text-sm text-gray-500">
                  No agreements available
                </div>
              ) : (
                <Select value={formData.agreementId} onValueChange={(value) => handleSelectChange("agreementId", value)}>
                  <SelectTrigger className="w-full h-8">
                    <SelectValue placeholder="Select Agreement" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {agreements.map((agreement) => (
                        <SelectItem key={agreement.id} value={agreement.id}>
                          {agreement.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Employee Information Card */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center">
              <User className="h-5 w-5 mr-2 text-blue-500" />
              Employee Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Primary Complainant */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">First Name</Label>
                <Input
                  id="complainantFirstName"
                  value={formData.complainantFirstName}
                  onChange={handleChange}
                  placeholder="First name"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Last Name</Label>
                <Input
                  id="complainantLastName"
                  value={formData.complainantLastName}
                  onChange={handleChange}
                  placeholder="Last name"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Email</Label>
                <Input
                  id="complainantEmail"
                  type="email"
                  value={formData.complainantEmail}
                  onChange={handleChange}
                  placeholder="Email address"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Phone Number</Label>
                <Input
                  id="complainantPhone"
                  value={formData.complainantPhone}
                  onChange={handleChange}
                  placeholder="Phone number"
                />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Position</Label>
                  <Input
                    id="complainantPosition"
                    value={formData.complainantPosition}
                    onChange={handleChange}
                    placeholder="Job position"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Department</Label>
                  <Input
                    id="complainantDepartment"
                    value={formData.complainantDepartment}
                    onChange={handleChange}
                    placeholder="Department"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Supervisor</Label>
                <Input
                  id="complainantSupervisor"
                  value={formData.complainantSupervisor}
                  onChange={handleChange}
                  placeholder="Supervisor name"
                />
              </div>

              {/* Additional Employees for Group Complaints */}
              {formData.type === "GROUP" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="font-medium text-sm">
                      Additional Employees Involved
                    </Label>
                  </div>

                  {formData.employees.map((employee: any, index: number) => (
                    <div
                      key={employee.id}
                      className="p-4 border border-gray-200 rounded-lg bg-white shadow-sm"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-medium text-gray-900">
                          Employee {index + 1}
                        </h4>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setFormData((prev) => ({
                              ...prev,
                              employees: prev.employees.filter((_: any, i: number) => i !== index),
                            }));
                          }}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">
                            First Name
                          </Label>
                          <Input
                            placeholder="First name"
                            value={employee.firstName}
                            onChange={(e) => {
                              const newEmployees = [...formData.employees];
                              newEmployees[index].firstName = e.target.value;
                              setFormData((prev) => ({
                                ...prev,
                                employees: newEmployees,
                              }));
                            }}
                            className="h-9"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">
                            Last Name
                          </Label>
                          <Input
                            placeholder="Last name"
                            value={employee.lastName}
                            onChange={(e) => {
                              const newEmployees = [...formData.employees];
                              newEmployees[index].lastName = e.target.value;
                              setFormData((prev) => ({
                                ...prev,
                                employees: newEmployees,
                              }));
                            }}
                            className="h-9"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">
                            Email
                          </Label>
                          <Input
                            type="email"
                            placeholder="Email address"
                            value={employee.email}
                            onChange={(e) => {
                              const newEmployees = [...formData.employees];
                              newEmployees[index].email = e.target.value;
                              setFormData((prev) => ({
                                ...prev,
                                employees: newEmployees,
                              }));
                            }}
                            className="h-9"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">
                            Phone Number
                          </Label>
                          <Input
                            placeholder="Phone number"
                            value={employee.phoneNumber}
                            onChange={(e) => {
                              const newEmployees = [...formData.employees];
                              newEmployees[index].phoneNumber = e.target.value;
                              setFormData((prev) => ({
                                ...prev,
                                employees: newEmployees,
                              }));
                            }}
                            className="h-9"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">
                            Position
                          </Label>
                          <Input
                            placeholder="Job position"
                            value={employee.position}
                            onChange={(e) => {
                              const newEmployees = [...formData.employees];
                              newEmployees[index].position = e.target.value;
                              setFormData((prev) => ({
                                ...prev,
                                employees: newEmployees,
                              }));
                            }}
                            className="h-9"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">
                            Department
                          </Label>
                          <Input
                            placeholder="Department"
                            value={employee.department}
                            onChange={(e) => {
                              const newEmployees = [...formData.employees];
                              newEmployees[index].department = e.target.value;
                              setFormData((prev) => ({
                                ...prev,
                                employees: newEmployees,
                              }));
                            }}
                            className="h-9"
                          />
                        </div>
                      </div>

                      <div className="space-y-2 mt-4">
                        <Label className="text-sm font-medium">
                          Supervisor
                        </Label>
                        <Input
                          placeholder="Supervisor name"
                          value={employee.supervisor}
                          onChange={(e) => {
                            const newEmployees = [...formData.employees];
                            newEmployees[index].supervisor = e.target.value;
                            setFormData((prev) => ({
                              ...prev,
                              employees: newEmployees,
                            }));
                          }}
                          className="h-9"
                        />
                      </div>
                    </div>
                  ))}

                  {/* Add Employee Button at Bottom */}
                  <div className="flex justify-center pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setFormData((prev) => ({
                          ...prev,
                          employees: [
                            ...prev.employees,
                            {
                              id: Date.now().toString(),
                              firstName: "",
                              lastName: "",
                              email: "",
                              phoneNumber: "",
                              position: "",
                              department: "",
                              supervisor: "",
                            },
                          ],
                        }));
                      }}
                      className="border-dashed border-gray-300 hover:border-gray-400 hover:bg-gray-50"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Employee
                    </Button>
                  </div>
                </div>
              )}
          </CardContent>
        </Card>

              {/* Supporting Documents Card */}
              <Card className="shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center">
                    <Upload className="h-5 w-5 mr-2 text-blue-500" />
                    Supporting Documents
                  </CardTitle>
                </CardHeader>
                <CardContent>
                <FileUpload 
                  files={uploadedFiles} 
                  onFilesChange={setUploadedFiles}
                  onFileRemove={(fileId) => {
                    setUploadedFiles(uploadedFiles.filter((f) => f.id !== fileId));
                  }}
                  onFileNameChange={(fileId, newName) => {
                    setUploadedFiles(
                      uploadedFiles.map((f) =>
                        f.id === fileId ? { ...f, name: newName } : f
                      )
                    );
                  }}
                />
                {existingFiles.length > 0 && (
                  <div className="space-y-3 mt-4">
                    <FileDisplay
                      files={existingFiles}
                      onFileNameChange={handleExistingFileNameChange}
                      onFileDelete={handleExistingFileDelete}
                    />
                  </div>
                )}
                </CardContent>
              </Card>
        </div>

      {/* Right Column - Content */}
      <div className="space-y-6">
        {/* Issue Card */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center">
              <FileText className="h-5 w-5 mr-2 text-blue-500" />
              Issue
              <span className="text-red-500 ml-1">*</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              id="issue"
              value={formData.issue}
              onChange={handleChange}
              disabled={isDisabled}
              className="min-h-[220px] resize-none bg-gray-50 p-4 rounded-lg"
              placeholder="Describe the issue..."
              required
            />
          </CardContent>
        </Card>

        {/* Articles Violated */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center">
              <Tag className="h-5 w-5 mr-2 text-blue-500" />
              Articles Violated
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              id="articlesViolated"
              value={formData.articlesViolated.join(", ")}
              onChange={(e) => {
                const articles = e.target.value.split(",").map(article => article.trim()).filter(article => article.length > 0);
                setFormData(prev => ({ ...prev, articlesViolated: articles }));
              }}
              className="min-h-[120px] resize-none bg-gray-50 p-4 rounded-lg"
              placeholder="List articles violated (separated by commas)..."
            />
          </CardContent>
        </Card>

        {/* Settlement Desired */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center">
              <CheckCircle className="h-5 w-5 mr-2 text-blue-500" />
              Settlement Desired
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
                              id="settlementDesired"
                value={formData.settlementDesired}
                onChange={handleChange}
              className="min-h-[120px] resize-none bg-gray-50 p-4 rounded-lg"
              placeholder="Describe desired settlement..."
            />
          </CardContent>
        </Card>

        {/* Resolution - Only show if resolution exists or complaint was previously closed */}
        {(formData.resolution || complaintData?.status === "CLOSED") && (
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center">
                <Check className="h-5 w-5 mr-2 text-blue-500" />
                Resolution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                id="resolution"
                value={formData.resolution}
                onChange={handleChange}
                className="min-h-[120px] resize-none bg-gray-50 p-4 rounded-lg"
                placeholder="Resolution details..."
              />
            </CardContent>
          </Card>
        )}

        {/* Notes Section */}
        <ComplaintNotes 
          complaintId={complaintId} 
          isDeleted={complaintData?.status === "DELETED"} 
          status={complaintData?.status || "OPEN"} 
        />
        </div>
        {/* End Main Grid Container */}
        </div>
      </form>

      {/* Bottom Action Buttons */}
      <div className="mt-8 flex items-center justify-end gap-3 border-t border-gray-200 bg-gray-50 px-6 py-4 rounded-b-lg">
        <Button
          variant="outline"
          onClick={() => router.push(`/product/complaints/${complaintId}/view`)}
          disabled={isUpdating}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          form="edit-complaint-form"
          disabled={isUpdating || isDisabled}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          {isUpdating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Updating...
            </>
          ) : (
            "Update Complaint"
          )}
        </Button>
      </div>

        {/* File Delete Confirmation Dialog */}
        <Dialog open={showFileDeleteDialog} onOpenChange={setShowFileDeleteDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete File</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this file? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={cancelFileDelete}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={confirmFileDelete}>
                Delete File
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }
