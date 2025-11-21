"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import type React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tag, User, FileText, CheckCircle, Plus, Trash2, Upload, Loader2, ChevronDown } from "lucide-react"

import { createComplaint } from "@/app/actions/complaints"
import { fetchAllAgreements, fetchAgreementsByBargainingUnit } from "@/app/actions/agreements"
import { fetchBargainingUnitsWithAgreements } from "@/app/actions/bargaining-unit"
import EvidenceUpload, { type ComplaintFile, type TextEvidence } from "./evidence-upload"
import { uploadComplaintFilesComplete } from "@/app/client/services/storage-client"
import { useSession } from "@/lib/auth/use-auth-session"
// Define ComplaintType locally to avoid import issues
type ComplaintType = "INDIVIDUAL" | "GROUP" | "POLICY"
import { GRIEVANCE_CATEGORIES } from "@/app/lib/definitions"
import { useToast } from "@/hooks/use-toast"

export default function NewComplaintForm() {
  const router = useRouter()
  const { toast } = useToast() // Declare useToast
  const { data: session } = useSession()
  const [formData, setFormData] = useState({
    type: "INDIVIDUAL" as ComplaintType,
    category: "",
    bargainingUnitId: "",
    issue: "",
    settlementDesired: "",
    resolution: "",
    supportingDocuments: [] as string[],
    articlesViolated: "",
    agreementId: "",
    status: "OPEN",
    // Employee information
    complainantFirstName: "",
    complainantLastName: "",
    complainantEmail: "",
    complainantPhone: "",
    complainantPosition: "",
    complainantDepartment: "",
    complainantSupervisor: "",
    employees: [] as Array<{
      id: string
      firstName: string
      lastName: string
      email: string
      phoneNumber: string
      position: string
      department: string
      supervisor: string
    }>,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [agreements, setAgreements] = useState<Array<{ id: string; name: string }>>([])
  const [isLoadingAgreements, setIsLoadingAgreements] = useState(true)
  const [bargainingUnits, setBargainingUnits] = useState<Array<{ id: string; name: string; abbreviation?: string }>>([])
  const [isLoadingUnits, setIsLoadingUnits] = useState(true)
  const [uploadedFiles, setUploadedFiles] = useState<ComplaintFile[]>([])
  const [textEvidence, setTextEvidence] = useState<TextEvidence[]>([])
  const [mainEmployeeData, setMainEmployeeData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phoneNumber: "",
    position: "",
    department: "",
    supervisor: "",
  })

  // Fetch available agreements and bargaining units
  useEffect(() => {
    const fetchAgreementsAndUnits = async () => {
      try {
        const [agreementsList, unitsList] = await Promise.all([fetchAllAgreements(), fetchBargainingUnitsWithAgreements()])
        setAgreements(agreementsList)
        setBargainingUnits(unitsList)

        // Auto-select if there's only one unit and one agreement
        if (unitsList.length === 1 && agreementsList.length === 1) {
          setFormData((prev) => ({
            ...prev,
            bargainingUnitId: unitsList[0].id,
            agreementId: agreementsList[0].id,
          }))
        } else if (unitsList.length > 0) {
          // If multiple units, just set the first unit as default
          setFormData((prev) => ({
            ...prev,
            bargainingUnitId: unitsList[0].id,
          }))
        }
      } catch (error) {
        console.error("[NewComplaintForm] Error fetching agreements or units:", error)
        toast({
          title: "Error",
          description: "Failed to load agreements or bargaining units. Please try again.",
          variant: "destructive",
        })
      } finally {
        setIsLoadingAgreements(false)
        setIsLoadingUnits(false)
      }
    }
    fetchAgreementsAndUnits()
  }, [toast])

  // Fetch agreements when bargaining unit changes
  useEffect(() => {
    const fetchAgreementsForUnit = async () => {
      if (!formData.bargainingUnitId) {
        setAgreements([])
        setFormData((prev) => ({ ...prev, agreementId: "" }))
        return
      }
      try {
        setIsLoadingAgreements(true)
        const agreementsList = await fetchAgreementsByBargainingUnit(formData.bargainingUnitId)
        setAgreements(agreementsList)

        // Auto-select agreement if there's only one for this unit
        if (agreementsList.length === 1) {
          setFormData((prev) => ({
            ...prev,
            agreementId: agreementsList[0].id,
          }))
        } else if (agreementsList.length > 0) {
          // If multiple agreements, set the first as default
          setFormData((prev) => ({
            ...prev,
            agreementId: agreementsList[0].id,
          }))
        } else {
          // Clear agreement if none available for this unit
          setFormData((prev) => ({ ...prev, agreementId: "" }))
        }
      } catch (error) {
        console.error("[NewComplaintForm] Error fetching agreements for unit:", error)
        toast({
          title: "Error",
          description: "Failed to load agreements for this bargaining unit. Please try again.",
          variant: "destructive",
        })
      } finally {
        setIsLoadingAgreements(false)
      }
    }
    fetchAgreementsForUnit()
  }, [formData.bargainingUnitId, toast])

  // Load duplicated complaint data from sessionStorage if available
  useEffect(() => {
    const duplicatedData = sessionStorage.getItem("duplicatedComplaintData")
    if (duplicatedData) {
      try {
        const parsedData = JSON.parse(duplicatedData)
        setFormData((prev) => ({
          ...prev,
          ...parsedData,
          complaintNumber: "", // Always generate new complaint number
        }))
        // Clear the sessionStorage after loading
        sessionStorage.removeItem("duplicatedComplaintData")
        toast({
          title: "Complaint Data Loaded",
          description:
            "Complaint details have been copied from the selected complaint. Please review and submit to create a new complaint.",
        })
      } catch (error) {
        console.error("Error parsing duplicated complaint data:", error)
      }
    }
  }, [toast])

  // Note: Complaint number will be generated automatically by the server when creating the complaint

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target
    setFormData((prev) => ({ ...prev, [id]: value }))
    if (errors[id]) {
      setErrors((prev) => {
        const updated = { ...prev }
        delete updated[id]
        return updated
      })
    }
  }

  const handleSelectChange = (id: string, value: string) => {
    setFormData((prev) => ({ ...prev, [id]: value }))
    if (errors[id]) {
      setErrors((prev) => {
        const updated = { ...prev }
        delete updated[id]
        return updated
      })
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    const missingFields: string[] = []

    // Basic complaint fields
    if (!formData.type) {
      newErrors.type = "Complaint type is required"
      missingFields.push("Complaint Type")
    }
    if (!formData.category.trim()) {
      newErrors.category = "Category is required"
      missingFields.push("Category")
    }
    if (!formData.issue.trim()) {
      newErrors.issue = "Original issue is required"
      missingFields.push("Original Issue")
    }
    if (!formData.bargainingUnitId) {
      newErrors.bargainingUnitId = "Bargaining unit is required"
      missingFields.push("Bargaining Unit")
    }
    if (!formData.agreementId) {
      newErrors.agreementId = "Collective agreement is required"
      missingFields.push("Collective Agreement")
    }

    // Employee fields - only required for non-policy complaints
    if (formData.type !== "POLICY") {
      if (formData.type === "GROUP") {
        // For group complaints, validate main employee data
        if (!mainEmployeeData.firstName.trim()) {
          newErrors.complainantFirstName = "First name is required"
          missingFields.push("First Name")
        }
        if (!mainEmployeeData.lastName.trim()) {
          newErrors.complainantLastName = "Last name is required"
          missingFields.push("Last Name")
        }
      } else {
        // For individual complaints, validate complainant data
        if (!formData.complainantFirstName.trim()) {
          newErrors.complainantFirstName = "First name is required"
          missingFields.push("First Name")
        }
        if (!formData.complainantLastName.trim()) {
          newErrors.complainantLastName = "Last name is required"
          missingFields.push("Last Name")
        }
      }
    }

    setErrors(newErrors)

    // Return both validation result and missing fields for better error messaging
    return {
      isValid: Object.keys(newErrors).length === 0,
      missingFields,
    }
  }

  const handleSubmit = async () => {
    const validation = validateForm()
    if (!validation.isValid) {
      const missingFieldsList = validation.missingFields.join(", ")
      toast({
        title: "Missing Required Fields",
        description: `Please complete the following fields: ${missingFieldsList}`,
        variant: "destructive",
      })
      // Don't return - allow saving with errors
    }
    setIsSubmitting(true)
    try {
      const formDataToSubmit = new FormData()
      // Note: complaintNumber will be generated automatically by the sequence system
      formDataToSubmit.append("type", formData.type)
      formDataToSubmit.append("category", formData.category)
      formDataToSubmit.append("bargainingUnitId", formData.bargainingUnitId)
      formDataToSubmit.append("issue", formData.issue)
      formDataToSubmit.append("settlementDesired", formData.settlementDesired)
      formDataToSubmit.append("resolution", formData.resolution)
      formDataToSubmit.append("supportingDocuments", formData.supportingDocuments.join(","))
      formDataToSubmit.append("articlesViolated", formData.articlesViolated)

      // Employee information
      formDataToSubmit.append("complainantFirstName", formData.complainantFirstName)
      formDataToSubmit.append("complainantLastName", formData.complainantLastName)
      formDataToSubmit.append("complainantEmail", formData.complainantEmail)
      formDataToSubmit.append("complainantPhone", formData.complainantPhone)
      formDataToSubmit.append("complainantPosition", formData.complainantPosition)
      formDataToSubmit.append("complainantDepartment", formData.complainantDepartment)
      formDataToSubmit.append("complainantSupervisor", formData.complainantSupervisor)
      
      // For GROUP complaints, include the main employee in the employees array
      let employeesToSave = formData.employees
      if (formData.type === "GROUP") {
        const mainEmployee = {
          id: `main-employee-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          firstName: mainEmployeeData.firstName,
          lastName: mainEmployeeData.lastName,
          email: mainEmployeeData.email,
          phoneNumber: mainEmployeeData.phoneNumber,
          position: mainEmployeeData.position,
          department: mainEmployeeData.department,
          supervisor: mainEmployeeData.supervisor,
        }
        employeesToSave = [mainEmployee, ...formData.employees]
      }
      
      formDataToSubmit.append("employees", JSON.stringify(employeesToSave))

      if (formData.agreementId) {
        formDataToSubmit.append("agreementId", formData.agreementId)
      }

      const result = await createComplaint(formDataToSubmit)

      if (result) {
        // Handle file uploads
        if (uploadedFiles.length > 0 && result.id) {
          try {
            const currentUser = session?.user
            const fileUploads = uploadedFiles.map((file) => ({
              id: file.id,
              file: file.file,
              name: file.name,
              uploadedAt: file.uploadedAt,
              uploadedBy: currentUser?.name || file.uploadedBy,
            }))

            // Upload files and save metadata in one call
            await uploadComplaintFilesComplete(result.id, fileUploads)
          } catch (fileError) {
            console.error("Error uploading files:", fileError)
            toast({
              title: "Warning",
              description: "Complaint created but some files failed to upload.",
              variant: "destructive",
            })
          }
        }

        // Handle text evidence
        if (textEvidence.length > 0 && result.id) {
          try {
            const { createEvidence } = await import("@/app/actions/evidence")
            
            // Create text evidence for each item
            await Promise.all(
              textEvidence.map(async (textItem) => {
                const formData = new FormData()
                formData.append('type', 'Text')
                formData.append('name', textItem.name)
                formData.append('source', textItem.content)
                formData.append('date', textItem.uploadedAt.toISOString())
                formData.append('complaintId', result.id)
                
                return createEvidence(formData)
              })
            )
          } catch (textError) {
            console.error("Error creating text evidence:", textError)
            toast({
              title: "Warning",
              description: "Complaint created but some text evidence failed to save.",
              variant: "destructive",
            })
          }
        }

        toast({
          title: "Complaint created",
          description: "Your complaint has been saved successfully.",
          variant: "default",
        })

        // Redirect to the complaint view page
        router.push(`/product/complaints/${result.id}/view`)
      } else {
        throw new Error("Failed to create complaint")
      }
    } catch (error) {
      console.error("Error submitting complaint:", error)
      toast({
        title: "Error",
        description: "Failed to create complaint. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    router.push("/product/complaints")
  }

  return (
    <div className="max-w-7xl mx-auto relative">
      {/* Loading Overlay */}
      {isSubmitting && (
        <div className="absolute inset-0 bg-white/90 backdrop-blur-sm z-50 flex items-center justify-center rounded-lg">
          <div className="flex flex-col items-center gap-4 p-6 bg-white rounded-lg shadow-lg border">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900">Saving Complaint...</h3>
              <p className="text-sm text-gray-600">Please wait while we process your complaint</p>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center">
          <FileText className="h-8 w-8 mr-3 text-blue-600" />
          New Complaint
        </h1>
        <p className="text-gray-600 mt-2">
          Create a new complaint record
        </p>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        {/* Left Column - Basic Info, Employee Info, Supporting Documents */}
        <div className="xl:col-span-4 space-y-6">
          {/* Basic Information Section */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center">
                <FileText className="h-5 w-5 mr-2 text-blue-500" />
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Type <span className="text-red-500">*</span>
                    </Label>
                    <Select value={formData.type} onValueChange={(value) => handleSelectChange("type", value)}>
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
                      Category <span className="text-red-500">*</span>
                    </Label>
                    <Select value={formData.category} onValueChange={(value) => handleSelectChange("category", value)}>
                      <SelectTrigger className={`w-full h-8 ${errors.category ? "border-red-500" : ""}`}>
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
                    {errors.category && <p className="text-red-500 text-xs mt-1">{errors.category}</p>}
                  </div>
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
                      onValueChange={(value) => handleSelectChange("bargainingUnitId", value)}
                    >
                      <SelectTrigger className={`w-full h-8 ${errors.bargainingUnitId ? "border-red-500" : ""}`}>
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
                  {errors.bargainingUnitId && <p className="text-red-500 text-xs mt-1">{errors.bargainingUnitId}</p>}
                </div>

                <div>
                  <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Collective Agreement <span className="text-red-500">*</span>
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
                      onValueChange={(value) => handleSelectChange("agreementId", value)}
                    >
                      <SelectTrigger className={`w-full h-8 ${errors.agreementId ? "border-red-500" : ""}`}>
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
                  {errors.agreementId && <p className="text-red-500 text-xs mt-1">{errors.agreementId}</p>}
                </div>
            </CardContent>
          </Card>

          {/* Employee Information Section */}
          {formData.type !== "POLICY" && (
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center">
                  <User className="h-5 w-5 mr-2 text-blue-500" />
                  Employee Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                  {/* Primary Complainant */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">
                        First Name <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="complainantFirstName"
                        value={formData.complainantFirstName}
                        onChange={handleChange}
                        placeholder="First name"
                        className={errors.complainantFirstName ? "border-red-500" : ""}
                      />
                      {errors.complainantFirstName && (
                        <p className="text-red-500 text-xs mt-1">{errors.complainantFirstName}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">
                        Last Name <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="complainantLastName"
                        value={formData.complainantLastName}
                        onChange={handleChange}
                        placeholder="Last name"
                        className={errors.complainantLastName ? "border-red-500" : ""}
                      />
                      {errors.complainantLastName && (
                        <p className="text-red-500 text-xs mt-1">{errors.complainantLastName}</p>
                      )}
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

                  <details className="mt-4">
                    <summary className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3 cursor-pointer hover:text-gray-700 flex items-center gap-2">
                      <ChevronDown className="h-3 w-3 transition-transform group-open:rotate-180" />
                      More Details
                    </summary>
                    <div className="mt-3 space-y-4">
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
                    </div>
                  </details>

                  {/* Group Employees */}
                  {formData.type === "GROUP" && (
                    <div className="space-y-3">
                      {/* Main Employee (Employee 1) */}
                      <div className="border-t border-gray-100 pt-3 mt-3">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium text-gray-900">Employee 2</h4>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {/* First Row - First Name and Last Name */}
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">
                              First Name <span className="text-red-500">*</span>
                            </Label>
                            <Input
                              placeholder="First name"
                              value={mainEmployeeData.firstName}
                              onChange={(e) => setMainEmployeeData(prev => ({ ...prev, firstName: e.target.value }))}
                              className={errors.complainantFirstName ? "border-red-500" : ""}
                            />
                            {errors.complainantFirstName && (
                              <p className="text-red-500 text-xs mt-1">{errors.complainantFirstName}</p>
                            )}
                          </div>
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">
                              Last Name <span className="text-red-500">*</span>
                            </Label>
                            <Input
                              placeholder="Last name"
                              value={mainEmployeeData.lastName}
                              onChange={(e) => setMainEmployeeData(prev => ({ ...prev, lastName: e.target.value }))}
                              className={errors.complainantLastName ? "border-red-500" : ""}
                            />
                            {errors.complainantLastName && (
                              <p className="text-red-500 text-xs mt-1">{errors.complainantLastName}</p>
                            )}
                          </div>

                          {/* Second Row - Email and Phone */}
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">Email</Label>
                            <Input
                              type="email"
                              value={mainEmployeeData.email}
                              onChange={(e) => setMainEmployeeData(prev => ({ ...prev, email: e.target.value }))}
                              placeholder="Email address"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">Phone Number</Label>
                            <Input
                              value={mainEmployeeData.phoneNumber}
                              onChange={(e) => setMainEmployeeData(prev => ({ ...prev, phoneNumber: e.target.value }))}
                              placeholder="Phone number"
                            />
                          </div>
                        </div>

                        {/* More Details Section for Main Employee */}
                        <details className="mt-4">
                          <summary className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3 cursor-pointer hover:text-gray-700 flex items-center gap-2">
                            <ChevronDown className="h-3 w-3 transition-transform group-open:rotate-180" />
                            More Details
                          </summary>
                          <div className="mt-3 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label className="text-sm font-medium">Position</Label>
                                <Input
                                  placeholder="Job position"
                                  value={mainEmployeeData.position}
                                  onChange={(e) => setMainEmployeeData(prev => ({ ...prev, position: e.target.value }))}
                                />
                              </div>

                              <div className="space-y-2">
                                <Label className="text-sm font-medium">Department</Label>
                                <Input
                                  placeholder="Department"
                                  value={mainEmployeeData.department}
                                  onChange={(e) => setMainEmployeeData(prev => ({ ...prev, department: e.target.value }))}
                                />
                              </div>
                            </div>

                            <div className="space-y-2">
                              <Label className="text-sm font-medium">Supervisor</Label>
                              <Input
                                placeholder="Supervisor name"
                                value={mainEmployeeData.supervisor}
                                onChange={(e) => setMainEmployeeData(prev => ({ ...prev, supervisor: e.target.value }))}
                              />
                            </div>
                          </div>
                        </details>
                      </div>

                      {/* Additional Employees */}
                      {formData.employees.map((employee, index) => (
                        <div key={employee.id} className="border-t border-gray-100 pt-3 mt-3">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-medium text-gray-900">Employee {index + 3}</h4>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setFormData((prev) => ({
                                  ...prev,
                                  employees: prev.employees.filter((_, i) => i !== index),
                                }))
                              }}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* First Row - First Name and Last Name */}
                            <div className="space-y-2">
                              <Label className="text-sm font-medium">First Name</Label>
                              <Input
                                placeholder="First name"
                                value={employee.firstName}
                                onChange={(e) => {
                                  const newEmployees = [...formData.employees]
                                  newEmployees[index].firstName = e.target.value
                                  setFormData((prev) => ({
                                    ...prev,
                                    employees: newEmployees,
                                  }))
                                }}
                                className="h-9"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-sm font-medium">Last Name</Label>
                              <Input
                                placeholder="Last name"
                                value={employee.lastName}
                                onChange={(e) => {
                                  const newEmployees = [...formData.employees]
                                  newEmployees[index].lastName = e.target.value
                                  setFormData((prev) => ({
                                    ...prev,
                                    employees: newEmployees,
                                  }))
                                }}
                                className="h-9"
                              />
                            </div>

                            {/* Second Row - Email and Phone */}
                            <div className="space-y-2">
                              <Label className="text-sm font-medium">Email</Label>
                              <Input
                                type="email"
                                placeholder="Email address"
                                value={employee.email}
                                onChange={(e) => {
                                  const newEmployees = [...formData.employees]
                                  newEmployees[index].email = e.target.value
                                  setFormData((prev) => ({
                                    ...prev,
                                    employees: newEmployees,
                                  }))
                                }}
                                className="h-9"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-sm font-medium">Phone Number</Label>
                              <Input
                                placeholder="Phone number"
                                value={employee.phoneNumber}
                                onChange={(e) => {
                                  const newEmployees = [...formData.employees]
                                  newEmployees[index].phoneNumber = e.target.value
                                  setFormData((prev) => ({
                                    ...prev,
                                    employees: newEmployees,
                                  }))
                                }}
                                className="h-9"
                              />
                            </div>
                          </div>

                          {/* More Details Section */}
                          <details className="mt-4">
                            <summary className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3 cursor-pointer hover:text-gray-700 flex items-center gap-2">
                              <ChevronDown className="h-3 w-3 transition-transform group-open:rotate-180" />
                              More Details
                            </summary>
                            <div className="mt-3 space-y-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label className="text-sm font-medium">Position</Label>
                                  <Input
                                    placeholder="Job position"
                                    value={employee.position}
                                    onChange={(e) => {
                                      const newEmployees = [...formData.employees]
                                      newEmployees[index].position = e.target.value
                                      setFormData((prev) => ({
                                        ...prev,
                                        employees: newEmployees,
                                      }))
                                    }}
                                    className="h-9"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label className="text-sm font-medium">Department</Label>
                                  <Input
                                    placeholder="Department"
                                    value={employee.department}
                                    onChange={(e) => {
                                      const newEmployees = [...formData.employees]
                                      newEmployees[index].department = e.target.value
                                      setFormData((prev) => ({
                                        ...prev,
                                        employees: newEmployees,
                                      }))
                                    }}
                                    className="h-9"
                                  />
                                </div>
                              </div>

                              <div className="space-y-2">
                                <Label className="text-sm font-medium">Supervisor</Label>
                                <Input
                                  placeholder="Supervisor name"
                                  value={employee.supervisor}
                                  onChange={(e) => {
                                    const newEmployees = [...formData.employees]
                                    newEmployees[index].supervisor = e.target.value
                                    setFormData((prev) => ({
                                      ...prev,
                                      employees: newEmployees,
                                    }))
                                  }}
                                  className="h-9"
                                />
                              </div>
                            </div>
                          </details>
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
                            }))
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
          )}

          {/* Supporting Documents Section */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center">
                <Upload className="h-5 w-5 mr-2 text-blue-500" />
                Supporting Evidence
              </CardTitle>
            </CardHeader>
            <CardContent>
                <EvidenceUpload
                  files={uploadedFiles}
                  textEvidence={textEvidence}
                  onFilesChange={setUploadedFiles}
                  onTextEvidenceChange={setTextEvidence}
                  onFileRemove={(fileId) => {
                    setUploadedFiles(uploadedFiles.filter((f) => f.id !== fileId))
                  }}
                  onTextEvidenceRemove={(textId) => {
                    setTextEvidence(textEvidence.filter((t) => t.id !== textId))
                  }}
                  onFileNameChange={(fileId, newName) => {
                    setUploadedFiles(uploadedFiles.map((f) => (f.id === fileId ? { ...f, name: newName } : f)))
                  }}
                  onTextEvidenceNameChange={(textId, newName) => {
                    setTextEvidence(textEvidence.map((t) => (t.id === textId ? { ...t, name: newName } : t)))
                  }}
                  maxFileSize={5 * 1024 * 1024} // 5MB
                  acceptedFileTypes={[".pdf", ".doc", ".docx", ".txt", ".jpg", ".jpeg", ".png"]}
                />
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Issue, Articles Violated, Settlement Desired */}
        <div className="xl:col-span-8 space-y-6">
          {/* Issue Section */}
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
                className={`min-h-[220px] resize-none bg-gray-50 p-4 rounded-lg ${errors.issue ? "border-red-500" : ""}`}
                placeholder="Describe the issue..."
              />
              {errors.issue && <p className="text-red-500 text-xs mt-1">{errors.issue}</p>}
            </CardContent>
          </Card>

          {/* Articles Violated Section */}
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
                value={formData.articlesViolated || ""}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, articlesViolated: e.target.value }))
                }
                className="min-h-[120px] resize-none bg-gray-50 p-4 rounded-lg"
                placeholder="List articles violated.."
              />
            </CardContent>
          </Card>

          {/* Settlement Desired Section */}
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
        </div>
        {/* End Main Grid Container */}
      </div>

      {/* Bottom Action Buttons */}
      <div className="mt-8 flex items-center justify-end gap-3 px-6 py-4 rounded-b-lg">
        <Button variant="outline" onClick={handleCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting || agreements.length === 0 || bargainingUnits.length === 0}
          className="bg-green-600 hover:bg-green-700 text-white"
        >
          <CheckCircle className="h-4 w-4 mr-2" />
          {isSubmitting ? "Saving..." : "Save Complaint"}
        </Button>
      </div>
    </div>
  )
}
