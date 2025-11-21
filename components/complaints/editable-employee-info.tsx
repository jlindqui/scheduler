"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { User, Pencil, Check, X, Loader2, Plus, Trash2, Mail, Phone, Briefcase, Building, ChevronDown } from "lucide-react";
import { updateComplaint } from "@/app/actions/complaints";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatPhoneNumber, formatPhoneInput } from "@/lib/utils";

interface EditableEmployeeInfoProps {
  complaintId: string;
  complaintData: {
    type: string;
    complainantFirstName: string;
    complainantLastName: string;
    complainantEmail: string;
    complainantPhone: string;
    complainantPosition: string;
    complainantDepartment: string;
    complainantSupervisor: string;
    employees: Array<{
      id: string;
      firstName: string;
      lastName: string;
      email: string;
      phoneNumber: string;
      position: string;
      department: string;
      supervisor: string;
    }>;
    status: string;
  };
  onEmployeeUpdate?: (updatedData: any) => void; // Callback to update parent state
}

export default function EditableEmployeeInfo({
  complaintId,
  complaintData,
  onEmployeeUpdate,
}: EditableEmployeeInfoProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  // Local state to track current displayed values
  const [currentData, setCurrentData] = useState(complaintData);

  // Update currentData when props change
  useEffect(() => {
    setCurrentData(complaintData);
  }, [complaintData]);

  const [formData, setFormData] = useState({
    complainantFirstName: currentData.complainantFirstName,
    complainantLastName: currentData.complainantLastName,
    complainantEmail: currentData.complainantEmail,
    complainantPhone: currentData.complainantPhone,
    complainantPosition: currentData.complainantPosition,
    complainantDepartment: currentData.complainantDepartment,
    complainantSupervisor: currentData.complainantSupervisor,
    employees: currentData.employees || [],
  });

  // Update formData when currentData changes (but not when editing)
  useEffect(() => {
    if (!isEditing) {
      setFormData({
        complainantFirstName: currentData.complainantFirstName,
        complainantLastName: currentData.complainantLastName,
        complainantEmail: currentData.complainantEmail,
        complainantPhone: currentData.complainantPhone,
        complainantPosition: currentData.complainantPosition,
        complainantDepartment: currentData.complainantDepartment,
        complainantSupervisor: currentData.complainantSupervisor,
        employees: currentData.employees || [],
      });
    }
  }, [currentData, isEditing]);

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const formDataToSubmit = new FormData();
      formDataToSubmit.append("complainantFirstName", formData.complainantFirstName);
      formDataToSubmit.append("complainantLastName", formData.complainantLastName);
      formDataToSubmit.append("complainantEmail", formData.complainantEmail);
      formDataToSubmit.append("complainantPhone", formData.complainantPhone);
      formDataToSubmit.append("complainantPosition", formData.complainantPosition);
      formDataToSubmit.append("complainantDepartment", formData.complainantDepartment);
      formDataToSubmit.append("complainantSupervisor", formData.complainantSupervisor);
      formDataToSubmit.append("employees", JSON.stringify(formData.employees));

      await updateComplaint(complaintId, formDataToSubmit);

      // Update local state immediately to reflect the saved values
      setCurrentData({
        type: currentData.type,
        complainantFirstName: formData.complainantFirstName,
        complainantLastName: formData.complainantLastName,
        complainantEmail: formData.complainantEmail,
        complainantPhone: formData.complainantPhone,
        complainantPosition: formData.complainantPosition,
        complainantDepartment: formData.complainantDepartment,
        complainantSupervisor: formData.complainantSupervisor,
        employees: formData.employees,
        status: currentData.status,
      });

      toast({
        title: "Employee Information Updated",
        description: "The employee information has been successfully updated.",
      });

      setIsEditing(false);
      
      // Update parent state with new employee data
      if (onEmployeeUpdate) {
        onEmployeeUpdate({
          complainantFirstName: formData.complainantFirstName,
          complainantLastName: formData.complainantLastName,
          complainantEmail: formData.complainantEmail,
          complainantPhone: formData.complainantPhone,
          complainantPosition: formData.complainantPosition,
          complainantDepartment: formData.complainantDepartment,
          complainantSupervisor: formData.complainantSupervisor,
          employees: formData.employees,
        });
      }
      
      router.refresh();
    } catch (error) {
      console.error("Error updating employee info:", error);
      toast({
        title: "Error",
        description: "Failed to update employee information. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      complainantFirstName: currentData.complainantFirstName,
      complainantLastName: currentData.complainantLastName,
      complainantEmail: currentData.complainantEmail,
      complainantPhone: currentData.complainantPhone,
      complainantPosition: currentData.complainantPosition,
      complainantDepartment: currentData.complainantDepartment,
      complainantSupervisor: currentData.complainantSupervisor,
      employees: currentData.employees || [],
    });
    setIsEditing(false);
  };

  // Auto-cancel editing if status becomes non-editable
  useEffect(() => {
    if (currentData.status === "GRIEVED" || currentData.status === "CLOSED" || currentData.status === "DELETED") {
      setIsEditing(false);
      setFormData({
        complainantFirstName: currentData.complainantFirstName,
        complainantLastName: currentData.complainantLastName,
        complainantEmail: currentData.complainantEmail,
        complainantPhone: currentData.complainantPhone,
        complainantPosition: currentData.complainantPosition,
        complainantDepartment: currentData.complainantDepartment,
        complainantSupervisor: currentData.complainantSupervisor,
        employees: currentData.employees || [],
      });
    }
  }, [currentData.status, currentData.complainantFirstName, currentData.complainantLastName, currentData.complainantEmail, currentData.complainantPhone, currentData.complainantPosition, currentData.complainantDepartment, currentData.complainantSupervisor, currentData.employees]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [id]: value,
    }));
  };

  const handleEmployeeChange = (index: number, field: string, value: string) => {
    const newEmployees = [...formData.employees];
    newEmployees[index] = { ...newEmployees[index], [field]: value };
    setFormData((prev) => ({
      ...prev,
      employees: newEmployees,
    }));
  };

  const addEmployee = () => {
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
  };

  const removeEmployee = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      employees: prev.employees.filter((_, i) => i !== index),
    }));
  };

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center justify-between">
          <div className="flex items-center">
            <User className="h-4 w-4 mr-2 text-blue-500" />
            Employee Information
          </div>
          {!isEditing && currentData.status !== "GRIEVED" && currentData.status !== "CLOSED" && currentData.status !== "DELETED" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(true)}
              className="h-8 w-8 p-0"
            >
              <Pencil className="h-4 w-4" />
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isEditing ? (
          <>
            {/* Primary Complainant */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  First Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="complainantFirstName"
                  value={formData.complainantFirstName}
                  onChange={handleChange}
                  placeholder="First name"
                  className="h-8"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Last Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="complainantLastName"
                  value={formData.complainantLastName}
                  onChange={handleChange}
                  placeholder="Last name"
                  className="h-8"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Email</Label>
                <Input
                  id="complainantEmail"
                  type="email"
                  value={formData.complainantEmail}
                  onChange={handleChange}
                  placeholder="Email address"
                  className="h-8"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Phone Number</Label>
                <Input
                  id="complainantPhone"
                  value={formData.complainantPhone}
                  onChange={handleChange}
                  placeholder="Phone number"
                  className="h-8"
                />
              </div>
            </div>

            {/* Collapsible More Details for Primary Complainant */}
            <details className="group">
              <summary className="cursor-pointer text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center">
                <ChevronDown className="h-4 w-4 mr-1 group-open:rotate-180 transition-transform" />
                More Details
              </summary>
              <div className="mt-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Position</Label>
                    <Input
                      id="complainantPosition"
                      value={formData.complainantPosition}
                      onChange={handleChange}
                      placeholder="Job position"
                      className="h-8"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Department</Label>
                    <Input
                      id="complainantDepartment"
                      value={formData.complainantDepartment}
                      onChange={handleChange}
                      placeholder="Department"
                      className="h-8"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Supervisor</Label>
                  <Input
                    id="complainantSupervisor"
                    value={formData.complainantSupervisor}
                    onChange={handleChange}
                    placeholder="Supervisor name"
                    className="h-8"
                  />
                </div>
              </div>
            </details>

            {/* Additional Employees for Group Complaints */}
            {complaintData.type === "GROUP" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  {/* <Label className="font-medium text-sm">
                    Additional Employees Involved
                  </Label> */}
                </div>

                {formData.employees.map((employee: any, index: number) => (
                  <div
                    key={employee.id}
                    className="pt-3 border-t border-gray-100"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-semibold text-gray-900">
                        Employee {index + 2}
                      </h4>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeEmployee(index)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                          First Name <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          placeholder="First name"
                          value={employee.firstName}
                          onChange={(e) => handleEmployeeChange(index, "firstName", e.target.value)}
                          className="h-8"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                          Last Name <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          placeholder="Last name"
                          value={employee.lastName}
                          onChange={(e) => handleEmployeeChange(index, "lastName", e.target.value)}
                          className="h-8"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                      <div className="space-y-2">
                        <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                          Email
                        </Label>
                        <Input
                          type="email"
                          placeholder="Email address"
                          value={employee.email}
                          onChange={(e) => handleEmployeeChange(index, "email", e.target.value)}
                          className="h-8"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                          Phone Number
                        </Label>
                        <Input
                          placeholder="(555) 555-5555"
                          value={employee.phoneNumber}
                          onChange={(e) => {
                            const formatted = formatPhoneInput(e.target.value);
                            handleEmployeeChange(index, "phoneNumber", formatted);
                          }}
                          className="h-8"
                        />
                      </div>
                    </div>

                    {/* Collapsible More Details for Additional Employee */}
                    <details className="group mt-2">
                      <summary className="cursor-pointer text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center">
                        <ChevronDown className="h-4 w-4 mr-1 group-open:rotate-180 transition-transform" />
                        More Details
                      </summary>
                      <div className="mt-2 space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                              Position
                            </Label>
                            <Input
                              placeholder="Job position"
                              value={employee.position}
                              onChange={(e) => handleEmployeeChange(index, "position", e.target.value)}
                              className="h-8"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                              Department
                            </Label>
                            <Input
                              placeholder="Department"
                              value={employee.department}
                              onChange={(e) => handleEmployeeChange(index, "department", e.target.value)}
                              className="h-8"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                            Supervisor
                          </Label>
                          <Input
                            placeholder="Supervisor name"
                            value={employee.supervisor}
                            onChange={(e) => handleEmployeeChange(index, "supervisor", e.target.value)}
                            className="h-8"
                          />
                        </div>
                      </div>
                    </details>
                  </div>
                ))}

                {/* Add Employee Button */}
                <div className="flex justify-center pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addEmployee}
                    className="border-dashed border-gray-300 hover:border-gray-400 hover:bg-gray-50"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Employee
                  </Button>
                </div>
              </div>
            )}

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
          <>
            {/* Unified Employees List (includes primary complainant if available) */}
            <div className="space-y-2">
              {(() => {
                const primary = (currentData.complainantFirstName || currentData.complainantLastName) ? {
                  firstName: currentData.complainantFirstName,
                  lastName: currentData.complainantLastName,
                  email: currentData.complainantEmail,
                  phoneNumber: currentData.complainantPhone,
                  position: currentData.complainantPosition,
                  department: currentData.complainantDepartment,
                  supervisor: currentData.complainantSupervisor,
                } : null;

                const allEmployees = [
                  ...(primary ? [primary] : []),
                  ...(Array.isArray(currentData.employees) ? currentData.employees : []),
                ];

                if (allEmployees.length === 0) {
                  return (
                    <div className="text-sm text-gray-500">No employee information</div>
                  );
                }

                return allEmployees.map((employee: any, index: number) => (
                  <div key={`${employee.firstName || ""}-${employee.lastName || ""}-${index}`} className="p-2 rounded-md">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="text-sm font-medium text-gray-900 cursor-help hover:text-blue-600 transition-colors">
                          {`${employee.firstName || ""} ${employee.lastName || ""}`.trim() || "Unknown Employee"}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <div className="space-y-1">
                          {employee.position && (
                            <div className="flex items-center gap-2">
                              <Briefcase className="h-3 w-3" />
                              <span>{employee.position}</span>
                            </div>
                          )}
                          {employee.department && (
                            <div className="flex items-center gap-2">
                              <Building className="h-3 w-3" />
                              <span>{employee.department}</span>
                            </div>
                          )}
                          {employee.supervisor && (
                            <div className="flex items-center gap-2">
                              <User className="h-3 w-3" />
                              <span>Supervisor: {employee.supervisor}</span>
                            </div>
                          )}
                          {!employee.position && !employee.department && !employee.supervisor && (
                            <div className="text-xs text-white">
                              No extra details provided
                            </div>
                          )}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                    <div className="flex items-center gap-4 text-xs text-gray-600 mt-1">
                      {employee.email && (
                        <div className="flex items-center gap-1">
                          <Mail className="h-3 w-3 text-gray-400" />
                          <span className="truncate max-w-[120px]">{employee.email}</span>
                        </div>
                      )}
                      {employee.phoneNumber && (
                        <div className="flex items-center gap-1">
                          <Phone className="h-3 w-3 text-gray-400" />
                          <span>{formatPhoneNumber(employee.phoneNumber)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ));
              })()}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
