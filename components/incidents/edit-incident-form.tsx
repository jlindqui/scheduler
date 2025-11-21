"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useParams } from "next/navigation";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ArrowLeft, Plus, X, FileText, Upload, Trash2, CheckCircle } from "lucide-react";

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
}

export default function EditIncidentForm() {
  const router = useRouter();
  const params = useParams();
  const incidentId = params.id as string;
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [employees, setEmployees] = useState<Employee[]>([
    { firstName: "", lastName: "", email: "", phone: "" }
  ]);
  const [bargainingUnit, setBargainingUnit] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [evidenceFiles, setEvidenceFiles] = useState<EvidenceFile[]>([]);
  const [showResolveDialog, setShowResolveDialog] = useState(false);
  const [resolutionText, setResolutionText] = useState("");

  useEffect(() => {
    // Simulate loading incident data
    setTimeout(() => {
      setEmployees([
        { firstName: "John", lastName: "Doe", email: "john.doe@example.com", phone: "555-1234" }
      ]);
      setBargainingUnit("USW 401");
      setCategory("Workplace Conditions");
      setDescription("Sample incident description...");
      setEvidenceFiles([
        {
          id: "1",
          name: "incident_report.pdf",
          type: "PDF",
          uploadedBy: "John Doe",
          uploadedAt: "2024-01-15"
        },
        {
          id: "2", 
          name: "witness_statement.docx",
          type: "DOCX",
          uploadedBy: "Jane Smith",
          uploadedAt: "2024-01-16"
        }
      ]);
      setIsLoading(false);
    }, 1000);
  }, [incidentId]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Here you would typically submit to your API
      // For now, we'll just redirect back to the incidents list
      router.push("/product/incidents");
    } catch (error) {
      console.error("Error updating incident:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResolve = async () => {
    setIsSubmitting(true);
    try {
      // Here you would submit the resolution
      setShowResolveDialog(false);
      router.push("/product/incidents");
    } catch (error) {
      console.error("Error resolving incident:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const removeEvidenceFile = (fileId: string) => {
    setEvidenceFiles(evidenceFiles.filter(file => file.id !== fileId));
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

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
          <h1 className="text-2xl font-bold">Edit Incident</h1>
          <p className="text-muted-foreground">
            Update incident details
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Incident Details</CardTitle>
          <CardDescription>
            Update the details of the incident
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
              <Select value={bargainingUnit} onValueChange={setBargainingUnit}>
                <SelectTrigger>
                  <SelectValue placeholder="Select bargaining unit" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="USW 401">USW 401</SelectItem>
                    <SelectItem value="CUPE 407">CUPE 407</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
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
                    <SelectItem value="Unpaid Hours">Unpaid Hours</SelectItem>
                    <SelectItem value="Workplace Conditions">Workplace Conditions</SelectItem>
                    <SelectItem value="Benefits Issue">Benefits Issue</SelectItem>
                    <SelectItem value="Overtime Dispute">Overtime Dispute</SelectItem>
                    <SelectItem value="Discrimination">Discrimination</SelectItem>
                    <SelectItem value="Harassment">Harassment</SelectItem>
                    <SelectItem value="Discipline">Discipline</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
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

            {/* Evidence Files */}
            <div className="space-y-4">
              <Label className="text-base font-medium">Evidence Files</Label>
              <div className="space-y-2">
                {evidenceFiles.map((file) => (
                  <div key={file.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileText className="h-4 w-4 text-gray-500" />
                      <div>
                        <p className="font-medium">{file.name}</p>
                        <p className="text-sm text-gray-500">
                          Uploaded by {file.uploadedBy} on {file.uploadedAt}
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeEvidenceFile(file.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <Button type="button" variant="outline" className="w-full">
                <Upload className="h-4 w-4 mr-2" />
                Upload New File
              </Button>
            </div>

            {/* Submit Buttons */}
            <div className="flex justify-end gap-4 pt-6">
              <Dialog open={showResolveDialog} onOpenChange={setShowResolveDialog}>
                <DialogTrigger asChild>
                  <Button type="button" variant="outline" className="text-green-600 border-green-600 hover:bg-green-50">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Mark Resolved
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Mark Incident as Resolved</DialogTitle>
                    <DialogDescription>
                      Please provide details about how this incident was resolved.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Label htmlFor="resolution">Resolution Details</Label>
                    <Textarea
                      id="resolution"
                      value={resolutionText}
                      onChange={(e) => setResolutionText(e.target.value)}
                      placeholder="Describe how the incident was resolved..."
                      rows={4}
                      required
                    />
                  </div>
                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowResolveDialog(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      onClick={handleResolve}
                      disabled={isSubmitting || !resolutionText.trim()}
                    >
                      {isSubmitting ? "Resolving..." : "Mark Resolved"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
} 