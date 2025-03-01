"use client";
import Image from "next/image";
import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Users,
  MessageSquare,
  Phone,
  BarChart,
  Settings,
  Menu,
  X,
  UserCircle,
  LogOut,
  ChevronDown,
  Plus,
  Podcast,
  SquareCode,
  Folder,
  Contact,
  Bell,
  Trash2,
  Zap,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { redirect, usePathname } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  useCreateWorkspaceMutation,
  useGetActiveWorkspaceQuery,
  useGetWorkspacesByOwnerIdQuery,
  useGetWorkspacesQuery,
  useUpdateWorkspaceStatusMutation,
} from "@/lib/store/services/workspace";
import { useGetStatusQuery } from "@/lib/store/services/status";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useGetLeadsByWorkspaceQuery } from "@/lib/store/services/leadsApi";
import { useParams } from "next/navigation";
import { ThemeToggle } from "../theme-toggle";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { skipToken } from "@reduxjs/toolkit/query";

import { RootState } from "@/lib/store/store";
import { toggleCollapse, setCollapse } from "@/lib/store/slices/sideBar";
import { useDispatch, useSelector } from "react-redux";
import { workerData } from "worker_threads";

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
  logoSrc?: string;
  logoAlt?: string;
  isOpen?: boolean;
  setIsOpen: (open: boolean) => void;
}

interface Workspace {
  id: string;
  name: string;
  role: string;
  industry?: string;
  status?: boolean;
  type?: string;
}

