"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getOrganizationTypeDisplay } from "@/app/lib/definitions";
import { useEffect, useState } from "react";
import { TIMEZONES, getTimezoneLabel, mapToNorthAmericanTimezone } from "@/lib/timezones";
import { useSession } from "@/lib/auth/use-auth-session";
import { useRouter } from "next/navigation";
import { useViewMode, getEffectiveRole } from "@/app/contexts/ViewModeContext";
import { updateUserProfile, changePassword, getUserAuthProvider, updateOrganization, updateOrganizationLogo } from "@/app/actions/user-profile";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Lock, Building, Upload, X, FileImage, Image as ImageIcon, Pencil, User, UserCircle, Edit, Check } from "lucide-react";
import { storageClient } from "@/app/client/services/storage-client";
import { Label } from "@/components/ui/label";
import Image from "next/image";
import { formatPhoneNumber, formatPhoneInput } from "@/lib/utils";

const profileFormSchema = z.object({
  firstName: z.string().min(1, {
    message: "First name is required.",
  }),
  lastName: z.string().min(1, {
    message: "Last name is required.",
  }),
  title: z.string().optional(),
  phone: z.string().optional(),
  timezone: z.string().optional(),
});

const passwordFormSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const organizationFormSchema = z.object({
  organizationName: z.string().min(2, "Organization name must be at least 2 characters"),
  organizationType: z.string().min(1, "Please select an organization type"),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;
type PasswordFormValues = z.infer<typeof passwordFormSchema>;
type OrganizationFormValues = z.infer<typeof organizationFormSchema>;

const defaultProfileValues: Partial<ProfileFormValues> = {
  firstName: "",
  lastName: "",
  title: "",
  phone: "",
  timezone: "",
};

const defaultPasswordValues: Partial<PasswordFormValues> = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

const defaultOrganizationValues: Partial<OrganizationFormValues> = {
  organizationName: "",
  organizationType: "",
};

export function ProfileSettings() {
  const { data: session, refetch: refetchSession } = useSession();
  const { toast } = useToast();
  const router = useRouter();
  const { viewMode } = useViewMode();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPasswordSubmitting, setIsPasswordSubmitting] = useState(false);
  const [isOrgSubmitting, setIsOrgSubmitting] = useState(false);
  const [isLogoUploading, setIsLogoUploading] = useState(false);
  const [authProvider, setAuthProvider] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const [isEditingPersonal, setIsEditingPersonal] = useState(false);
  const [isEditingOrg, setIsEditingOrg] = useState(false);
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [isOrgDataLoading, setIsOrgDataLoading] = useState(true);
  const [browserTimezone, setBrowserTimezone] = useState<string>("");

  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: defaultProfileValues,
  });

  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: defaultPasswordValues,
  });

  const organizationForm = useForm<OrganizationFormValues>({
    resolver: zodResolver(organizationFormSchema),
    defaultValues: defaultOrganizationValues,
  });

  // Check if user is admin or org member (respecting view mode)
  const actualUserRole = session?.user?.organization?.members?.find(
    (member) => member.userId === session?.user?.id
  )?.role;
  const actualIsSuperAdmin = session?.user?.isSuperAdmin || false;

  // Get effective role based on view mode
  const { isSuperAdmin: effectiveIsSuperAdmin, userRole: effectiveUserRole } =
    getEffectiveRole(actualIsSuperAdmin, actualUserRole, viewMode);

  const isAdmin = effectiveUserRole === "Admin" || effectiveIsSuperAdmin;
  const isOrgMember = !!session?.user?.organization; // Has an organization

  // Detect browser timezone on mount and map to North American timezone
  useEffect(() => {
    const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const mappedTimezone = mapToNorthAmericanTimezone(detectedTimezone);
    setBrowserTimezone(mappedTimezone);
  }, []);

  // Fetch auth provider on mount
  useEffect(() => {
    getUserAuthProvider().then(setAuthProvider);
  }, []);

  // Load logo preview URL when organization logo exists
  useEffect(() => {
    async function loadLogoPreview() {
      if (session?.user?.organization?.logoFilename) {
        try {
          const url = await storageClient.getDownloadUrl('agreement', session.user.organization.logoFilename);
          setLogoPreviewUrl(url);
        } catch (error) {
          console.error('Failed to load logo preview:', error);
          setLogoPreviewUrl(null);
        }
      }
    }
    loadLogoPreview();
  }, [session?.user?.organization?.logoFilename]);

  // Set form values from session on load
  useEffect(() => {
    if (session?.user && browserTimezone) {
      const fullName = session.user.name || "";
      const nameParts = fullName.trim().split(/\s+/);
      const firstName = nameParts[0] || "";
      const lastName = nameParts.slice(1).join(" ") || "";

      profileForm.reset({
        firstName,
        lastName,
        title: session.user.title || "",
        phone: formatPhoneNumber(session.user.phone) || "",
        timezone: session.user.timezone || browserTimezone, // Use saved timezone or browser default
      });

      // Auto-save timezone on first load if user doesn't have one set
      if (!session.user.timezone && browserTimezone) {
        const formData = new FormData();
        formData.append("firstName", firstName);
        formData.append("lastName", lastName);
        formData.append("title", session.user.title || "");
        formData.append("phone", session.user.phone || "");
        formData.append("timezone", browserTimezone);

        updateUserProfile(formData).then(async (result) => {
          if (result.success) {
            await refetchSession();
          }
        });
      }

      // Set organization form values for org members
      if (session.user.organization && isOrgMember) {
        const orgType = session.user.organization.organizationType;
        organizationForm.reset({
          organizationName: session.user.organization.name || "",
          organizationType: orgType || "",
        });
        setIsOrgDataLoading(false);
      } else if (!isOrgMember) {
        setIsOrgDataLoading(false);
      }
    }
  }, [session, profileForm, organizationForm, isOrgMember, browserTimezone]);

  async function onProfileSubmit(data: ProfileFormValues) {
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("firstName", data.firstName);
      formData.append("lastName", data.lastName);
      formData.append("title", data.title || "");
      formData.append("phone", data.phone || "");
      formData.append("timezone", data.timezone || browserTimezone);

      const result = await updateUserProfile(formData);

      if (result.success) {
        toast({
          title: "Profile Updated",
          description: "Your profile has been updated successfully.",
        });
        // Refetch session to get updated user data
        await refetchSession();
        // Force router refresh to update UI
        router.refresh();
        setIsEditingPersonal(false);
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to update profile",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  function onProfileCancel() {
    if (session?.user) {
      const fullName = session.user.name || "";
      const nameParts = fullName.trim().split(/\s+/);
      const firstName = nameParts[0] || "";
      const lastName = nameParts.slice(1).join(" ") || "";

      profileForm.reset({
        firstName,
        lastName,
        title: session.user.title || "",
        phone: formatPhoneNumber(session.user.phone) || "",
        timezone: session.user.timezone || browserTimezone,
      });
    }
    setIsEditingPersonal(false);
  }

  async function onPasswordSubmit(data: PasswordFormValues) {
    setIsPasswordSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("currentPassword", data.currentPassword);
      formData.append("newPassword", data.newPassword);
      formData.append("confirmPassword", data.confirmPassword);

      const result = await changePassword(formData);

      if (result.success) {
        toast({
          title: "Password Changed",
          description: "Your password has been changed successfully.",
        });
        passwordForm.reset();
        setIsEditingPassword(false);
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to change password",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsPasswordSubmitting(false);
    }
  }

  function onPasswordCancel() {
    passwordForm.reset();
    setIsEditingPassword(false);
  }

  async function onOrganizationSubmit(data: OrganizationFormValues) {
    setIsOrgSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("organizationName", data.organizationName);
      formData.append("organizationType", data.organizationType);

      const result = await updateOrganization(formData);

      if (result.success) {
        toast({
          title: "Organization Updated",
          description: "Organization information has been updated successfully.",
        });
        // Refetch session to get updated organization data
        await refetchSession();
        // Force router refresh to update UI
        router.refresh();
        setIsEditingOrg(false);
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to update organization",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsOrgSubmitting(false);
    }
  }

  function onOrganizationCancel() {
    if (session?.user?.organization && isOrgMember) {
      const orgType = session.user.organization.organizationType;
      organizationForm.reset({
        organizationName: session.user.organization.name || "",
        organizationType: orgType || "",
      });
    }
    setIsEditingOrg(false);
  }

  const handleLogoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid File Type",
        description: "Please select an image file (PNG, JPG, etc.)",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Logo file must be smaller than 5MB",
        variant: "destructive",
      });
      return;
    }

    // Automatically upload the file
    setIsLogoUploading(true);
    setLogoFile(file);

    try {
      // Upload the logo file
      const uploadedLogoFilename = await storageClient.uploadLogoFile(file);

      // Update the organization with the new logo
      const result = await updateOrganizationLogo(uploadedLogoFilename);

      if (result.success) {
        toast({
          title: "Logo Updated",
          description: "Organization logo has been updated successfully!",
        });

        // Clear the file input
        const fileInput = document.getElementById("org_logo_file") as HTMLInputElement;
        if (fileInput) {
          fileInput.value = "";
        }

        // Reset the upload state
        setLogoFile(null);

        // Force reload the logo preview with the new filename
        if (uploadedLogoFilename) {
          const newUrl = await storageClient.getDownloadUrl('agreement', uploadedLogoFilename);
          setLogoPreviewUrl(newUrl);
        }

        // Refresh the page to update session
        router.refresh();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to upload logo",
          variant: "destructive",
        });
        setLogoFile(null);
      }
    } catch (error) {
      console.error('Failed to upload logo:', error);
      toast({
        title: "Upload Failed",
        description: "Failed to upload logo. Please try again.",
        variant: "destructive",
      });
      setLogoFile(null);
    } finally {
      setIsLogoUploading(false);
    }
  };


  // Check if user is using password-based auth (not Google)
  const isPasswordAuth = authProvider === "credential" || (authProvider && authProvider !== "google");

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Organization Information - Only visible to Admins */}
      {isOrgMember && isAdmin && (
        <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center justify-between">
                <div className="flex items-center">
                  <Building className="h-5 w-5 mr-2 text-blue-500" />
                  Organization Information
                </div>
                {!isEditingOrg && !isOrgDataLoading && isAdmin && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditingOrg(true)}
                    className="h-8 w-8 p-0"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                )}
              </CardTitle>
              <CardDescription>
                {isAdmin ? "Update your organization details and logo" : "View your organization details"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {isOrgDataLoading ? (
                /* Loading State - Only show skeleton */
                <>
                  <div className="space-y-4">
                    <Skeleton className="h-32 w-32 mx-auto rounded-lg" />
                    <Skeleton className="h-4 w-48 mx-auto" />
                  </div>
                  <Separator />
                  <div className="space-y-4">
                    <div>
                      <Skeleton className="h-4 w-32 mb-2" />
                      <Skeleton className="h-5 w-full" />
                    </div>
                    <div>
                      <Skeleton className="h-4 w-32 mb-2" />
                      <Skeleton className="h-5 w-full" />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Logo Upload Section - Left Column */}
                    <div className="md:col-span-1">
                      {/* Show current logo or loading state if logoFilename exists */}
                      {session?.user?.organization?.logoFilename ? (
                        <div className={`relative ${isAdmin ? 'group' : ''}`}>
                          <div className="border border-gray-200 rounded-lg p-4 bg-white h-48 flex items-center justify-center">
                              {logoPreviewUrl ? (
                                <img
                                  src={logoPreviewUrl}
                                  alt="Organization Logo"
                                  className="max-h-full max-w-full object-contain"
                                  onError={(e) => {
                                    console.error('Failed to load logo image');
                                    (e.target as HTMLImageElement).style.display = 'none';
                                  }}
                                />
                              ) : (
                                /* Loading preview URL */
                                <div className="flex flex-col items-center justify-center">
                                  <Loader2 className="h-8 w-8 text-gray-400 animate-spin mb-2" />
                                  <span className="text-xs text-gray-500">Loading...</span>
                                </div>
                              )}
                              {/* Loading overlay when uploading */}
                              {isLogoUploading && (
                                <div className="absolute inset-0 bg-white bg-opacity-90 flex flex-col items-center justify-center">
                                  <Loader2 className="h-8 w-8 text-blue-500 animate-spin mb-2" />
                                  <span className="text-sm font-medium text-gray-900">Uploading...</span>
                                </div>
                              )}
                              {/* Overlay on hover (only show for admins and if not uploading and if preview loaded) */}
                              {!isLogoUploading && logoPreviewUrl && isAdmin && (
                                <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                  <Label
                                    htmlFor="org_logo_file"
                                    className="cursor-pointer flex flex-col items-center gap-2 text-white"
                                  >
                                    <Pencil className="h-8 w-8" />
                                    <span className="text-sm font-medium">Edit Logo</span>
                                  </Label>
                                </div>
                              )}
                          </div>
                          {isAdmin && (
                            <Input
                              id="org_logo_file"
                              type="file"
                              accept="image/*"
                              onChange={handleLogoFileChange}
                              className="hidden"
                              disabled={isLogoUploading}
                            />
                          )}
                        </div>
                      ) : (
                        /* No logo - show upload area for admins only, message for non-admins */
                        <>
                          {isAdmin ? (
                            <div className="relative">
                              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors bg-gray-50 h-48 flex items-center justify-center">
                                {isLogoUploading ? (
                                  /* Loading state */
                                  <div className="flex flex-col items-center">
                                    <Loader2 className="h-12 w-12 text-blue-500 animate-spin mb-4" />
                                    <p className="text-sm font-medium text-gray-900">Uploading logo...</p>
                                    <p className="text-xs text-gray-500 mt-1">Please wait</p>
                                  </div>
                                ) : (
                                  /* Upload prompt */
                                  <div className="w-full">
                                    <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                    <div className="space-y-2">
                                      <Label htmlFor="org_logo_file" className="text-sm font-medium cursor-pointer block">
                                        <span className="text-blue-600 hover:text-blue-500">
                                          Click to add a logo
                                        </span>
                                        <span className="text-gray-500"> or drag and drop</span>
                                      </Label>
                                      <p className="text-xs text-gray-500">PNG, JPG up to 5MB</p>
                                    </div>
                                  </div>
                                )}
                              </div>
                              <Input
                                id="org_logo_file"
                                type="file"
                                accept="image/*"
                                onChange={handleLogoFileChange}
                                className="hidden"
                                disabled={isLogoUploading}
                              />
                            </div>
                          ) : (
                            <div className="border border-gray-200 rounded-lg p-8 text-center bg-gray-50 h-48 flex items-center justify-center">
                              <div>
                                <Building className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                <p className="text-sm text-gray-500">No organization logo uploaded</p>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    {/* Organization Details - Right Column */}
                    <div className="md:col-span-2">
                      {isEditingOrg ? (
                <Form {...organizationForm}>
                  <form
                    onSubmit={organizationForm.handleSubmit(onOrganizationSubmit)}
                    className="space-y-4"
                  >
                    <FormField
                      control={organizationForm.control}
                      name="organizationName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Organization Name <span className="text-red-500">*</span></FormLabel>
                          <FormControl>
                            <Input placeholder="Organization name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    {effectiveIsSuperAdmin ? (
                      <FormField
                        control={organizationForm.control}
                        name="organizationType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Organization Type</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select organization type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="HR">Employer (HR)</SelectItem>
                                <SelectItem value="Union">Union</SelectItem>
                                <SelectItem value="Local">Local</SelectItem>
                                <SelectItem value="LAW_FIRM">Law Firm</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    ) : (
                      <div>
                        <Label className="text-sm font-medium text-gray-700">Organization Type</Label>
                        <p className="mt-1 text-sm text-gray-900">{getOrganizationTypeDisplay(session?.user?.organization?.organizationType)}</p>
                      </div>
                    )}
                    <div className="flex items-center justify-end gap-2 pt-4">
                      <Button
                        variant="outline"
                        onClick={onOrganizationCancel}
                        disabled={isOrgSubmitting}
                        className="h-8"
                        type="button"
                      >
                        <X className="h-4 w-4 mr-1" />
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={isOrgSubmitting}
                        className="h-8 bg-green-600 hover:bg-green-700 text-white"
                      >
                        {isOrgSubmitting ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Check className="h-4 w-4 mr-1" />
                            Save
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </Form>
                      ) : (
                        <div className="grid grid-cols-1 gap-4">
                          <div>
                            <Label className="text-sm font-medium text-gray-700">Organization Name</Label>
                            <p className="mt-1 text-sm text-gray-900">{session?.user?.organization?.name}</p>
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-gray-700">Organization Type</Label>
                            <p className="mt-1 text-sm text-gray-900">{getOrganizationTypeDisplay(session?.user?.organization?.organizationType)}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
      )}

      {/* Personal Information & User Details */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center justify-between">
            <div className="flex items-center">
              <User className="h-5 w-5 mr-2 text-blue-500" />
              Personal Information
            </div>
              {!isEditingPersonal && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditingPersonal(true)}
                  className="h-8 w-8 p-0"
                >
                  <Edit className="h-4 w-4" />
                </Button>
              )}
            </CardTitle>
            <CardDescription>Your personal contact details</CardDescription>
          </CardHeader>
          <CardContent>
            {isEditingPersonal ? (
              <Form {...profileForm}>
                <form
                  onSubmit={profileForm.handleSubmit(onProfileSubmit)}
                  className="space-y-6"
                >
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label className="text-sm font-medium text-gray-700">Email</Label>
                      <p className="mt-1 text-sm text-gray-900">{session?.user?.email}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-700">Role</Label>
                      <p className="mt-1 text-sm text-gray-900">{isAdmin ? "Administrator" : "Member"}</p>
                    </div>
                    <FormField
                      control={profileForm.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name <span className="text-red-500">*</span></FormLabel>
                          <FormControl>
                            <Input placeholder="Your first name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={profileForm.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last Name <span className="text-red-500">*</span></FormLabel>
                          <FormControl>
                            <Input placeholder="Your last name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={profileForm.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Title</FormLabel>
                          <FormControl>
                            <Input placeholder="Your job title" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={profileForm.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="(555) 555-5555"
                              {...field}
                              onChange={(e) => {
                                const formatted = formatPhoneInput(e.target.value);
                                field.onChange(formatted);
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={profileForm.control}
                    name="timezone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Timezone</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select your timezone" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="max-h-[300px]">
                            {TIMEZONES.map((tz) => (
                              <SelectItem key={tz.value} value={tz.value}>
                                {tz.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex items-center justify-end gap-2 pt-4">
                    <Button
                      variant="outline"
                      onClick={onProfileCancel}
                      disabled={isSubmitting}
                      className="h-8"
                      type="button"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="h-8 bg-green-600 hover:bg-green-700 text-white"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Check className="h-4 w-4 mr-1" />
                          Save
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label className="text-sm font-medium text-gray-700">Email</Label>
                  <p className="mt-1 text-sm text-gray-900">{session?.user?.email}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">Role</Label>
                  <p className="mt-1 text-sm text-gray-900">{isAdmin ? "Administrator" : "Member"}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">First Name</Label>
                  <p className="mt-1 text-sm text-gray-900">{profileForm.getValues("firstName")}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">Last Name</Label>
                  <p className="mt-1 text-sm text-gray-900">{profileForm.getValues("lastName")}</p>
                </div>
                {profileForm.getValues("title") && (
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Title</Label>
                    <p className="mt-1 text-sm text-gray-900">{profileForm.getValues("title")}</p>
                  </div>
                )}
                {profileForm.getValues("phone") && (
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Phone</Label>
                    <p className="mt-1 text-sm text-gray-900">{formatPhoneNumber(profileForm.getValues("phone"))}</p>
                  </div>
                )}
                <div className="md:col-span-2">
                  <Label className="text-sm font-medium text-gray-700">Timezone</Label>
                  <p className="mt-1 text-sm text-gray-900">
                    {getTimezoneLabel(profileForm.getValues("timezone") || browserTimezone)}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Password Change Section - Only show for non-Google auth users */}
        {isPasswordAuth && (
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center justify-between">
                <div className="flex items-center">
                  <Lock className="h-5 w-5 mr-2 text-blue-500" />
                  Change Password
                </div>
                {!isEditingPassword && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditingPassword(true)}
                    className="h-8 w-8 p-0"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                )}
              </CardTitle>
              <CardDescription>Update your account password</CardDescription>
            </CardHeader>
            <CardContent>
              {isEditingPassword ? (
                <Form {...passwordForm}>
                  <form
                    onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}
                    className="space-y-6"
                  >
                    <FormField
                      control={passwordForm.control}
                      name="currentPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Current Password <span className="text-red-500">*</span></FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="Enter current password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid gap-4 md:grid-cols-2">
                      <FormField
                        control={passwordForm.control}
                        name="newPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>New Password <span className="text-red-500">*</span></FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="Enter new password" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={passwordForm.control}
                        name="confirmPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Confirm New Password <span className="text-red-500">*</span></FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="Confirm new password" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-4">
                      <Button
                        variant="outline"
                        onClick={onPasswordCancel}
                        disabled={isPasswordSubmitting}
                        className="h-8"
                        type="button"
                      >
                        <X className="h-4 w-4 mr-1" />
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={isPasswordSubmitting}
                        className="h-8 bg-green-600 hover:bg-green-700 text-white"
                      >
                        {isPasswordSubmitting ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Check className="h-4 w-4 mr-1" />
                            Save
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </Form>
              ) : (
                <div className="py-4">
                  <p className="text-sm text-gray-500">Click the edit button to change your password</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
    </div>
  );
}
