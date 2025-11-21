"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type React from "react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tag,
  Briefcase,
  User,
  FileText,
  CheckCircle,
  Plus,
  Trash2,
  Upload,
  ExternalLink,
  Loader2,
  Eye,
  ChevronDown,
  ChevronUp,
  RefreshCw,
} from "lucide-react";
import { createGrievance, parseGrievanceForm } from "@/app/actions/grievances";
import {
  fetchAllAgreements,
  fetchAgreementsByBargainingUnit,
} from "@/app/actions/agreements";
import { fetchBargainingUnits } from "@/app/actions/bargaining-unit";
import { parsePdfFile } from "@/app/actions/pdf-parser";
import FileUpload, {
  type ComplaintFile,
} from "@/components/complaints/file-upload";
import { useSession } from "@/lib/auth/use-auth-session";
import { GRIEVANCE_CATEGORIES } from "@/app/lib/definitions";
import PDFViewer from "@/app/ui/components/pdf-viewer";
import type { GrievanceType } from "@prisma/client";
import { DictationButton } from "@/app/lib/components/dictation-button";

interface Grievor {
  memberNumber: string;
  lastName: string;
  firstName: string;
  address: string;
  city: string;
  postalCode: string;
  email: string;
  phoneNumber: string;
}

interface WorkInformation {
  employer: string;
  supervisor: string;
  jobTitle: string;
  workLocation: string;
  employmentStatus: string;
}

