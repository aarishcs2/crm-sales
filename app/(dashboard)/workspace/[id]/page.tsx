'use client'
import React, { useState, useRef } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Building,
  Users,
  Lock,
  Mail,
  Trash2,
  Upload,
  UserCircle,
  Bell,
  Tag,
  Edit2,
  Plus,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useAddStatusMutation, useDeleteStatusMutation, useGetStatusQuery, useUpdateStatusMutation } from "@/lib/store/services/status";
import { useGetWorkspaceMembersQuery, useGetWorkspacesByIdQuery, useUpdateWorkspaceMutation } from "@/lib/store/services/workspace";
import { toast } from "sonner";
import { useEffect } from "react";
import MemberManagement from "../inviteMember";
import { useAddMemberMutation, useDeleteMemberMutation, useResendInviteMutation } from "@/lib/store/services/members";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/lib/store/store";
interface WorkspaceMember {
  id?: string;
  email: string;
  role: string;
  status: "active" | "pending";
  profileImage?: string;
  name?: string;
}

interface Status {
  id?: string;
  name: string;
  color: string;
  count_statistics?: boolean;
  countInStatistics?: any;
  workspace_show: boolean;
}

interface WorkspaceSettings {
  name: string;
  industry: string;
  company_size: string;
  timezone: string;
  notifications: {
    email: boolean;
    sms: boolean;
    inApp: boolean;
  };
  security: {
    twoFactor: boolean;
    ipRestriction: boolean;
  };
}

// Status Form Component
const StatusForm = ({ status, onSubmit }: any) => (
  <div className="grid gap-4">
    <div className="flex flex-col sm:flex-row gap-4">
      <Input
        placeholder="Status name"
        value={status.name}
        onChange={(e) =>
          onSubmit({ ...status, name: e.target.value })
        }
        className="flex-1"
      />
      <div className="flex items-center gap-2">
        <Label htmlFor="color" className="whitespace-nowrap">Pick Color:</Label>
        <Input
          id="color"
          type="color"
          value={status.color}
          onChange={(e) =>
            onSubmit({ ...status, color: e.target.value })
          }
          className="w-20 h-10 p-1 bg-transparent"
        />
      </div>
    </div>
    <div className="flex flex-col sm:flex-row gap-4">
      <div className="flex items-center space-x-2">
        <Checkbox
          id="countInStatistics"
          checked={status.count_statistics}
          onCheckedChange={(checked) =>
            onSubmit({
              ...status,
              count_statistics: checked,
            })
          }
        />
        <Label htmlFor="countInStatistics">Count As Qualified</Label>
      </div>
    </div>
  </div>
);

