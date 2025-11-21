"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Plus, X } from "lucide-react";
import { createIncident } from "@/app/actions/incidents";
import { fetchBargainingUnits } from "@/app/actions/bargaining-unit";
import { GRIEVANCE_CATEGORIES } from "@/app/lib/definitions";

interface Employee {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
}

export default function NewIncidentForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([
    { firstName: "", lastName: "", email: "", phone: "" }
  ]);
  const [bargainingUnit, setBargainingUnit] = useState("");
  const [bargainingUnits, setBargainingUnits] = useState<Array<{id: string, name: string}>>([]);
  const [isLoadingUnits, setIsLoadingUnits] = useState(true);
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");

  const addEmployee = () => {
    setEmployees([...employees, { firstName: "", lastName: "", email: "", phone: "" }]);
  };

  const removeEmployee = (index: number) => {
    if (employees.length > 1) {
      setEmployees(employees.filter((_, i) => i !== index));
    }
  };

  const updateEmployee = (index: number, field: keyof Employee, value: string) => {
    const updatedEmployees = [...employees];
    updatedEmployees[index] = { ...updatedEmployees[index], [field]: value };
    setEmployees(updatedEmployees);
  };

  // Fetch bargaining units on component mount
  useEffect(() => {
    const fetchUnits = async () => {
      try {
        const units = await fetchBargainingUnits();
        setBargainingUnits(units);
        if (units.length > 0) {
          setBargainingUnit(units[0].id);
        }
      } catch (error) {
        console.error('Error fetching bargaining units:', error);
      } finally {
        setIsLoadingUnits(false);
      }
    };
    fetchUnits();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const result = await createIncident({
        category: category,
        description: description,
        bargainingUnit: bargainingUnit,
        employees: employees,
        // agreementId: "123", // Remove this line since it doesn't exist
        status: "ACTIVE", // Use valid IncidentStatus enum value
      });
      if (result.success) {
        // Redirect to incidents list
        router.push("/product/incidents");
      } else {
        alert(result.error || "Failed to create incident");
      }
    } catch (error) {
      alert("Error creating incident");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">New Incident</h1>
          <p className="text-muted-foreground">
            Create a new incident report
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Incident Details</CardTitle>
          <CardDescription>
            Fill in the details of the incident
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Employee(s) Section */}
            <div className="space-y-4">
              <Label className="text-base font-medium">Employee(s)</Label>
              {employees.map((employee, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border rounded-lg">
                  <div>
                    <Label htmlFor={`firstName-${index}`}>First Name</Label>
                    <Input
                      id={`firstName-${index}`}
                      value={employee.firstName}
                      onChange={(e) => updateEmployee(index, "firstName", e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor={`lastName-${index}`}>Last Name</Label>
                    <Input
                      id={`lastName-${index}`}
                      value={employee.lastName}
                      onChange={(e) => updateEmployee(index, "lastName", e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor={`email-${index}`}>Email</Label>
                    <Input
                      id={`email-${index}`}
                      type="email"
                      value={employee.email}
                      onChange={(e) => updateEmployee(index, "email", e.target.value)}
                      required
                    />
                  </div>
                  <div className="flex items-end gap-2">
                    <div className="flex-1">
                      <Label htmlFor={`phone-${index}`}>Phone (Optional)</Label>
                      <Input
                        id={`phone-${index}`}
                        value={employee.phone}
                        onChange={(e) => updateEmployee(index, "phone", e.target.value)}
                      />
                    </div>
                    {employees.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeEmployee(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                onClick={addEmployee}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Another Employee
              </Button>
            </div>

            {/* Bargaining Unit */}
            <div>
              <Label htmlFor="bargainingUnit">Bargaining Unit</Label>
              {isLoadingUnits ? (
                <div className="h-10 bg-gray-100 rounded-md animate-pulse"></div>
              ) : bargainingUnits.length === 0 ? (
                <div className="h-10 bg-gray-50 rounded-md flex items-center px-3 text-sm text-gray-500">
                  No bargaining units available. Please add a bargaining unit first.
                </div>
              ) : (
                <Select value={bargainingUnit} onValueChange={setBargainingUnit}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select bargaining unit" />
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

            {/* Category */}
            <div>
              <Label htmlFor="category">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
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

            {/* Description */}
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the incident in detail..."
                rows={6}
                required
              />
            </div>

            {/* Submit Buttons */}
            <div className="flex justify-end gap-4 pt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Creating..." : "Create Incident"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
} 