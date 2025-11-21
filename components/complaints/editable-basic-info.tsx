"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Pencil, Check, X, Loader2 } from "lucide-react";
import { updateComplaint } from "@/app/actions/complaints";
import { fetchBargainingUnits } from "@/app/actions/bargaining-unit";
import { fetchAgreementsByBargainingUnit } from "@/app/actions/agreements";
import { GRIEVANCE_CATEGORIES } from "@/app/lib/definitions";

interface EditableBasicInfoProps {
  complaintId: string;
  complaintData: {
    type: string;
    category: string;
    bargainingUnitId: string;
    agreementId: string;
    status: string;
  };
  bargainingUnit?: { name: string };
  agreement?: { name: string };
  onBasicInfoUpdate?: (updatedData: any) => void;
}

export default function EditableBasicInfo({
  complaintId,
  complaintData,
  bargainingUnit,
  agreement,
  onBasicInfoUpdate,
}: EditableBasicInfoProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [bargainingUnits, setBargainingUnits] = useState<any[]>([]);
  const [agreements, setAgreements] = useState<Array<{ id: string; name: string }>>([]);
  const [isLoadingUnits, setIsLoadingUnits] = useState(true);
  const [isLoadingAgreements, setIsLoadingAgreements] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  // Helper function to get status badge styling
  const getStatusBadgeClass = (status: string) => {
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

  // Local state to track current displayed values
  const [currentData, setCurrentData] = useState(complaintData);
  const [currentBargainingUnit, setCurrentBargainingUnit] = useState(bargainingUnit);
  const [currentAgreement, setCurrentAgreement] = useState(agreement);

  const [formData, setFormData] = useState({
    type: currentData.type,
    category: currentData.category,
    bargainingUnitId: currentData.bargainingUnitId,
    agreementId: currentData.agreementId,
  });

  // Update current data when props change
  useEffect(() => {
    setCurrentData(complaintData);
    setCurrentBargainingUnit(bargainingUnit);
    setCurrentAgreement(agreement);
  }, [complaintData, bargainingUnit, agreement]);

  // Fetch bargaining units on mount
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

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const formDataToSubmit = new FormData();
      formDataToSubmit.append("type", formData.type);
      formDataToSubmit.append("category", formData.category);
      formDataToSubmit.append("bargainingUnitId", formData.bargainingUnitId);
      formDataToSubmit.append("agreementId", formData.agreementId);

      await updateComplaint(complaintId, formDataToSubmit);

      // Update local state immediately to reflect the saved values
      setCurrentData({
        type: formData.type,
        category: formData.category,
        bargainingUnitId: formData.bargainingUnitId,
        agreementId: formData.agreementId,
        status: currentData.status,
      });

      // Update bargaining unit and agreement names
      const selectedUnit = bargainingUnits.find(u => u.id === formData.bargainingUnitId);
      const selectedAgreement = agreements.find(a => a.id === formData.agreementId);
      setCurrentBargainingUnit(selectedUnit);
      setCurrentAgreement(selectedAgreement);

      // Call parent callback to update state immediately
      if (onBasicInfoUpdate) {
        onBasicInfoUpdate({
          type: formData.type,
          category: formData.category,
          bargainingUnitId: formData.bargainingUnitId,
          agreementId: formData.agreementId,
          bargainingUnit: selectedUnit,
          agreement: selectedAgreement,
        });
      }

      toast({
        title: "Basic Information Updated",
        description: "The basic information has been successfully updated.",
      });

      setIsEditing(false);
      router.refresh();
    } catch (error) {
      console.error("Error updating basic info:", error);
      toast({
        title: "Error",
        description: "Failed to update basic information. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      type: currentData.type,
      category: currentData.category,
      bargainingUnitId: currentData.bargainingUnitId,
      agreementId: currentData.agreementId,
    });
    setIsEditing(false);
  };

  // Auto-cancel editing if status becomes non-editable
  useEffect(() => {
    if (currentData.status === "GRIEVED" || currentData.status === "CLOSED" || currentData.status === "DELETED") {
      setIsEditing(false);
      setFormData({
        type: currentData.type,
        category: currentData.category,
        bargainingUnitId: currentData.bargainingUnitId,
        agreementId: currentData.agreementId,
      });
    }
  }, [currentData.status, currentData.type, currentData.category, currentData.bargainingUnitId, currentData.agreementId]);

  // Update formData when currentData changes (but not when editing)
  useEffect(() => {
    if (!isEditing) {
      setFormData({
        type: currentData.type,
        category: currentData.category,
        bargainingUnitId: currentData.bargainingUnitId,
        agreementId: currentData.agreementId,
      });
    }
  }, [currentData, isEditing]);

  const handleSelectChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center justify-between">
          <div className="flex items-center">
            <FileText className="h-4 w-4 mr-1 text-blue-500" />
            Basic Information
          </div>
         
          <div className="flex items-center gap-1">
            {/* <Badge className={`${getStatusBadgeClass(currentData.status || "OPEN")} text-xs px-2 py-0.5`}>
              {currentData.status || "OPEN"}
            </Badge> */}
            {!isEditing && currentData.status !== "GRIEVED" && currentData.status !== "CLOSED" && currentData.status !== "DELETED" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(true)}
                className="h-6 w-6 p-0"
              >
                <Pencil className="h-3 w-3" />
              </Button>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {isEditing ? (
          <>
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

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancel}
                disabled={isLoading}
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={isLoading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Save
                  </>
                )}
              </Button>
            </div>
          </>
        ) : (
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-500">Type:</span>
              <span className="font-medium">{currentData.type}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Category:</span>
              <span className="font-medium">{currentData.category || "N/A"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Bargaining Unit:</span>
              <span className="font-medium">{currentBargainingUnit?.name || "N/A"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Collective Agreement:</span>
              <span className="font-medium">{currentAgreement?.name || "N/A"}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