export default function WorkspaceSettingsPage() {
  const isCollapsed = useSelector((state: RootState) => state.sidebar.isCollapsed);
  const [updateWorkspace, { isLoading: isUpdating, error: errorUpdating }] = useUpdateWorkspaceMutation();
  const [addMember, { isLoading: isAdding, error: errorAdding }] = useAddMemberMutation();
  const [updateStatus, { isLoading: isUpdatingStatus, error: errorUpdatingMember }] = useUpdateStatusMutation();
  const [addStatus, { isLoading: isAddingStat, error: statusAddError }] = useAddStatusMutation();
  const [deleteStatus, { isLoading: isDeletingStatus, error: errorDeletingStatus }] = useDeleteStatusMutation();
  const [resendInvite, { isLoading: isResending, error: errorResending }] = useResendInviteMutation();
  const [deleteMember, { isLoading: isDeleting, error: errorDeleting }] = useDeleteMemberMutation();
  const [activeTab, setActiveTab] = useState("general");
  const searchParams = useParams();
  const { id: workspaceId }: any = searchParams
  const [memberToDelete, setMemberToDelete] = useState<WorkspaceMember | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const { data: workspaceMembers, isLoading: isLoadingMembers, error } = useGetWorkspaceMembersQuery(workspaceId);
  const { data: statusData, isLoading: isLoadingStatus }: any = useGetStatusQuery(workspaceId);
  const { data: workspaceData, isLoading: isLoadingWorkspace } = useGetWorkspacesByIdQuery(workspaceId);
  const [isEditMode, setIsEditMode] = useState(false);
  const [tempSettings, setTempSettings] = useState<WorkspaceSettings | null>(null);
  const [settings, setSettings] = useState<WorkspaceSettings>({
    name: "",
    industry: "",  // flat property
    company_size: "", // flat property
    timezone: "",
    notifications: {
      email: false,
      sms: false,
      inApp: false,
    },
    security: {
      twoFactor: false,
      ipRestriction: false,
    },
  });

  // Status Management States
  const [newStatus, setNewStatus] = useState({
    name: "",
    color: "#0ea5e9",
    countInStatistics: false,
    showInWorkspace: false,
    count_statistics: false,
  });
  const [statusToDelete, setStatusToDelete] = useState<any | null>(null);
  const [statusToEdit, setStatusToEdit] = useState<Status | null>(null);
  const [isAddingStatus, setIsAddingStatus] = useState(false);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [statuses, setStatuses] = useState<Status[]>([]);


  const handleMemberAdd = async (newMember: WorkspaceMember) => {
    try {
      const result = await addMember({ workspaceId, data: newMember });

      if ('error' in result) {

        const errorDetails = (result.error as any).data;
        toast.error(errorDetails.error);
        return;
      }
      console.log(result)
      console.log(newMember)
      setMembers([...members, result?.data?.data]);
    } catch (error) {
      console.error('Unexpected error:', error);
    }
  };

  const handleMemberDelete = async (memberId: string) => {
    try {
      const result = await deleteMember({ workspaceId, id: memberId });

      if ('error' in result) {
        const errorDetails = (result.error as any).data;
        toast.error(errorDetails.error || 'Failed to delete member');
        return;
      }

      // Update local state only after successful deletion
      setMembers(prevMembers => prevMembers.filter(member => member.id !== memberId));
      toast.success('Member deleted successfully');
    } catch (error: any) {
      const errorMessage = error?.data?.error || 'An unexpected error occurred while deleting member';
      toast.error(errorMessage);
      console.error('Delete member error:', error);
    }
  };
  const resendInviteToMember = async (member: WorkspaceMember) => {
    if (!member.email || !member.id) {
      toast.error('Invalid member information');
      return;
    }

    try {
      const result = await resendInvite({
        workspaceId,
        email: member.email,
        memberId: member.id,
        status: member.status
      });

      if ('error' in result) {
        const errorDetails = (result.error as any).data;
        toast.error(errorDetails.error || 'Failed to resend invite');
        return;
      }

      toast.success('Invite resent successfully');
    } catch (error: any) {
      const errorMessage = error?.data?.error || 'An unexpected error occurred while resending invite';
      toast.error(errorMessage);
      console.error('Resend invite error:', error);
    }
  };
  const handleMemberUpdate = (updatedMember: WorkspaceMember) => {
    // console.log("deleted")
    setMembers(members.map(member =>
      member.id === updatedMember.id ? updatedMember : member
    ));
  };
  const confirmDeleteMember = async () => {
    if (memberToDelete) {
      if (memberToDelete?.id) {
        await deleteMember({ workspaceId, id: memberToDelete.id });
      }
      setMemberToDelete(null);
    }
  };
  useEffect(() => {
    if (statusData?.data) {
      setStatuses(statusData.data);
    }
  }, [statusData]);

  const handleAddStatus = async () => {
    if (!newStatus.name) return;
    console.log(newStatus)
    const status: any = {
      id: "",
      ...newStatus,
      countInStatistics: newStatus.count_statistics,
      showInWorkspace: newStatus.showInWorkspace,
    };
    console.log(status);
    try {
      const result: any = await addStatus({
        statusData: status,
        workspaceId
      }).unwrap();
      console.log(result);
      // If successful, update the local state
      setStatuses((prevStatuses) => [
        ...prevStatuses,
        {
          id: result?.data.id || "",
          name: result?.data.name,
          color: result?.data.color,
          count_statistics: result?.data.count_statistics,
          workspace_show: result?.data.showInWorkspace,
        },
      ]);

      setNewStatus({
        name: "",
        color: "#0ea5e9",
        countInStatistics: false,
        showInWorkspace: false,
        count_statistics: false,
      });

      setIsAddingStatus(false);
      toast.success('Status added successfully');
      // window.location.reload();
    } catch (error: any) {
      const errorMessage = error.data?.error || "Failed to add status";
      toast.error(errorMessage);
    }
  };

  const handleEditStatus = (status: Status) => {
    setStatusToEdit({ ...status });
  };

  const handleUpdateStatus = async () => {
    if (!statusToEdit) return;

    try {
      const result = await updateStatus({
        id: statusToEdit.id,
        updatedStatus: statusToEdit
      }).unwrap();

      // Update local state only after successful API call
      setStatuses(prevStatuses =>
        prevStatuses.map(status =>
          status.id === statusToEdit.id ? statusToEdit : status
        )
      );

      setStatusToEdit(null);
      toast.success('Status updated successfully');
    } catch (error: any) {
      // Handle specific API error
      const errorMessage = error.data?.error || "Failed to update status";
      toast.error(errorMessage);
    }
  };

  const confirmDeleteStatus = async () => {
    if (!statusToDelete) return;

    try {
      const response = await deleteStatus({
        id: statusToDelete.id,
        workspace_id: workspaceId
      }).unwrap(); // Use unwrap() to properly handle RTK Query errors

      // If successful, update local state
      setStatuses(prevStatuses =>
        prevStatuses.filter(status => status.id !== statusToDelete.id)
      );

      setStatusToDelete(null);
      toast.success('Status deleted successfully');

    } catch (error: any) {
      // Handle different types of errors from Supabase/RTK Query
      let errorMessage = 'Failed to delete status';

      if (error.status === 409) {
        errorMessage = 'This status is currently in use and cannot be deleted';
      } else if (error.data?.message) {
        errorMessage = error.data.message;
      } else if (error.error) {
        errorMessage = error.error;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }

      // Log the full error for debugging
      console.error('Delete status error:', {
        status: error.status,
        data: error.data,
        error: error.error,
        fullError: error
      });

      toast.error(errorMessage);
    }
  };

  useEffect(() => {
    if (workspaceData?.data) {
      setSettings(workspaceData?.data);
    }
  }, [workspaceData]);

  useEffect(() => {
    if (workspaceMembers?.data) {
      setMembers(workspaceMembers.data);
    }
  }, [workspaceMembers]);

  const handleEditClick = () => {
    setIsEditMode(true);
    setTempSettings({ ...settings }); // Store current settings for cancellation
  };

  const handleCancelEdit = () => {
    setIsEditMode(false);
    setSettings(tempSettings!); // Restore original settings
  };
  const handleSave = async () => {
    try {
      setIsSaving(true);
      await updateWorkspace({ id: workspaceId, data: settings });
      setIsEditMode(false);
      setTempSettings(settings);
      toast.success("Settings saved successfully");
    } catch (error) {
      toast.error("Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };
  const TabButton = ({
    id,
    icon: Icon,
    label,
  }: {
    id: string;
    icon: any;
    label: string;
  }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={cn(
        "flex items-center space-x-2 px-4 py-2 rounded-lg w-full md:w-auto",
        activeTab === id
          ? "bg-primary text-primary-foreground"
          : "hover:bg-secondary"
      )}
    >
      <Icon className="w-5 h-5" />
      <span>{label}</span>
    </button>
  );
  if (isLoadingWorkspace || isLoadingMembers || isLoadingStatus) {
    return (
      <div className="absolute inset-5 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }
  if (!workspaceData?.data) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>No workspace data available</p>
      </div>
    );
  }
  return (
    <div
      className={`transition-all duration-500 ease-in-out px-4 py-6 ${isCollapsed ? "ml-[80px]" : "ml-[250px]"} w-auto overflow-hidden`}
    >       <div className="container mx-auto p-4 md:p-6 space-y-6">
        <div className="flex flex-col space-y-4">

          <h1 className="text-2xl md:text-3xl font-bold">Workspace Settings</h1>
          {/* Responsive Tab Navigation */}
          <div className="flex flex-col sm:flex-row gap-2 overflow-x-auto">
            <TabButton id="general" icon={Building} label="General" />
            <TabButton id="members" icon={Users} label="Members" />
            <TabButton id="notifications" icon={Bell} label="Notifications" />
            <TabButton id="security" icon={Lock} label="Security" />
            <TabButton id="status" icon={Tag} label="Status" />
          </div>
        </div>

        <div className="grid gap-6">
          {/* General Settings */}
          {activeTab === "general" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between w-full">
                  <span>Basic Information</span>
                  {activeTab === "general" && !isEditMode ? (
                    <button
                      onClick={handleEditClick}
                      className="group relative flex items-center justify-center 
         h-8 w-8 rounded-full 
         bg-red-100 text-red-700 
         dark:bg-red-800 dark:text-red-300 
         hover:bg-red-200 dark:hover:bg-red-700 
         transition-all duration-300 
         ease-in-out 
         transform hover:scale-105 
         focus:outline-none 
         focus:ring-2 
         focus:ring-offset-2 
         focus:ring-red-300"
                      aria-label="Edit"
                    >
                      <Edit2 className="h-4 w-4 transition-transform group-hover:rotate-6" />
                    </button>
                  ) : null}
                </CardTitle>

                <CardDescription>
                  Manage your workspace core details
                </CardDescription>

              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label>Workspace Name</Label>
                    <Input
                      value={settings?.name}
                      onChange={(e) =>
                        setSettings({ ...settings, name: e.target.value })
                      }
                      disabled={!isEditMode}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Industry</Label>
                    <Select
                      disabled={!isEditMode}
                      value={settings?.industry || ''} // Changed from settings?.name
                      onValueChange={(value) => {
                        setSettings({ ...settings, industry: value })
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Industry" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Technology">Technology</SelectItem>
                        <SelectItem value="Finance">Finance</SelectItem>
                        <SelectItem value="Healthcare">Healthcare</SelectItem>
                        <SelectItem value="Education">Education</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Company Size</Label>
                    <Select
                      disabled={!isEditMode}
                      value={settings?.company_size}
                      onValueChange={(value) =>
                        setSettings({ ...settings, company_size: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Size" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1-50">1-50</SelectItem>
                        <SelectItem value="51-200">51-200</SelectItem>
                        <SelectItem value="201-500">201-500</SelectItem>
                        <SelectItem value="500+">500+</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Timezone</Label>
                    <Select
                      disabled={!isEditMode}
                      value={settings?.timezone}
                      onValueChange={(value) =>
                        setSettings({ ...settings, timezone: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Timezone" />
                      </SelectTrigger>
                      <SelectContent>
                        {/* American Timezones */}
                        <SelectItem value="America/New_York">
                          Eastern Time (EST, UTC-05:00)
                        </SelectItem>
                        <SelectItem value="America/Chicago">
                          Central Time (CST, UTC-06:00)
                        </SelectItem>
                        <SelectItem value="America/Denver">
                          Mountain Time (MST, UTC-07:00)
                        </SelectItem>
                        <SelectItem value="America/Los_Angeles">
                          Pacific Time (PST, UTC-08:00)
                        </SelectItem>

                        {/* European Timezones */}
                        <SelectItem value="Europe/London">
                          Greenwich Mean Time (GMT, UTC+00:00)
                        </SelectItem>
                        <SelectItem value="Europe/Paris">
                          Central European Time (CET, UTC+01:00)
                        </SelectItem>
                        <SelectItem value="Europe/Moscow">
                          Moscow Standard Time (MSK, UTC+03:00)
                        </SelectItem>

                        {/* Asian Timezones */}
                        <SelectItem value="Asia/Kolkata">
                          India Standard Time (IST, UTC+05:30)
                        </SelectItem>
                        <SelectItem value="Asia/Tokyo">
                          Japan Standard Time (JST, UTC+09:00)
                        </SelectItem>
                        <SelectItem value="Asia/Shanghai">
                          China Standard Time (CST, UTC+08:00)
                        </SelectItem>
                        <SelectItem value="Asia/Dubai">
                          Gulf Standard Time (GST, UTC+04:00)
                        </SelectItem>

                        {/* Australian Timezones */}
                        <SelectItem value="Australia/Sydney">
                          Australian Eastern Time (AET, UTC+10:00)
                        </SelectItem>
                        <SelectItem value="Australia/Adelaide">
                          Australian Central Time (ACT, UTC+09:30)
                        </SelectItem>
                        <SelectItem value="Australia/Perth">
                          Australian Western Time (AWT, UTC+08:00)
                        </SelectItem>

                        {/* African Timezones */}
                        <SelectItem value="Africa/Johannesburg">
                          South Africa Standard Time (SAST, UTC+02:00)
                        </SelectItem>
                        <SelectItem value="Africa/Cairo">
                          Eastern European Time (EET, UTC+02:00)
                        </SelectItem>

                        {/* South American Timezones */}
                        <SelectItem value="America/Sao_Paulo">
                          Brasilia Time (BRT, UTC-03:00)
                        </SelectItem>
                        <SelectItem value="America/Argentina/Buenos_Aires">
                          Argentina Time (ART, UTC-03:00)
                        </SelectItem>

                        {/* Other Timezones */}
                        <SelectItem value="Pacific/Auckland">
                          New Zealand Standard Time (NZST, UTC+12:00)
                        </SelectItem>
                        <SelectItem value="Pacific/Honolulu">
                          Hawaii-Aleutian Time (HST, UTC-10:00)
                        </SelectItem>
                        <SelectItem value="UTC">
                          Coordinated Universal Time (UTC, UTC+00:00)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                </div>
              </CardContent>
            </Card>
          )}

          {/* Members Management */}
          {activeTab === "members" && (
            <MemberManagement
              isLoading={isLoadingMembers}
              members={members}
              onMemberAdd={handleMemberAdd}
              onMemberDelete={handleMemberDelete}
              onMemberUpdate={handleMemberUpdate}
              onInviteResend={resendInviteToMember}
              isAdding={isAdding}
              isDeleting={isDeleting}
              isResending={isResending}
            />
          )}
          {/* Notifications Settings */}
          {activeTab === "notifications" && (
            <Card>
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>
                  Configure how you receive updates
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2">
                    <div className="space-y-0.5">
                      <Label>Email Notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Receive updates via email
                      </p>
                    </div>
                    <Switch
                      checked={settings?.notifications.email}
                      onCheckedChange={(checked) =>
                        setSettings({
                          ...settings,
                          notifications: {
                            ...settings?.notifications,
                            email: checked,
                          },
                        })
                      }
                    />
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2">
                    <div className="space-y-0.5">
                      <Label>SMS Notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Get updates via text message
                      </p>
                    </div>
                    <Switch
                      checked={settings?.notifications?.sms}
                      onCheckedChange={(checked) =>
                        setSettings({
                          ...settings,
                          notifications: {
                            ...settings?.notifications,
                            sms: checked,
                          },
                        })
                      }
                    />
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2">
                    <div className="space-y-0.5">
                      <Label>In-App Notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Show notifications in the application
                      </p>
                    </div>
                    <Switch
                      checked={settings?.notifications?.inApp}
                      onCheckedChange={(checked) =>
                        setSettings({
                          ...settings,
                          notifications: {
                            ...settings?.notifications,
                            inApp: checked,
                          },
                        })
                      }
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Security Settings */}
          {activeTab === "security" && (
            <Card>
              <CardHeader>
                <CardTitle>Security Settings</CardTitle>
                <CardDescription>
                  Manage workspace security and authentication
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2">
                    <div className="space-y-0.5">
                      <Label>Two-Factor Authentication</Label>
                      <p className="text-sm text-muted-foreground">
                        Require 2FA for all workspace members
                      </p>
                    </div>
                    <Switch
                      checked={settings?.security?.twoFactor}
                      onCheckedChange={(checked) =>
                        setSettings({
                          ...settings,
                          security: {
                            ...settings?.security,
                            twoFactor: checked,
                          },
                        })
                      }
                    />
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2">
                    <div className="space-y-0.5">
                      <Label>IP Address Restriction</Label>
                      <p className="text-sm text-muted-foreground">
                        Limit access to specific IP addresses
                      </p>
                    </div>
                    <Switch
                      checked={settings?.security?.ipRestriction}
                      onCheckedChange={(checked) =>
                        setSettings({
                          ...settings,
                          security: {
                            ...settings?.security,
                            ipRestriction: checked,
                          },
                        })
                      }
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Status Management */}
          <div>
            {activeTab === "status" && (
              <Card>
                <CardHeader>
                  <CardTitle>Status Management</CardTitle>
                  <CardDescription>
                    Create and manage status options for your workspace
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Add Status Button */}
                  <div className="flex justify-end">
                    <Button
                      onClick={() => setIsAddingStatus(true)}
                      className="flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Add New Status
                    </Button>
                  </div>

                  {/* Status List */}
                  <div className="space-y-4">
                    <div className="grid gap-4">
                      {statuses.map((status: Status) => (
                        <div
                          key={status.id}
                          className="flex flex-col sm:flex-row items-center gap-4 p-4 bg-secondary rounded-lg"
                        >
                          <div className="flex items-center gap-4 flex-1">
                            <div className="flex items-center gap-2">
                              <div
                                className="relative"
                                style={{ display: 'inline-flex', alignItems: 'center' }}
                              >
                                <div
                                  className="w-3 h-3 rounded-full absolute"
                                  style={{
                                    backgroundColor: status?.color,
                                    filter: `blur(4px)`,
                                    opacity: 0.7,
                                  }}
                                />
                                <div
                                  className="w-3 h-3 rounded-full relative"
                                  style={{
                                    backgroundColor: status?.color,
                                  }}
                                />
                              </div>
                              <span className="text-foreground text-gray-600">{status.name}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 flex-wrap justify-end">
                            <div className="flex items-center gap-2">
                              <Checkbox

                                checked={status?.count_statistics}
                                disabled
                              />
                              <Label className="text-sm">Count As Qualified</Label>
                            </div>
                            {/* <div className="flex items-center gap-2">
                              <Checkbox
                                checked={status?.workspace_show}
                                disabled
                              />
                              <Label className="text-sm">Show in workspace</Label>
                            </div> */}
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => handleEditStatus(status)}
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive/90"
                                onClick={() => setStatusToDelete(status)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Save Button */}
        {activeTab === "general" && isEditMode && (
          <div className="flex justify-end gap-4 pt-6">
            <Button
              variant="outline"
              onClick={handleCancelEdit}
              disabled={isSaving}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="w-full sm:w-auto"
            >
              {isSaving ? (
                <div className="flex items-center">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </div>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Delete Member Confirmation Dialog */}
      <AlertDialog
        open={!!memberToDelete}
        onOpenChange={() => setMemberToDelete(null)}
      >
        <AlertDialogContent className="sm:max-w-[425px]">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove{" "}
              {memberToDelete?.name || memberToDelete?.email} from the
              workspace? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:flex-row sm:justify-end gap-2">
            <AlertDialogCancel className="sm:w-auto">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteMember}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 sm:w-auto"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Status Dialog */}
      <Dialog open={isAddingStatus} onOpenChange={setIsAddingStatus}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Status</DialogTitle>
            <DialogDescription>
              Create a new status for your workspace
            </DialogDescription>
          </DialogHeader>
          <StatusForm
            status={newStatus}
            onSubmit={setNewStatus}
          // onCancel={() => setIsAddingStatus(false)}
          />
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setIsAddingStatus(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddStatus}
              className="flex items-center gap-2"
              disabled={isAddingStat} // Disable while loading
            >
              {isAddingStat ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="animate-spin w-4 h-4" />
                  <span>Adding...</span>
                </div>
              ) : (
                "Add Status"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Status Dialog */}
      <Dialog
        open={!!statusToEdit}
        onOpenChange={(open) => !open && setStatusToEdit(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Status</DialogTitle>
            <DialogDescription>
              Modify the status settings
            </DialogDescription>
          </DialogHeader>
          {statusToEdit && (
            <>
              <StatusForm
                status={statusToEdit}
                onSubmit={setStatusToEdit}
              // onCancel={() => setStatusToEdit(null)}
              />
              <DialogFooter className="gap-2">
                <Button
                  variant="outline"
                  onClick={() => setStatusToEdit(null)}
                >
                  Cancel
                </Button>
                <Button onClick={handleUpdateStatus}> {isUpdatingStatus ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Updated Status"
                )}</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Status Confirmation Dialog */}
      <AlertDialog
        open={!!statusToDelete}
        onOpenChange={() => setStatusToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete Status</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the status &quot;{statusToDelete?.name}&quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteStatus}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeletingStatus ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Status"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}