export default function NewGrievanceForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { data: session } = useSession();
  const [formData, setFormData] = useState({
    type: "INDIVIDUAL" as GrievanceType,
    category: "",
    bargainingUnitId: "",
    statement: "",
    settlementDesired: "",
    articlesViolated: "",
    agreementId: "",
    status: "OPEN",
    currentStage: "INFORMAL" as "INFORMAL" | "FORMAL",
    filingDate: new Date().toISOString().split("T")[0],
    externalGrievanceId: "",
    // Primary grievor information
    grievors: [
      {
        memberNumber: "",
        lastName: "",
        firstName: "",
        address: "",
        city: "",
        postalCode: "",
        email: "",
        phoneNumber: "",
      },
    ] as Grievor[],
    // Work information
    workInformation: {
      employer: "",
      supervisor: "",
      jobTitle: "",
      workLocation: "",
      employmentStatus: "",
    } as WorkInformation,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [agreements, setAgreements] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [isLoadingAgreements, setIsLoadingAgreements] = useState(true);
  const [bargainingUnits, setBargainingUnits] = useState<
    Array<{ id: string; name: string; abbreviation?: string }>
  >([]);
  const [isLoadingUnits, setIsLoadingUnits] = useState(true);
  const [uploadedFiles, setUploadedFiles] = useState<ComplaintFile[]>([]);
  const [expandedGrievor, setExpandedGrievor] = useState<number | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [showPdfViewer, setShowPdfViewer] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  // Fetch available agreements and bargaining units
  useEffect(() => {
    const fetchAgreementsAndUnits = async () => {
      try {
        const [agreementsList, unitsList] = await Promise.all([
          fetchAllAgreements(),
          fetchBargainingUnits(),
        ]);
        setAgreements(agreementsList);
        setBargainingUnits(unitsList);

        // Auto-select if there's only one unit and one agreement
        if (unitsList.length === 1 && agreementsList.length === 1) {
          setFormData((prev) => ({
            ...prev,
            bargainingUnitId: unitsList[0].id,
            agreementId: agreementsList[0].id,
          }));
        } else if (unitsList.length > 0) {
          // If multiple units, just set the first unit as default
          setFormData((prev) => ({
            ...prev,
            bargainingUnitId: unitsList[0].id,
          }));
        }
      } catch (error) {
        console.error(
          "[NewGrievanceForm] Error fetching agreements or units:",
          error
        );
        toast({
          title: "Error",
          description:
            "Failed to load agreements or bargaining units. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoadingAgreements(false);
        setIsLoadingUnits(false);
      }
    };
    fetchAgreementsAndUnits();
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
        const agreementsList = await fetchAgreementsByBargainingUnit(
          formData.bargainingUnitId
        );
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
        console.error(
          "[NewGrievanceForm] Error fetching agreements for unit:",
          error
        );
        toast({
          title: "Error",
          description:
            "Failed to load agreements for this bargaining unit. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoadingAgreements(false);
      }
    };
    fetchAgreementsForUnit();
  }, [formData.bargainingUnitId, toast]);

  // Load pre-filled data from URL params
  useEffect(() => {
    const title = searchParams.get("title");
    const description = searchParams.get("description");
    const bargainingUnitId = searchParams.get("bargainingUnitId");
    const agreementId = searchParams.get("agreementId");
    const category = searchParams.get("category");
    const type = searchParams.get("type");

    if (
      title ||
      description ||
      bargainingUnitId ||
      agreementId ||
      category ||
      type
    ) {
      setFormData((prev) => ({
        ...prev,
        ...(title && { statement: title }),
        ...(description && { settlementDesired: description }),
        ...(bargainingUnitId && { bargainingUnitId }),
        ...(agreementId && { agreementId }),
        ...(category && { category }),
        ...(type && { type: type as GrievanceType }),
      }));
    }
  }, [searchParams]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
    if (errors[id]) {
      setErrors((prev) => {
        const updated = { ...prev };
        delete updated[id];
        return updated;
      });
    }
  };

  const handleSelectChange = (id: string, value: string) => {
    setFormData((prev) => ({ ...prev, [id]: value }));
    if (errors[id]) {
      setErrors((prev) => {
        const updated = { ...prev };
        delete updated[id];
        return updated;
      });
    }
  };

  const handleGrievorChange = (
    index: number,
    field: keyof Grievor,
    value: string
  ) => {
    const updatedGrievors = [...formData.grievors];
    updatedGrievors[index] = {
      ...updatedGrievors[index],
      [field]: value,
    };
    setFormData((prev) => ({ ...prev, grievors: updatedGrievors }));
  };

  const handleWorkInfoChange = (
    field: keyof WorkInformation,
    value: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      workInformation: {
        ...prev.workInformation,
        [field]: value,
      },
    }));
  };

  const addGrievor = () => {
    setFormData((prev) => ({
      ...prev,
      grievors: [
        ...prev.grievors,
        {
          memberNumber: "",
          lastName: "",
          firstName: "",
          address: "",
          city: "",
          postalCode: "",
          email: "",
          phoneNumber: "",
        },
      ],
    }));
  };

  const removeGrievor = (index: number) => {
    if (formData.grievors.length <= 1) return;
    setFormData((prev) => ({
      ...prev,
      grievors: prev.grievors.filter((_, i) => i !== index),
    }));
    if (expandedGrievor === index) {
      setExpandedGrievor(null);
    } else if (expandedGrievor !== null && expandedGrievor > index) {
      setExpandedGrievor(expandedGrievor - 1);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFile(file);
    setUploadStatus("Processing file...");
    setIsParsing(true);

    try {
      let fileContent = "";

      if (file.type === "application/pdf") {
        setUploadStatus("Parsing PDF file...");
        // Convert File to ArrayBuffer for the server action
        const pdfData = await file.arrayBuffer();
        // Use the server action to parse PDF
        fileContent = await parsePdfFile(pdfData);
      } else {
        setUploadStatus("Reading file content...");
        fileContent = await file.text();
      }

      setUploadStatus("Extracting form data...");
      // Parse the extracted text content to get form fields
      const parsedData = await parseGrievanceForm(fileContent);

      if (parsedData) {
        // Update form with parsed data
        setFormData((prev) => ({
          ...prev,
          grievors: parsedData.grievor
            ? [
                {
                  ...prev.grievors[0],
                  ...parsedData.grievor,
                },
              ]
            : prev.grievors,
          workInformation: parsedData.workInformation
            ? {
                ...prev.workInformation,
                ...parsedData.workInformation,
              }
            : prev.workInformation,
          statement: parsedData.statement || prev.statement,
          settlementDesired:
            parsedData.settlementDesired || prev.settlementDesired,
          articlesViolated:
            parsedData.articlesViolated || prev.articlesViolated,
          category: parsedData.category || prev.category,
        }));

        // Expand first grievor to show filled data
        setExpandedGrievor(0);

        setUploadStatus("✓ Form data extracted successfully");
        toast({
          title: "PDF Parsed",
          description: "Form data has been extracted from the PDF.",
        });
      } else {
        setUploadStatus("PDF uploaded but couldn't extract data");
      }

      // Add to uploaded files for attachment (both PDFs and other files)
      const newFile: ComplaintFile = {
        id: Date.now().toString(),
        file: file,
        name: file.name,
        uploadedAt: new Date(),
        uploadedBy: session?.user?.name || "User",
      };
      setUploadedFiles([newFile]);
    } catch (error) {
      console.error("Error processing file:", error);
      setUploadStatus("Failed to process file");
      toast({
        title: "Error",
        description: "Failed to process the uploaded file.",
        variant: "destructive",
      });
    } finally {
      setIsParsing(false);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    const missingFields: string[] = [];

    // Basic grievance fields
    if (!formData.type) {
      newErrors.type = "Grievance type is required";
      missingFields.push("Grievance Type");
    }
    if (!formData.category.trim()) {
      newErrors.category = "Category is required";
      missingFields.push("Category");
    }
    if (!formData.statement.trim()) {
      newErrors.statement = "Statement of grievance is required";
      missingFields.push("Statement");
    }
    if (!formData.bargainingUnitId) {
      newErrors.bargainingUnitId = "Bargaining unit is required";
      missingFields.push("Bargaining Unit");
    }
    if (!formData.currentStage) {
      newErrors.currentStage = "Stage is required";
      missingFields.push("Stage");
    }

    // Grievor fields - at least one grievor with basic info
    const firstGrievor = formData.grievors[0];
    if (!firstGrievor.firstName.trim()) {
      newErrors.grievorFirstName = "First name is required";
      missingFields.push("Grievor First Name");
    }
    if (!firstGrievor.lastName.trim()) {
      newErrors.grievorLastName = "Last name is required";
      missingFields.push("Grievor Last Name");
    }

    setErrors(newErrors);

    return {
      isValid: Object.keys(newErrors).length === 0,
      missingFields,
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validation = validateForm();
    if (!validation.isValid) {
      const missingFieldsList = validation.missingFields.join(", ");
      toast({
        title: "Missing Required Fields",
        description: `Please complete the following fields: ${missingFieldsList}`,
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Prepare form data for submission WITHOUT files (they'll be uploaded after)
      const submitData = {
        ...formData,
        uploadedFiles: [], // Don't send files with initial creation
      };

      const result = await createGrievance(submitData);

      if (result.success && result.grievanceId) {
        // Upload files after grievance is created
        if (uploadedFiles.length > 0) {
          try {
            const { storageClient } = await import('@/app/client/services/storage-client');

            // Convert to File array for bulk upload
            const files = uploadedFiles.map(f => f.file);

            // Use the same bulk evidence creation that the evidence page uses
            await storageClient.createBulkEvidence(result.grievanceId, files);
          } catch (error) {
            console.error('Failed to upload files:', error);
            toast({
              title: "Files not uploaded",
              description: "The grievance was created but some files failed to upload. You can add them later as evidence.",
              variant: "destructive",
            });
          }
        }

        toast({
          title: "Grievance Created",
          description: "Your grievance has been filed successfully.",
        });

        router.push(`/product/grievances/${result.grievanceId}`);
      } else {
        throw new Error(result.error || "Failed to create grievance");
      }
    } catch (error) {
      console.error("Error submitting grievance:", error);
      toast({
        title: "Error",
        description: "Failed to create grievance. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push("/product/grievances");
  };

  return (
    <div className="relative">
      {/* Loading Overlay */}
      {isSubmitting && (
        <div className="absolute inset-0 bg-white/90 backdrop-blur-sm z-50 flex items-center justify-center rounded-lg">
          <div className="flex flex-col items-center gap-4 p-6 bg-white rounded-lg shadow-lg border">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900">
                Processing Grievance...
              </h3>
              <p className="text-sm text-gray-600">
                Please wait while we process your grievance
              </p>
            </div>
          </div>
        </div>
      )}

      <Card className="shadow-lg border-0 border-t-4 border-t-primary overflow-hidden">
        <CardHeader className="pb-4 bg-gray-50 border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-3xl font-bold text-gray-900 flex items-center">
                <FileText className="h-5 w-5 mr-2 text-primary" />
                New Grievance
              </CardTitle>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={
                  isSubmitting ||
                  agreements.length === 0 ||
                  bargainingUnits.length === 0
                }
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                {isSubmitting ? "Saving..." : "Save Grievance"}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-8">
          {/* PDF Upload Section */}
          <div className="mb-8 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
            <h4 className="text-base font-medium text-blue-800 mb-4">
              Quick Start: Upload a filled PDF to auto-populate fields
            </h4>

            <div className="flex items-center gap-4">
              <label
                htmlFor="grievance-pdf"
                className={`inline-flex items-center px-4 py-2.5 border-2 border-blue-300 rounded-lg text-sm font-semibold text-blue-700 bg-white hover:bg-blue-50 hover:border-blue-400 cursor-pointer transition-all duration-200 shadow-sm ${
                  isParsing
                    ? "opacity-50 cursor-not-allowed"
                    : "hover:shadow-md"
                }`}
              >
                <Upload className="h-5 w-5 mr-2" />
                Upload PDF
                <input
                  id="grievance-pdf"
                  type="file"
                  className="sr-only"
                  accept=".pdf"
                  onChange={handleFileUpload}
                  disabled={isParsing}
                />
              </label>

              {uploadedFile && uploadedFile.type === "application/pdf" && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (!pdfUrl) {
                      const url = URL.createObjectURL(uploadedFile);
                      setPdfUrl(url);
                    }
                    setShowPdfViewer(!showPdfViewer);
                  }}
                  className="border-blue-300 text-blue-700 hover:bg-blue-50"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  {showPdfViewer ? "Hide PDF" : "View PDF"}
                </Button>
              )}
            </div>

            {uploadStatus && (
              <div className="mt-3 flex items-center gap-2">
                {isParsing && (
                  <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />
                )}
                <p
                  className={`text-sm ${
                    isParsing
                      ? "text-blue-500"
                      : uploadStatus.includes("Failed")
                        ? "text-red-500"
                        : "text-green-600"
                  }`}
                >
                  {uploadStatus}
                </p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Basic Info */}
            <div className="lg:col-span-1 space-y-6">
              {/* Basic Information Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <FileText className="h-5 w-5 mr-2 text-blue-500" />
                  Basic Information
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Type <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={formData.type}
                      onValueChange={(value) =>
                        handleSelectChange("type", value)
                      }
                    >
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
                    <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Stage <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={formData.currentStage}
                      onValueChange={(value) =>
                        handleSelectChange("currentStage", value)
                      }
                    >
                      <SelectTrigger
                        className={`w-full h-8 ${errors.currentStage ? "border-red-500" : ""}`}
                      >
                        <SelectValue placeholder="Select Stage" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectItem value="INFORMAL">Informal</SelectItem>
                          <SelectItem value="FORMAL">Formal</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    {errors.currentStage && (
                      <p className="text-red-500 text-xs mt-1">
                        {errors.currentStage}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Category <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) =>
                      handleSelectChange("category", value)
                    }
                  >
                    <SelectTrigger
                      className={`w-full h-8 ${errors.category ? "border-red-500" : ""}`}
                    >
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
                  {errors.category && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.category}
                    </p>
                  )}
                </div>

                <div>
                  <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Bargaining Unit <span className="text-red-500">*</span>
                  </Label>
                  {isLoadingUnits ? (
                    <div className="h-8 bg-gray-100 rounded-md animate-pulse"></div>
                  ) : bargainingUnits.length === 0 ? (
                    <div className="h-8 bg-gray-50 rounded-md flex items-center px-3 text-sm text-gray-500">
                      No bargaining units available
                    </div>
                  ) : (
                    <Select
                      value={formData.bargainingUnitId}
                      onValueChange={(value) =>
                        handleSelectChange("bargainingUnitId", value)
                      }
                    >
                      <SelectTrigger
                        className={`w-full h-8 ${errors.bargainingUnitId ? "border-red-500" : ""}`}
                      >
                        <SelectValue placeholder="Select Bargaining Unit" />
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
                  {errors.bargainingUnitId && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.bargainingUnitId}
                    </p>
                  )}
                </div>

                <div>
                  <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Collective Agreement
                  </Label>
                  {isLoadingAgreements ? (
                    <div className="h-8 bg-gray-100 rounded-md animate-pulse"></div>
                  ) : agreements.length === 0 ? (
                    <div className="h-8 bg-gray-50 rounded-md flex items-center px-3 text-sm text-gray-500">
                      No agreements available
                    </div>
                  ) : (
                    <Select
                      value={formData.agreementId}
                      onValueChange={(value) =>
                        handleSelectChange("agreementId", value)
                      }
                    >
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

                <div>
                  <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Filing Date
                  </Label>
                  <Input
                    type="date"
                    value={formData.filingDate}
                    onChange={(e) =>
                      handleSelectChange("filingDate", e.target.value)
                    }
                    className="h-8"
                  />
                </div>

                <div>
                  <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Grievance ID
                  </Label>
                  <Input
                    type="text"
                    value={formData.externalGrievanceId}
                    onChange={(e) =>
                      handleSelectChange("externalGrievanceId", e.target.value)
                    }
                    placeholder="Grievance ID"
                    className="h-8"
                  />
                </div>
              </div>

              {/* Work Information Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <Briefcase className="h-5 w-5 mr-2 text-blue-500" />
                  Work Information
                </h3>

                <div className="space-y-3">
                  <div>
                    <Label className="text-sm font-medium">Employer</Label>
                    <Input
                      value={formData.workInformation.employer}
                      onChange={(e) =>
                        handleWorkInfoChange("employer", e.target.value)
                      }
                      placeholder="Employer name"
                      className="h-9"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Supervisor</Label>
                    <Input
                      value={formData.workInformation.supervisor}
                      onChange={(e) =>
                        handleWorkInfoChange("supervisor", e.target.value)
                      }
                      placeholder="Supervisor name"
                      className="h-9"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Job Title</Label>
                    <Input
                      value={formData.workInformation.jobTitle}
                      onChange={(e) =>
                        handleWorkInfoChange("jobTitle", e.target.value)
                      }
                      placeholder="Job title"
                      className="h-9"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Work Location</Label>
                    <Input
                      value={formData.workInformation.workLocation}
                      onChange={(e) =>
                        handleWorkInfoChange("workLocation", e.target.value)
                      }
                      placeholder="Work location"
                      className="h-9"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">
                      Employment Status
                    </Label>
                    <Input
                      value={formData.workInformation.employmentStatus}
                      onChange={(e) =>
                        handleWorkInfoChange("employmentStatus", e.target.value)
                      }
                      placeholder="Full-time, Part-time, etc."
                      className="h-9"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Content & Grievors */}
            <div className="lg:col-span-2 space-y-6">
              {/* Grievor Information Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <User className="h-5 w-5 mr-2 text-blue-500" />
                  Grievor Information
                </h3>

                {formData.grievors.map((grievor, index) => (
                  <div
                    key={index}
                    className="p-4 border border-gray-200 rounded-lg bg-white shadow-sm"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-medium text-gray-900">
                        {formData.type === "GROUP"
                          ? `Grievor ${index + 1}`
                          : "Primary Grievor"}
                      </h4>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setExpandedGrievor(
                              expandedGrievor === index ? null : index
                            )
                          }
                        >
                          {expandedGrievor === index ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                        {formData.type === "GROUP" &&
                          formData.grievors.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeGrievor(index)}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                      </div>
                    </div>

                    {/* Always show primary fields */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">
                          First Name <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          value={grievor.firstName}
                          onChange={(e) =>
                            handleGrievorChange(
                              index,
                              "firstName",
                              e.target.value
                            )
                          }
                          placeholder="First name"
                          className={
                            errors.grievorFirstName && index === 0
                              ? "border-red-500"
                              : ""
                          }
                        />
                        {errors.grievorFirstName && index === 0 && (
                          <p className="text-red-500 text-xs mt-1">
                            {errors.grievorFirstName}
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">
                          Last Name <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          value={grievor.lastName}
                          onChange={(e) =>
                            handleGrievorChange(
                              index,
                              "lastName",
                              e.target.value
                            )
                          }
                          placeholder="Last name"
                          className={
                            errors.grievorLastName && index === 0
                              ? "border-red-500"
                              : ""
                          }
                        />
                        {errors.grievorLastName && index === 0 && (
                          <p className="text-red-500 text-xs mt-1">
                            {errors.grievorLastName}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Collapsible additional fields */}
                    {expandedGrievor === index && (
                      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">
                            Member Number
                          </Label>
                          <Input
                            value={grievor.memberNumber}
                            onChange={(e) =>
                              handleGrievorChange(
                                index,
                                "memberNumber",
                                e.target.value
                              )
                            }
                            placeholder="Member number"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Email</Label>
                          <Input
                            type="email"
                            value={grievor.email}
                            onChange={(e) =>
                              handleGrievorChange(
                                index,
                                "email",
                                e.target.value
                              )
                            }
                            placeholder="Email address"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">
                            Phone Number
                          </Label>
                          <Input
                            value={grievor.phoneNumber}
                            onChange={(e) =>
                              handleGrievorChange(
                                index,
                                "phoneNumber",
                                e.target.value
                              )
                            }
                            placeholder="Phone number"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Address</Label>
                          <Input
                            value={grievor.address}
                            onChange={(e) =>
                              handleGrievorChange(
                                index,
                                "address",
                                e.target.value
                              )
                            }
                            placeholder="Street address"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">City</Label>
                          <Input
                            value={grievor.city}
                            onChange={(e) =>
                              handleGrievorChange(index, "city", e.target.value)
                            }
                            placeholder="City"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">
                            Postal Code
                          </Label>
                          <Input
                            value={grievor.postalCode}
                            onChange={(e) =>
                              handleGrievorChange(
                                index,
                                "postalCode",
                                e.target.value
                              )
                            }
                            placeholder="Postal code"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {/* Add Grievor Button for Group Grievances */}
                {formData.type === "GROUP" && (
                  <div className="flex justify-center pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addGrievor}
                      className="border-dashed border-gray-300 hover:border-gray-400 hover:bg-gray-50"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Grievor
                    </Button>
                  </div>
                )}
              </div>

              {/* Statement Section */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <FileText className="h-5 w-5 mr-2 text-blue-500" />
                  Statement of Grievance <span className="text-red-500">*</span>
                </h3>
                <div className="relative">
                  <Textarea
                    id="statement"
                    value={formData.statement}
                    onChange={handleChange}
                    className={`min-h-[180px] resize-none bg-gray-50 p-4 pr-12 rounded-lg ${errors.statement ? "border-red-500" : ""}`}
                    placeholder="Describe the grievance in detail..."
                  />
                  <div className="absolute right-2 top-2">
                    <DictationButton
                      onTranscript={(text) => {
                        setFormData(prev => ({
                          ...prev,
                          statement: prev.statement ? `${prev.statement} ${text}` : text
                        }));
                      }}
                    />
                  </div>
                </div>
                {errors.statement && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.statement}
                  </p>
                )}
              </div>

              {/* Articles Violated Section */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <Tag className="h-5 w-5 mr-2 text-blue-500" />
                  Articles Violated
                </h3>
                <div className="relative">
                  <Textarea
                    id="articlesViolated"
                    value={formData.articlesViolated}
                    onChange={handleChange}
                    className="min-h-[100px] resize-none bg-gray-50 p-4 pr-12 rounded-lg"
                    placeholder="List articles violated (if known)..."
                  />
                  <div className="absolute right-2 top-2">
                    <DictationButton
                      onTranscript={(text) => {
                        setFormData(prev => ({
                          ...prev,
                          articlesViolated: prev.articlesViolated ? `${prev.articlesViolated} ${text}` : text
                        }));
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Settlement Desired Section */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <CheckCircle className="h-5 w-5 mr-2 text-blue-500" />
                  Settlement Desired
                </h3>
                <div className="relative">
                  <Textarea
                    id="settlementDesired"
                    value={formData.settlementDesired}
                    onChange={handleChange}
                    className="min-h-[100px] resize-none bg-gray-50 p-4 pr-12 rounded-lg"
                    placeholder="Describe desired settlement..."
                  />
                  <div className="absolute right-2 top-2">
                    <DictationButton
                      onTranscript={(text) => {
                        setFormData(prev => ({
                          ...prev,
                          settlementDesired: prev.settlementDesired ? `${prev.settlementDesired} ${text}` : text
                        }));
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Supporting Documents Section */}
          <div className="mt-6 space-y-3">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Upload className="h-5 w-5 mr-2 text-blue-500" />
              Supporting Documents
            </h3>
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
              maxFileSize={5 * 1024 * 1024} // 5MB
              acceptedFileTypes={[
                ".pdf",
                ".doc",
                ".docx",
                ".txt",
                ".jpg",
                ".jpeg",
                ".png",
              ]}
            />
          </div>

          {/* PDF Viewer Section */}
          {showPdfViewer && pdfUrl && (
            <div id="pdf-viewer-section" className="mt-8 border-t pt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  PDF Preview
                </h3>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPdfViewer(false)}
                >
                  Hide Preview
                </Button>
              </div>
              <div className="border rounded-lg overflow-hidden">
                <PDFViewer pdfUrl={pdfUrl} />
              </div>
            </div>
          )}
        </CardContent>

        {/* Bottom Action Buttons */}
        <CardFooter className="flex items-center justify-end gap-3 border-t border-gray-200 bg-gray-50 px-6 py-4">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              isSubmitting ||
              agreements.length === 0 ||
              bargainingUnits.length === 0
            }
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            {isSubmitting ? "Saving..." : "Save Grievance"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