export function Sidebar({
  className,
  logoSrc = "/logo.svg",
  logoAlt = "Company Logo",
  isOpen,
  setIsOpen,
}: SidebarProps) {
  const dispatch = useDispatch();
  const isCollapsed = useSelector(
    (state: RootState) => state.sidebar.isCollapsed
  );
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const [updateWorkspaceStatus] = useUpdateWorkspaceStatusMutation();
  const {
    data: workspacesData,
    isLoading,
    isError,
    isFetching,
    refetch,
  } = useGetWorkspacesQuery();
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [createWorkspace] = useCreateWorkspaceMutation();
  const [user, setUser] = useState<any>(null);
  // const [isOpen, setIsOpen] = useState(false);
  const [workspaces, setWorkspaces] = useState<Workspace[]>(
    workspacesData?.data || []
  );
  const [selectedWorkspace, setSelectedWorkspace] = useState(
    workspaces[0] || []
  );
  const { data: workspaceData }: any = useGetLeadsByWorkspaceQuery(
    { workspaceId: selectedWorkspace.id },
    { pollingInterval: 2000 }
  );

  const {
    data: activeWorkspace,
    isLoading: activeWorkspaceLoading,
    isError: activeWorkspaceError,
  } = useGetActiveWorkspaceQuery();
  console.log(activeWorkspace);

  // ✅ Ensure activeWorkspace is available before calling status query
  const workspaceId = activeWorkspace?.data?.id;

  // Ensure it's a number before passing it to the query
  const {
    data: statusData,
    isLoading: isLoadingStatus,
    error: statusError,
  } = useGetStatusQuery(workspaceId ? Number(workspaceId) : skipToken, {
    pollingInterval: 2000,
  });

  // **Filter Leads into Contacts**
  const contactStatuses = new Set(
    Array.isArray((statusData as any)?.data)
      ? (statusData as any)?.data
          .filter((status: any) => status.count_statistics) // ✅ Only keep statuses where count_statistics is true
          .map((status: any) => status.name)
      : []
  );

  const [newWorkspace, setNewWorkspace] = useState({
    name: "",
    industry: "",
    type: "sales",
    companySize: "",
    companyType: "",
    timezone: "",
    notifications: {
      email: true,
      sms: true,
      inApp: true,
    },
  });
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [workspaceToDelete, setWorkspaceToDelete] = useState<Workspace | null>(
    null
  );

  // Mock total leads count
  const totalLeads = workspaceData?.data?.length || "NA";

  const totalContacts = workspaceData?.data?.filter((contact: any) =>
    contactStatuses.has(contact?.status?.name)
  );
  const contactsLength = totalContacts?.length || "NA";

  const routes = [
    {
      label: "Dashboard",
      icon: LayoutDashboard,
      href: "/dashboard",
    },
    {
      label: "Leads Sources",
      icon: Users,
      href: "/leads-sources",
    },
    {
      label: "Leads",
      icon: SquareCode,
      href: "/leads",
      badge: totalLeads,
    },
    {
      label: "Contact",
      icon: MessageSquare,
      href: "/contact",
      badge: contactsLength,
    },
    {
      label: "Analytics",
      icon: BarChart,
      href: "/analytics",
    },
    // {
    //   label: "Setting",
    //   icon: Settings,
    //   href: "/setting",
    // },
  ];
  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      toast.success("Logout completed");

      window.location.href = "/login"; // Redirect with full page reload
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  useEffect(() => {
    const fetchUser = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (data) setUser(data.user);
      if (error) toast.error("Error fetching user data:", error.message as any);
    };
    fetchUser();
  }, []);

  const handleAddWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newWorkspace.name) {
      const newWorkspaceItem = {
        id: (workspaces.length + 1).toString(),
        name: newWorkspace.name,
        role: "Admin",
      };
      console.log(newWorkspace.companyType, newWorkspace.companySize);
      try {
        await createWorkspace({
          name: newWorkspace.name,
          status: true,
          companyType: newWorkspace.companyType,
          companySize: newWorkspace.companySize,
          industry: newWorkspace.industry,
          type: newWorkspace.type,
          timezone: newWorkspace.timezone,
          notifications: newWorkspace.notifications,
        }).unwrap();
        setWorkspaces([...workspaces, newWorkspaceItem]);
        setSelectedWorkspace(newWorkspaceItem);

        setNewWorkspace({
          name: "",
          industry: "",
          type: "sales",
          companySize: "",
          companyType: "",
          timezone: "",
          notifications: {
            email: true,
            sms: true,
            inApp: true,
          },
        });
        toast.success("Workspace created successfully");
        setDialogOpen(false);
        window.location.reload();
      } catch (error: any) {
        toast.error(error.data.error);
      }
    }
  };
  useEffect(() => {
    if (activeWorkspace?.data) {
      setSelectedWorkspace(activeWorkspace.data);
    }
  }, [activeWorkspace]);

  const handleEditWorkspace = (workspace: Workspace) => {
    router.push(`/workspace/${workspace.id}`);
  };

  useEffect(() => {
    const fetchUser = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (data) setUser(data.user?.user_metadata);
      if (error) console.error("Error fetching user data:", error);
    };
    fetchUser();
  }, []);
  useEffect(() => {
    if (workspacesData?.data) {
      setWorkspaces(workspacesData.data);
    }
  }, [workspacesData?.data]);

  const handleWorkspaceChange = async (workspaceId: string) => {
    try {
      const workspace = workspaces.find((w) => w.id === workspaceId);
      if (!workspace) return;

      await updateWorkspaceStatus({ id: workspaceId, status: true });
      setSelectedWorkspace(workspace);

      // Refetch all relevant data
      await refetch();
      
      // Redirect to appropriate page
      if (window.location.href.includes('workspace')) {
        await router.push(`/workspace/${workspaceId}`);
      } else if (window.location.href.includes("dashboard")) {
        await router.push(`/dashboard`);
      } else if (window.location.href.includes("leads-sources")) {
        await router.push(`/leads-sources`);
      } else if (window.location.href.includes("leads")) {
        await router.push(`/leads`);
      } else if (window.location.href.includes("analytics")) {
        await router.push(`/analytics`);
      }

      // Force a page reload to ensure all data is fresh
      window.location.reload();
    } catch (error) {
      console.error("Failed to change workspace:", error);
      toast.error("Failed to change workspace");
    }
  };
  return (
    <>
      {/* Mobile Menu Button */}
      {/* <Button
        variant="outline"
        size="icon"
        className="md:hidden fixed top-4 left-4 z-50 bg-white dark:bg-slate-900 dark:text-white dark:border-slate-700"
        // onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </Button> */}

      {/* Sidebar */}
      <div
        className={cn(
          "fixed top-0 left-0 h-full bg-white dark:bg-slate-900 dark:text-white shadow-lg transform transition-all duration-300 ease-in-out",
          "md:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
          isCollapsed ? "w-[80px]" : "w-64",
          className
        )}
      >
        {/* Collapse Toggle Button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute -right-4 top-6 hidden md:flex h-8 w-8 rounded-full bg-white dark:bg-slate-800 shadow-md"
          onClick={() => dispatch(toggleCollapse())}
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>

        {/* Logo Section */}
        <div className="flex items-center justify-center py-4 bg-inherit">
          <a
            href="/dashboard"
            className="flex items-center gap-2 hover:opacity-90 transition-opacity"
          >
            <Zap className="h-6 w-6 text-primary" />
            {!isCollapsed && (
              <span className="text-xl font-bold">SCRAFT PRE CRM</span>
            )}
          </a>
          <Button
            variant="outline"
            size="icon"
            className="md:hidden lg:hidden ml-2 bg-white dark:bg-slate-900 dark:text-white dark:border-slate-700"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen && <X className="h-6 w-6" />}
          </Button>
        </div>

        {/* Workspace Selector */}
        <div className={cn("px-4 mb-4", isCollapsed && "px-2")}>
          {isCollapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="w-full"
                  onClick={() => {
                    setIsOpen(!isOpen), dispatch(toggleCollapse());
                  }}
                >
                  <Folder className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>{selectedWorkspace?.name || "Select workspace"}</p>
              </TooltipContent>
            </Tooltip>
          ) : (
            <Select
              value={selectedWorkspace?.id || ""}
              onValueChange={handleWorkspaceChange}
            >
              <SelectTrigger
                className="w-full"
                // onClick={() => setIsOpen(!isOpen)}
              >
                <SelectValue placeholder="Select a workspace">
                  <div className="flex items-center">
                    <Folder className="mr-2 h-4 w-4" />
                    {selectedWorkspace?.name || "Select a workspace"}
                  </div>
                </SelectValue>
              </SelectTrigger>
              <SelectContent position="popper" className="z-[100]">
                {workspaces?.map((workspace) => (
                  <SelectItem
                    key={workspace.id}
                    value={workspace.id}
                    className="relative flex items-center py-2 cursor-pointer"
                    onClick={() => setIsOpen(!isOpen)}
                  >
                    <div className="flex items-center flex-1 mr-8">
                      <Folder className="shrink-0 mr-2 h-4 w-4" />
                      <span className="break-words">{workspace.name}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
                      onClick={() => setIsOpen(!isOpen)}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleEditWorkspace(workspace);
                      }}
                    >
                      <Settings className="h-4 w-4 text-slate-500 hover:text-slate-800" />
                    </Button>
                  </SelectItem>
                ))}
                {/* Add Workspace Dialog */}
                <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
                  <DialogTrigger asChild>
                    <div className="flex items-center p-2 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Workspace
                    </div>
                  </DialogTrigger>
                  <DialogContent className="w-[90%] max-w-md">
                    <DialogHeader>
                      <DialogTitle>Create New Workspace</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleAddWorkspace} className="space-y-4">
                      <div>
                        <Label htmlFor="workspaceName">Workspace Name</Label>
                        <Input
                          id="workspaceName"
                          value={newWorkspace.name}
                          onChange={(e) =>
                            setNewWorkspace({
                              ...newWorkspace,
                              name: e.target.value,
                            })
                          }
                          placeholder="Enter workspace name"
                          required
                        />
                      </div>
                      <div>
                        <Label>Workspace Type</Label>
                        <Select
                          value={newWorkspace.type}
                          onValueChange={(value) =>
                            setNewWorkspace({
                              ...newWorkspace,
                              type: value,
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select workspace type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="sales">Sales</SelectItem>
                            <SelectItem value="marketing">Marketing</SelectItem>
                            <SelectItem value="support">Support</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Company Size</Label>
                        <Select
                          value={newWorkspace.companySize}
                          onValueChange={(value) =>
                            setNewWorkspace({
                              ...newWorkspace,
                              companySize: value,
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select company size" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1-50">1-50</SelectItem>
                            <SelectItem value="51-200">51-200</SelectItem>
                            <SelectItem value="201-500">201-500</SelectItem>
                            <SelectItem value="500+">500+</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="companyType">Company Type</Label>
                        <Select
                          value={newWorkspace.companyType}
                          onValueChange={(value) =>
                            setNewWorkspace({
                              ...newWorkspace,
                              companyType: value,
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select company type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="startup">Startup</SelectItem>
                            <SelectItem value="enterprise">
                              Enterprise
                            </SelectItem>
                            <SelectItem value="agency">Agency</SelectItem>
                            <SelectItem value="nonprofit">Nonprofit</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="industry">Industry</Label>
                        <Select
                          value={newWorkspace.industry}
                          onValueChange={(value) =>
                            setNewWorkspace({
                              ...newWorkspace,
                              industry: value,
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select industry" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Technology">
                              Technology
                            </SelectItem>
                            <SelectItem value="Finance">Finance</SelectItem>
                            <SelectItem value="Healthcare">
                              Healthcare
                            </SelectItem>
                            <SelectItem value="Education">Education</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button type="submit" className="w-full">
                        Create Workspace
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Navigation Routes */}
        <div className="space-y-4 py-4 px-3">
          <div className="space-y-1">
            {routes.map((route) => (
              <Tooltip key={route.href}>
                <TooltipTrigger asChild>
                  <Button
                    variant={pathname === route.href ? "secondary" : "ghost"}
                    className={cn(
                      "w-full justify-start hover:bg-slate-100 dark:hover:bg-slate-700 dark:text-white dark:hover:text-white relative",
                      isCollapsed && "justify-center px-2"
                    )}
                    onClick={() => setIsOpen(false)}
                    asChild
                  >
                    <Link href={route.href}>
                      <route.icon className="h-4 w-4 text-slate-600 dark:text-slate-300" />
                      {!isCollapsed && (
                        <>
                          <span className="ml-2">{route.label}</span>
                          {route.badge && (
                            <Badge
                              variant="secondary"
                              className="ml-auto bg-blue-100 text-blue-800"
                            >
                              {route.badge}
                            </Badge>
                          )}
                        </>
                      )}
                    </Link>
                  </Button>
                </TooltipTrigger>
                {isCollapsed && (
                  <TooltipContent side="right">
                    <p>{route.label}</p>
                    {route.badge && (
                      <span className="ml-2">({route.badge})</span>
                    )}
                  </TooltipContent>
                )}
              </Tooltip>
            ))}
          </div>
        </div>

        {/* User Profile Section */}
        <div className="absolute bottom-0 p-4 border-t flex items-center left-0 w-full bg-slate-50 dark:bg-slate-800 dark:border-slate-700">
          {isCollapsed ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="w-full h-10 p-0">
                  <div className="relative w-10 h-10 rounded-full overflow-hidden">
                    <Image
                      src={user?.avatar || "/placeholder-avatar.jpg"}
                      alt={`${user?.name || "User"}'s profile`}
                      width={40}
                      height={40}
                      className="object-cover"
                    />
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-60 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                {/* User Info */}
                <div className="px-4 py-3 text-sm">
                  <p className="font-semibold text-base">
                    {user?.name ||
                      `${user?.firstName || ""} ${
                        user?.lastName || ""
                      }`.trim() ||
                      "User"}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {user?.email || "Email not available"}
                  </p>
                </div>

                {/* Divider */}
                <div className="border-t border-slate-200 dark:border-slate-700"></div>

                {/* Account Settings */}
                <Link href="/profile">
                  <DropdownMenuItem className="flex items-center gap-3 px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer">
                    <Settings className="h-4 w-4 text-slate-600 dark:text-slate-300" />
                    <span>Account Settings</span>
                  </DropdownMenuItem>
                </Link>

                {/* Theme Toggle */}
                <DropdownMenuItem className="flex items-center  px-1 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer">
                  <ThemeToggle />
                  <span>Toggle Theme</span>
                </DropdownMenuItem>

                {/* Logout */}
                <DropdownMenuItem
                  className="flex items-center gap-3 px-4 py-2 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-800 transition-colors cursor-pointer"
                  onClick={handleLogout}
                >
                  <LogOut className="h-4 w-4" />
                  <span>Logout</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center space-x-3 overflow-hidden w-full justify-between">
              <div className="flex items-center space-x-3 overflow-hidden">
                <div className="relative w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                  <Image
                    src={user?.avatar}
                    alt={`${user?.name || "User"}'s profile`}
                    width={40}
                    height={40}
                    className="object-cover w-full h-full rounded-full"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">
                    {user?.firstName + " " + user?.lastName || user?.name}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {user?.email || "Email not available"}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <ThemeToggle />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="w-56 dark:bg-slate-800 dark:text-white dark:border-slate-700 z-[101]"
                  >
                    <Link href="/profile">
                      <DropdownMenuItem className="dark:hover:bg-slate-700 cursor-pointer">
                        <Settings className="mr-2 h-4 w-4" />
                        <span>Account Settings</span>
                      </DropdownMenuItem>
                    </Link>
                    <DropdownMenuItem
                      className="text-red-600 dark:text-red-400 dark:hover:bg-slate-700 cursor-pointer"
                      onClick={handleLogout}
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Logout</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Overlay */}
      {/* {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )} */}
    </>
  );
}
