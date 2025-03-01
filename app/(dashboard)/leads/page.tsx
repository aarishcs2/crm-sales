"use client";
import {
  Filter,
  Loader2,
  UserIcon,
  ListFilter,
  SquareCode,
} from "lucide-react";
import FilterComponent from "./filter";
import { useGetWebhooksBySourceIdQuery } from "@/lib/store/services/webhooks";
import Papa from "papaparse";
import React, { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Plus,
  Pencil,
  Trash2,
  FileDown,
  FileUp,
  Phone,
  MessageCircle,
  Send,
  Eye,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import * as XLSX from "xlsx";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CRM_MESSAGES } from "@/lib/constant/crm";
import {
  useGetLeadsByWorkspaceQuery,
  useUpdateLeadMutation,
  useUpdateLeadDataMutation,
  useAssignRoleMutation,
  useBulkDeleteLeadsMutation,
  useCreateLeadMutation,
  useCreateManyLeadMutation,
  // useGetLeadsSourceQuery,
} from "@/lib/store/services/leadsApi";
import {
  useGetActiveWorkspaceQuery,
  useGetWorkspaceMembersQuery,
} from "@/lib/store/services/workspace";
import { useGetStatusQuery } from "@/lib/store/services/status";
import { CardDescription } from "@/components/ui/card";
import { calculateDaysAgo } from "@/utils/diffinFunc";
import { toggleCollapse, setCollapse } from "@/lib/store/slices/sideBar";
import { useSelector } from "react-redux";
import { RootState } from "@/lib/store/store";
import { X } from "lucide-react";
import { formatDate } from "@/utils/date";
import { useGetWebhooksQuery } from "@/lib/store/services/webhooks";
import { skipToken } from "@reduxjs/toolkit/query";

// Zod validation schema for lead
const leadSchema = z.object({
  name: z.string().min(2, { message: "First name is required" }),
  email: z.string().email({ message: "Invalid email address" }),
  phone: z.string().regex(/^\+?[1-9]\d{9,14}$/, "Invalid phone number"),
  company: z.string().optional(),
  position: z.string().optional(),
  contact_method: z.enum(["WhatsApp", "SMS", "Call"], {
    required_error: "Please select a contact method",
  }),
  revenue: z.number().optional(),
});

const initialFilters: any = {
  leadSource: "",
  owner: "",
  status: "",
  contact_method: "",
  contactType: "",
  startDate: "",
  endDate: "",
  showDuplicates: false,
};

const LeadManagement: React.FC = () => {
  const isCollapsed = useSelector(
    (state: RootState) => state.sidebar.isCollapsed
  );
  const [createLead, { isLoading: isCreateLoading, error: leadCreateError }] =
    useCreateLeadMutation();
  const [
    createManyLead,
    { isLoading: isCreateManyLoading, error: leadCreateManyError },
  ] = useCreateManyLeadMutation();
  const [
    updateLeadData,
    { isLoading: isUpdateLoading, error: leadUpdateError },
  ] = useUpdateLeadDataMutation();
  const [updateLead] = useUpdateLeadMutation();
  const [searchQuery, setSearchQuery] = useState("");
  const [assignRole, { isLoading: isAssignLoading, error: roleAssignError }] =
    useAssignRoleMutation();
  const [expandedRow, setExpandedRow] = useState(null);
  const toggleRow = (id: any) => {
    setExpandedRow(expandedRow === id ? null : id);
  };
  const [deleteLeadsData] = useBulkDeleteLeadsMutation();
  const { data: activeWorkspace, isLoading: isLoadingWorkspace } =
    useGetActiveWorkspaceQuery();
  const workspaceId = activeWorkspace?.data?.id;

  // Fetch lead sources
  const {
    data: leadSources,
    error,
    isLoading,
  } = useGetWebhooksQuery({ id: workspaceId });

  console.log(leadSources);

  const { data: workspaceData, isLoading: isLoadingLeads }: any =
    useGetLeadsByWorkspaceQuery(
      workspaceId
        ? ({ workspaceId: workspaceId.toString() } as { workspaceId: string }) // Provide workspaceId if it exists
        : ({} as { workspaceId: string }), // Fallback empty object if workspaceId is undefined
      {
        skip: !workspaceId || isLoadingWorkspace, // Skip fetching if workspaceId is missing or loading
        pollingInterval: 10000, // Poll every 2 seconds (2000 ms)
      }
    );
  const { data: workspaceMembers, isLoading: isLoadingMembers } =
    useGetWorkspaceMembersQuery(workspaceId);

  const POLLING_INTERVAL = 10000;
  const { data: statusData, isLoading: isLoadingStatus }: any =
    useGetStatusQuery(workspaceId);

  useEffect(() => {
    const fetchLeads = () => {
      if (!isLoadingLeads && workspaceData?.data) {
        let fetchedLeads = workspaceData?.data.map(
          (lead: any, index: number) => ({
            id: lead.id || index + 1,
            Name: lead.name || "",
            email: lead.email || "",
            phone: lead.phone || "",
            company: lead.company || "",
            position: lead.position || "",
            contact_method: lead.contact_method,
            owner: lead.owner || "Unknown",
            status: lead.status || "New",
            revenue: lead.revenue || 0,
            assign_to: lead.assign_to || "Not Assigned",
            createdAt: lead.created_at
              ? new Date(lead.created_at).toISOString()
              : new Date().toISOString(),
            isDuplicate: false, // Ensure valid date format
            is_email_valid: lead.is_email_valid,
            is_phone_valid: lead.is_phone_valid,
            sourceId: lead.lead_source_id || null, // Assuming sourceId is part of the lead
          })
        );

        const duplicates = new Set();
        fetchedLeads.forEach((lead: any) => {
          const duplicate = fetchedLeads.find(
            (l: any) =>
              l.id !== lead.id &&
              (l.email === lead.email || l.phone === lead.phone)
          );
          if (duplicate) {
            duplicates.add(lead.id);
            duplicates.add(duplicate.id);
          }
        });

        // Mark duplicates
        const updatedLeads = fetchedLeads.map((lead: any) => ({
          ...lead,
          isDuplicate: duplicates.has(lead.id),
        }));

        // Sort by most recent
        setLeads(
          updatedLeads.sort(
            (a: any, b: any) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )
        );
      }
    };
    // Initial fetch
    fetchLeads();

    // Set up polling
    const pollInterval = setInterval(fetchLeads, POLLING_INTERVAL);

    // Cleanup
    return () => clearInterval(pollInterval);
  }, [workspaceData, isLoadingLeads]);

  const router = useRouter();
  const [showFilters, setShowFilters] = useState(false);

  const [filters, setFilters] = useState<any>(initialFilters);
  const [leads, setLeads] = useState<any[]>([]);

  const handleFilterReset = () => {
    setFilters(initialFilters);
    setShowFilters(false);
  };

  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      if (searchQuery) {
        const searchText = searchQuery.toLowerCase();
        const searchableFields = [
          lead.Name,
          lead.email,
          lead.phone,
          lead.company,
          lead.position,
          lead.status?.name,
          lead.assign_to?.name,
        ];

        const matchesSearch = searchableFields.some(
          (field) =>
            field && field.toString().toLowerCase().includes(searchText)
        );

        if (!matchesSearch) return false;
      }
      // Owner filter
      if (filters.owner && !lead.assign_to.name?.includes(filters.owner))
        return false;

      // Step 1: Find the leadSourceId
      let leadSourceId = leadSources?.data.find(
        (source: any) => source?.name === filters?.leadsSource
      )?.id;

      // Step 2: Find the webhook_url in workspaceData based on leadSourceId
      let webhook_url = leadSources?.data.find(
        (entry: any) => entry?.id === leadSourceId
      )?.webhook_url;

      // Step 3: Extract sourceId from webhook_url
      let sourceId: string | null = null;
      if (webhook_url) {
        const urlParams = new URLSearchParams(webhook_url.split("?")[1]);
        leadSourceId = urlParams.get("sourceId");
      }

      // Apply leadSource filter if needed
      if (
        filters.leadsSource &&
        filters.leadsSource !== "all" &&
        leadSourceId
      ) {
        if (lead.sourceId !== leadSourceId) return false;
      }
      // Status filter (Fixing the bug where old data persists)
      if (filters.status && lead.status?.name !== filters.status) return false;

      // Contact Method filter
      if (
        filters.contact_method &&
        lead.contact_method !== filters.contact_method
      )
        return false;

      // Contact Type filter (Ensure it checks correct field)
      if (filters.contactType) {
        if (filters.contactType === "phone" && !lead.phone) return false;
        if (filters.contactType === "email" && !lead.email) return false;
        if (filters.contactType === "id" && !lead.id) return false;
      }

      // Date range filter
      if (
        filters.startDate &&
        new Date(lead.createdAt) < new Date(filters.startDate)
      )
        return false;
      if (
        filters.endDate &&
        new Date(lead.createdAt) > new Date(filters.endDate)
      )
        return false;

      // Duplicate check
      if (filters.showDuplicates) {
        const duplicates = leads.filter(
          (l) => l.email === lead.email || l.phone === lead.phone
        );
        if (duplicates.length <= 1) return false;
      }

      return true;
    });
  }, [leads, filters, searchQuery, leadSources]);

  const handleFilterChange = (newFilters: any) => {
    setFilters(newFilters);
  };

  const [selectedLeads, setSelectedLeads] = useState<number[]>([]);
  const [dialogMode, setDialogMode] = useState<
    "create" | "edit" | "delete" | null
  >(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [editingLead, setEditingLead] = useState<any>(null);

  // Pagination
  const leadsPerPage = 10;
  const totalPages = Math.ceil(leads.length / leadsPerPage);

  // Paginated leads
  // const paginatedLeads = useMemo(() => {
  //   const startIndex = (currentPage - 1) * leadsPerPage;
  //   return leads.slice(startIndex, startIndex + leadsPerPage);
  // }, [leads, currentPage]);

  const paginatedLeads = leads;
  // Form setup
  const form = useForm<z.infer<typeof leadSchema>>({
    resolver: zodResolver(leadSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      company: "",
      position: "",
      contact_method: undefined,
      revenue: 0,
    },
  });

  // Reset dialog state
  const resetDialog = () => {
    form.reset({
      name: "",
      email: "",
      phone: "",
      company: "",
      position: "",
      contact_method: undefined,
      revenue: 0,
    });
    setEditingLead(null);
    setDialogMode(null);
  };

  // Open create dialog
  const openCreateDialog = () => {
    resetDialog();
    setDialogMode("create");
  };

  // Open edit dialog
  const openEditDialog = (lead: any) => {
    form.reset({
      name: lead.Name,
      email: lead.email,
      phone: lead.phone,
      company: lead.company,
      position: lead.position,
      contact_method: lead.contact_method,
      revenue: lead.revenue,
    });
    setEditingLead(lead);
    setDialogMode("edit");
  };

  // Handle form submission
  const onSubmit = async (data: z.infer<typeof leadSchema>) => {
    if (dialogMode === "create") {
      try {
        const response = await createLead({
          workspaceId: workspaceId,
          body: data,
        });

        if (response.error) {
          let errorMessage = "An unknown error occurred";
          let errorParts: string[] = [];

          if ("data" in response.error && response.error.data) {
            errorMessage = JSON.stringify(response.error.data);
            errorParts = errorMessage.split(":");
          } else if ("error" in response.error) {
            errorMessage = response.error.error;
            errorParts = errorMessage.split(":");
          }

          if (errorParts.length > 1) {
            errorMessage = errorParts[1].trim().replace(/["}]/g, "");
          }

          toast.error(errorMessage);
          resetDialog();
          return;
        }

        setLeads([
          ...leads,
          {
            ...data,
            company: data.company || "",
            position: data.position || "",
            revenue: data.revenue || 0,
          },
        ]);

        toast.success("Lead created successfully");
        resetDialog();
      } catch (error) {
        console.error(error);
        toast.error("An error occurred while creating the lead.");
      }
    } else if (dialogMode === "edit" && editingLead) {
      // Update existing lead
      try {
        updateLeadData({ id: editingLead.id, leads: data });
        setLeads((prevLeads) =>
          prevLeads.map((lead) =>
            lead.id === editingLead.id
              ? {
                  ...lead,
                  ...data,
                  company: data.company || "",
                  position: data.position || "",
                  revenue: data.revenue || 0,
                }
              : lead
          )
        );
        setEditingLead(null);
      } catch (error) {
        console.error("Error updating lead", error);
        toast.error(CRM_MESSAGES.LEAD_UPDATED_ERROR);
      }
      toast.success(CRM_MESSAGES.LEAD_UPDATED_SUCCESS);
    }
    resetDialog();
  };

  // Delete selected leads
  const handleDelete = async () => {
    try {
      const response = await deleteLeadsData({
        id: selectedLeads,
        workspaceId: workspaceId,
      }).unwrap(); // Add .unwrap() for RTK Query

      setLeads(leads.filter((lead) => !selectedLeads.includes(lead.id)));
      setSelectedLeads([]);
      setDialogMode(null);
      toast.success("Selected leads deleted successfully");
    } catch (error: any) {
      // Log the error to see its structure
      console.error("Delete error:", error);

      // RTK Query specific error handling
      const errorMessage =
        error.data?.message ||
        error.data?.error ||
        error.error ||
        "Failed to delete leads";

      toast.error(errorMessage);
    }
  };

  // Toggle lead selection
  const toggleLeadSelection = (leadId: number) => {
    setSelectedLeads((prev) =>
      prev.includes(leadId)
        ? prev.filter((id) => id !== leadId)
        : [...prev, leadId]
    );
  };

  // Deselect all leads
  const deselectAll = () => {
    setSelectedLeads([]);
  };

  // Select all leads on current page
  const toggleSelectAllOnPage = () => {
    const currentPageLeadIds = paginatedLeads.map((lead) => lead.id);
    const allSelected = currentPageLeadIds.every((id) =>
      selectedLeads.includes(id)
    );

    setSelectedLeads((prev) =>
      allSelected
        ? prev.filter((id) => !currentPageLeadIds.includes(id))
        : Array.from(new Set([...prev, ...currentPageLeadIds]))
    );
  };

  // export csv
  console.log(leads);
  const exportToCSV = () => {
    const formattedLeads = leads.map((lead) => {
      // Find the matching lead source based on sourceId
      const matchedSource = leadSources?.data.find((source: any) =>
        source.webhook_url.includes(lead.sourceId)
      );

      const formattedSourceDate = matchedSource
        ? new Date(matchedSource.created_at)
            .toLocaleString("en-GB", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
              hour12: false, // 24-hour format
            })
            .replace(",", "")
        : "";

      return {
        Name: lead.Name,
        email: lead.email.toLowerCase(),
        phone: lead.phone,
        company: lead.company,
        position: lead.position,
        contact_method: lead.contact_method,
        owner: lead.owner,
        status: lead.status ? String(lead?.status?.name) : "Unknown",
        revenue: lead.revenue,
        assign_to: lead.assign_to,

        createdAt: new Date(lead.createdAt)
          .toLocaleString("en-GB", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false, // 24-hour format
          })
          .replace(",", ""),

        isDuplicate: lead.isDuplicate,
        is_email_valid: lead.is_email_valid,
        is_phone_valid: lead.is_phone_valid,

        // Use the lead source name if found, otherwise set "No Source"
        source: matchedSource
          ? `${matchedSource.name}-${formattedSourceDate}`
          : "No Source",
      };
    });
    const worksheet = XLSX.utils.json_to_sheet(formattedLeads);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Leads");
    XLSX.writeFile(workbook, "leads_export.csv");
  };

  // Export to JSON
  const exportToJSON = () => {
    const dataStr = JSON.stringify(leads, null, 2);
    const dataUri =
      "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);
    const exportFileDefaultName = "leads_export.json";

    const linkElement = document.createElement("a");
    linkElement.setAttribute("href", dataUri);
    linkElement.setAttribute("download", exportFileDefaultName);
    linkElement.click();
  };

  // Import leads

  const handleImportCSV = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const csvData = e.target?.result as string;

        Papa.parse(csvData, {
          header: true,
          skipEmptyLines: true,
          complete: async (result: any) => {
            const normalizedData = result.data.map((lead: any) => ({
              id: lead.id,
              name: lead.Name?.trim() || "",

              email: lead.email,
              phone: String(lead.phone)
                .replace(/[^\d+]/g, "")
                .replace(/^([^+])/, "+$1")
                .trim(),
              company: lead.company || "",
              position: lead.position || "",
              contact_method: lead.contact_method || "",
              owner: lead.owner || "Unknown",
              status: lead.status || "Pending",
              revenue: Number(lead.revenue) || 0,
              assign_to: lead.assign_to || "",
              createdAt: lead.createdAt
                ? new Date(lead.createdAt).toISOString()
                : new Date().toISOString(),

              isDuplicate: lead.isDuplicate === "TRUE",
              is_email_valid: lead.is_email_valid === "TRUE",
              is_phone_valid: lead.is_phone_valid === "TRUE",
              sourceId: lead.sourceId,
            }));

            // Validate data using Zod schema
            const validLeads = normalizedData.filter((lead: any) => {
              try {
                leadSchema.parse(lead);
                return true;
              } catch (error) {
                toast.error("Invalid leads");
                return false;
              }
            });

            if (validLeads.length === 0) {
              toast.error("No valid leads found.");
              return;
            }

            try {
              const response = await createManyLead({
                workspaceId,
                body: validLeads, // Ensure this is an array
              });

              // console.log("API Response:", response);

              setLeads((prev) => [...prev, ...validLeads]);
              toast.success("Leads created successfully");
            } catch (error) {
              toast.error("Error adding leads to database");
            }
            // Reset input value to allow re-uploading the same file
            event.target.value = "";
          },
        });
      } catch (error) {
        toast.error("Invalid file format");
      }
    };

    reader.readAsText(file);
  };

  const initiateDirectContact = (lead: any, method: string) => {
    const sanitizedPhone = lead.phone.replace(/\D/g, "");

    switch (method) {
      case "WhatsApp":
        window.open(`https://wa.me/${sanitizedPhone}`, "_blank");
        break;
      case "Call":
        window.location.href = `tel:${lead.phone}`;
        break;
      case "SMS":
        window.location.href = `sms:${lead.phone}`;
        break;
      default:
    }
  };
  const handleView = (id: number) => {
    router.push(`/leads/${id}`);
  };

  const handleStatusChange = async (id: number, value: string) => {
    const { name, color } = JSON.parse(value);

    try {
      await updateLead({ id, leads: { status: { name, color } } });

      // Update the leads state with the new status
      setLeads((prevLeads) =>
        prevLeads.map((lead) =>
          lead.id === id
            ? {
                ...lead,
                status: {
                  name,
                  color,
                },
              }
            : lead
        )
      );

      toast.success(`Lead status updated to ${name}`);
    } catch (error) {
      console.error("Error updating lead status:", error);
      toast.error("Failed to update lead status");
    }
  };

  const handleAssignChange = async (id: number, assign: string) => {
    const { name, role } = JSON.parse(assign);

    try {
      await assignRole({ id, data: { name, role } });

      // Update the leads state with the new assignment
      setLeads((prevLeads) =>
        prevLeads.map((lead) =>
          lead.id === id
            ? {
                ...lead,
                assign_to: {
                  name,
                  role,
                },
              }
            : lead
        )
      );

      toast.success(`Lead assigned to ${name}`);
    } catch (error) {
      console.error("Error assigning lead:", error);
      toast.error("Failed to assign lead");
    }
  };
  const handleGoBack = () => {
    router.push("/dashboard");
  };
  if (workspaceData?.data.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Card className="max-w-lg w-full p-8 bg-white shadow-xl rounded-lg flex flex-col items-center">
          <CardTitle className="text-2xl font-semibold text-center text-gray-800">
            No Leads Found in this Workspace
          </CardTitle>

          <CardDescription className="mt-2 text-lg text-gray-600 text-center">
            It seems there are no leads available in this workspace at the
            moment.
          </CardDescription>
          <Button
            className="mt-6 px-6 py-2 bg-primary text-white rounded-md shadow-md hover:bg-primary-dark focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            onClick={handleGoBack}
          >
            Back to Dashboard
          </Button>
        </Card>
      </div>
    );
  }
  if (isLoadingStatus || isLoadingLeads || isLoadingMembers)
    return (
      <div className="flex items-center justify-center min-h-screen overflow-hidden">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  return (
    <div
      className={`transition-all duration-500 ease-in-out md:px-4 md:py-6 py-2 px-2 ${
        isCollapsed ? "md:ml-[80px]" : "md:ml-[250px]"
      } w-auto overflow-hidden`}
    >
      {" "}
      <Card className="w-full rounded-[16px] md:rounded-[4px] overflow-hidden">
        {showFilters && (
          <FilterComponent
            values={filters}
            onChange={handleFilterChange}
            onReset={handleFilterReset}
            status={statusData?.data}
            owner={workspaceMembers?.data}
            leadSources={leadSources?.data}
          />
        )}

        <CardHeader className="grid grid-cols-6 items-center grid-rows-3 md:gap-4 md:flex md:flex-row md:justify-between p-0 md:p-3 border-b-2 border-gray-200 md:border-none">
          {/* Title */}
          <div className="md:bg-white dark:md:bg-gray-900 bg-gray-100 dark:bg-gray-800 flex items-center justify-between col-start-1 col-end-7 p-3 md:p-0">
            <div className="flex gap-2">
              <div className="md:hidden lg:hidden">
                <SquareCode />
              </div>
              <CardTitle className="flex mr-2 text-md md:text-xl lg:text-2xl text-gray-900 dark:text-gray-100">
                Lead Management
              </CardTitle>
            </div>

            {/* Mobile "Add Lead" Button */}
            <Button
              onClick={openCreateDialog}
              className="md:hidden lg:hidden bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
            >
              <Plus className="mr-2 h-4 w-4" /> Add Lead
            </Button>
          </div>

          {/* Search Input */}
          <div className="relative w-full md:w-64 row-start-2 row-end-3 px-4 md:px-0  col-start-1 col-end-6">
            <Input
              type="text"
              placeholder="Search leads..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full"
            />
          </div>

          {/* Buttons Container (Grid Instead of Flex) */}
          {/* <div className=" md:flex grid grid-cols-6 col-start-1 col-end-7 row-start-3 row-end-4 gap-2"> */}
          <div className=" hidden md:flex">
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="row-start-2 row-end-3 col-start-6 col-end-7 hidden md:flex"
            >
              <Filter className="mr-2 h-4 w-4 " />
              {showFilters ? "Hide Filters" : "Show Filters"}
            </Button>

            {/* Export CSV */}
            <Button
              variant="outline"
              onClick={exportToCSV}
              className="col-start-1 col-end-4 mx-4"
            >
              <FileDown className="mr-2 h-4 w-4" /> Export CSV
            </Button>
            <Button
              variant="outline"
              onClick={exportToJSON}
              className="col-start-4 col-end-7 mx-4"
            >
              <FileDown className="mr-2 h-4 w-4" /> Export JSON
            </Button>
            <input
              type="file"
              id="import-leads"
              accept=".csv"
              className="hidden"
              onChange={handleImportCSV}
            />
            <Button
              variant="outline"
              onClick={() => document.getElementById("import-leads")?.click()}
              className=" mr-2"
            >
              <FileUp className="mr-2 h-4 w-4" /> Import
            </Button>
            <Button onClick={openCreateDialog} className=" col-span-2">
              <Plus className="mr-2 h-4 w-4" /> Add Lead
            </Button>
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className="row-start-2 row-end-3 col-start-6 col-end-7 p-1 flex md:hidden border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 w-10 items-center rounded-md justify-center"
          >
            <ListFilter className="mr-2 h-4 w-4 " />
          </button>
          {/* Export CSV */}
          <Button
            variant="outline"
            onClick={exportToCSV}
            className="col-start-1 col-end-3 mx-2 md:hidden lg:hidden"
          >
            {/* <FileDown className="mr-2 h-4 w-4" /> */}
            Export CSV
          </Button>

          {/* Export JSON */}
          <Button
            variant="outline"
            onClick={exportToJSON}
            className="col-start-3 col-end-5 mx-2 md:hidden lg:hidden px-1 py-1"
          >
            {/* <FileDown className="mr-2 h-4 w-4" />  */}
            Export JSON
          </Button>

          <input
            type="file"
            id="import-leads"
            accept=".csv"
            className="hidden "
            onChange={handleImportCSV}
          />
          <Button
            variant="outline"
            onClick={() => document.getElementById("import-leads")?.click()}
            className="md:hidden lg:hidden mx-2 col-start-5 col-end-7"
          >
            Import CSV
            {/* <FileUp className="mr-2 h-4 w-4" /> Import */}
          </Button>

          {/* Add Lead Button (Only for Desktop) */}
          {/* <Button
            onClick={openCreateDialog}
            className="md:hidden  col-span-2"
          >
            <Plus className="mr-2 h-4 w-4" /> Add Lead
          </Button> */}
        </CardHeader>

        <CardContent>
          {/* Delete Selected Button */}
          {selectedLeads.length > 0 && (
            <div className="mb-4 flex space-x-2">
              <Button
                variant="destructive"
                onClick={() => setDialogMode("delete")}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete {selectedLeads.length} Selected
              </Button>
              <Button variant="secondary" onClick={deselectAll}>
                <X className="mr-2 h-4 w-4" />
                Deselect All
              </Button>
            </div>
          )}

          <div className="text-xs">
            <Table className="text-xs">
              <TableHeader className="hidden md:table-header-group">
                <TableRow>
                  <TableHead className="px-2 py-1">
                    <Checkbox
                      checked={
                        paginatedLeads.length > 0 &&
                        paginatedLeads.every((lead) =>
                          selectedLeads.includes(lead.id)
                        )
                      }
                      onCheckedChange={toggleSelectAllOnPage}
                    />
                  </TableHead>

                  <TableHead className="px-2 py-1">Name</TableHead>
                  <TableHead className="px-2 py-1">Email</TableHead>

                  <TableHead className="px-2 py-1">Phone</TableHead>
                  <TableHead className="px-2 py-1">Generated At</TableHead>
                  <TableHead className="px-2 py-1">Actions</TableHead>
                  <TableHead className="px-2 py-1">Status</TableHead>
                  <TableHead className="px-2 py-1">Assign</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Mobile Veiw */}
                {filteredLeads.map((lead) => (
                  <>
                    <TableRow
                      key={lead.id}
                      className="flex md:hidden lg:hidden items-center justify-between text-[14px] border-b border-gray-300 py-2 last:border-none"
                    >
                      <div className="flex gap:4">
                        <TableCell className="px-2 py-1 col-start-1 col-end-2">
                          <Checkbox
                            checked={selectedLeads.includes(lead.id)}
                            onCheckedChange={() => toggleLeadSelection(lead.id)}
                          />
                        </TableCell>
                        <div>
                          <div className="px-2 py-1 col-start-2 col-end-6">
                            {lead.Name}
                            <br />
                            {lead.isDuplicate && (
                              <span
                                style={{ color: "red", fontSize: "0.7em" }}
                                className=" hidden md:block"
                              >
                                Duplicate Lead
                              </span>
                            )}
                          </div>

                          <div className="p-1 md:p-3 col-start-2 col-end-6">
                            <div className="flex items-center md:space-x-2">
                              {lead.is_email_valid ? (
                                <Check className="w-5 h-5 text-emerald-600 stroke-[3]" />
                              ) : (
                                <X className="w-5 h-5 text-red-600 stroke-[3]" />
                              )}
                              <div>
                                <span
                                  className={`
                                  font-medium tracking-tight 
                                  ${
                                    lead.is_email_valid
                                      ? "text-emerald-800"
                                      : "text-red-800"
                                  }`}
                                >
                                  {lead.email}
                                </span>
                                {!lead.is_email_valid && (
                                  <div className="text-xs text-red-600 mt-0.5">
                                    Invalid Email
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => toggleRow(lead.id)}
                          className="h-8 w-8 border-none bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-m"
                        >
                          {expandedRow === lead.id ? (
                            <ChevronUp />
                          ) : (
                            <ChevronDown />
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                    {expandedRow === lead.id && (
                      <TableRow className="text-[14px]">
                        <div className="p-3 grid grid-cols-2 items-center">
                          <span className="text-gray-600">Phone</span>
                          <div className="flex items-center space-x-2">
                            {lead.is_phone_valid ? (
                              <Check className="w-5 h-5 text-emerald-600 stroke-[3]" />
                            ) : (
                              <X className="w-5 h-5 text-red-600 stroke-[3]" />
                            )}
                            <div>
                              <span
                                className={`
        font-medium tracking-tight 
        ${lead.is_phone_valid ? "text-emerald-800" : "text-red-800"}`}
                              >
                                {lead.phone}
                              </span>
                              {!lead.is_phone_valid && (
                                <div className="text-xs text-red-600 mt-0.5">
                                  Invalid Phone
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className=" p-3 grid grid-cols-2 items-center">
                          <span className="text-gray-600">Genrated At</span>
                          <div className="px-2 py-1">
                            {formatDate(lead.createdAt)}
                          </div>
                        </div>
                        <div className="p-3 grid grid-cols-2 items-center ">
                          <span className="text-gray-600">Action</span>
                          <div className="flex  space-x-1">
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() =>
                                initiateDirectContact(lead, lead.contact_method)
                              }
                              className="h-6 w-6"
                              title={`Contact via ${lead.contact_method}`}
                            >
                              {lead.contact_method === "WhatsApp" && (
                                <Send className="h-3 w-3" />
                              )}
                              {lead.contact_method === "Call" && (
                                <Phone className="h-3 w-3" />
                              )}
                              {lead.contact_method === "SMS" && (
                                <MessageCircle className="h-3 w-3" />
                              )}
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => openEditDialog(lead)}
                              className="h-6 w-6"
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handleView(lead.id)}
                              className="h-6 w-6"
                            >
                              <Eye className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        <div className="px-3 py-2 grid grid-cols-2 items-center">
                          <span className="text-gray-600">Status</span>
                          <Select
                            defaultValue={JSON.stringify({
                              name: lead.status?.name || "Pending",
                              color: lead.status?.color || "#ea1212",
                            })}
                            onValueChange={(value) =>
                              handleStatusChange(lead.id, value)
                            }
                          >
                            <SelectTrigger className="group relative  overflow-hidden rounded-xl border-0 bg-white px-4 py-3 shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl dark:bg-gray-800">
                              <div className="flex items-center gap-3">
                                <div className="relative">
                                  <div
                                    className="absolute -inset-1 rounded-lg bg-gray-400 opacity-20 blur-sm transition-opacity duration-200 group-hover:opacity-30"
                                    style={{
                                      backgroundColor: lead?.status?.color,
                                    }}
                                  />
                                  <div
                                    className="relative h-3 w-3 rounded-lg bg-gray-400"
                                    style={{
                                      backgroundColor: lead?.status?.color,
                                    }}
                                  />
                                </div>
                                <span className="text-sm font-medium">
                                  {lead?.status?.name}
                                </span>
                              </div>
                            </SelectTrigger>

                            <SelectContent className="overflow-hidden rounded-xl border-0 bg-white p-2 shadow-2xl dark:bg-gray-800">
                              {statusData?.data.map(
                                (status: { name: string; color: string }) => (
                                  <SelectItem
                                    key={status.name}
                                    value={JSON.stringify({
                                      name: status?.name,
                                      color: status?.color,
                                    })}
                                    className="cursor-pointer rounded-lg outline-none transition-colors focus:bg-transparent"
                                  >
                                    <div className="group flex items-center gap-3 rounded-lg p-2 transition-all hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                      <div className="relative">
                                        {/* Glow effect */}
                                        <div
                                          className="absolute -inset-1 rounded-lg opacity-20 blur-sm transition-all duration-200 group-hover:opacity-40"
                                          style={{
                                            backgroundColor: status?.color,
                                          }}
                                        />
                                        {/* Main dot */}
                                        <div
                                          className="relative h-3 w-3 rounded-lg transition-transform duration-200 group-hover:scale-110"
                                          style={{
                                            backgroundColor: status?.color,
                                          }}
                                        />
                                      </div>
                                      <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                        {status.name}
                                      </span>
                                    </div>
                                  </SelectItem>
                                )
                              )}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="px-3  py-1 grid grid-cols-2 items-center ">
                          <span className="text-gray-600">Assign</span>
                          <Select
                            defaultValue={JSON.stringify({
                              name: lead?.assign_to?.name || "Not Assigned",
                              role: lead?.assign_to?.role || "(Not Assigned)",
                            })}
                            onValueChange={(value) =>
                              handleAssignChange(lead?.id, value)
                            } // Uncomment and use for status change handler
                          >
                            <SelectTrigger className="group relative overflow-hidden rounded-xl border-0 bg-white px-4 py-3 shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl dark:bg-gray-800">
                              <div className="flex items-center gap-3">
                                <div className="relative">
                                  <div className="absolute -inset-1 rounded-lg bg-gray-400 opacity-20 blur-sm transition-opacity duration-200 group-hover:opacity-30" />
                                  <div className="relative">
                                    <UserIcon className="h-6 w-6 text-gray-400" />
                                  </div>
                                </div>
                                <span className="text-sm font-medium">
                                  {lead?.assign_to?.name}
                                </span>
                              </div>
                            </SelectTrigger>

                            <SelectContent className="overflow-hidden rounded-xl border-0 bg-white p-2 shadow-2xl dark:bg-gray-800">
                              <SelectItem
                                key="unassigned"
                                value={JSON.stringify({
                                  name: "Unassigned",
                                  role: "none",
                                })}
                                className="cursor-pointer rounded-lg outline-none transition-colors focus:bg-transparent"
                              >
                                <div className="flex items-center gap-3">
                                  <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                    Unassigned
                                  </span>
                                </div>
                              </SelectItem>
                              {workspaceMembers?.data
                                .filter(
                                  (status: { name: string | null }) =>
                                    status.name && status.name !== "null"
                                )
                                .map(
                                  (status: { name: string; role: string }) => (
                                    <SelectItem
                                      key={status.name}
                                      value={JSON.stringify({
                                        name: status?.name,
                                        role: status?.role,
                                      })}
                                      className="cursor-pointer rounded-lg outline-none transition-colors focus:bg-transparent"
                                    >
                                      <div className="flex items-center gap-3">
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                          {status.name}
                                        </span>
                                      </div>
                                    </SelectItem>
                                  )
                                )}
                            </SelectContent>
                          </Select>
                        </div>
                      </TableRow>
                    )}
                  </>
                ))}

                {/* Desktop View  */}
                {filteredLeads.map((lead) => (
                  <TableRow
                    key={`${lead.id}-desktop`}
                    className="hidden md:table-row"
                  >
                    <TableCell className="px-2 py-1 col-start-1 col-end-2">
                      <Checkbox
                        checked={selectedLeads.includes(lead.id)}
                        onCheckedChange={() => toggleLeadSelection(lead.id)}
                      />
                    </TableCell>
                    <TableCell className="px-2 py-1 col-start-2 col-end-6">
                      {lead.Name}
                      <br />
                      {lead.isDuplicate && (
                        <span
                          style={{ color: "red", fontSize: "0.7em" }}
                          className=" hidden md:block"
                        >
                          Duplicate Lead
                        </span>
                      )}
                    </TableCell>

                    <TableCell className="p-3 col-start-2 col-end-6">
                      <div className="flex items-center space-x-2">
                        {lead.is_email_valid ? (
                          <Check className="w-5 h-5 text-emerald-600 stroke-[3]" />
                        ) : (
                          <X className="w-5 h-5 text-red-600 stroke-[3]" />
                        )}
                        <div>
                          <span
                            className={`
                                  font-medium tracking-tight 
                                  ${
                                    lead.is_email_valid
                                      ? "text-emerald-800"
                                      : "text-red-800"
                                  }`}
                          >
                            {lead.email}
                          </span>
                          {!lead.is_email_valid && (
                            <div className="text-xs text-red-600 mt-0.5">
                              Invalid Email
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="p-3 hidden md:table-cell ">
                      <div className="flex items-center space-x-2">
                        {lead.is_phone_valid ? (
                          <Check className="w-5 h-5 text-emerald-600 stroke-[3]" />
                        ) : (
                          <X className="w-5 h-5 text-red-600 stroke-[3]" />
                        )}
                        <div>
                          <span
                            className={`
        font-medium tracking-tight 
        ${lead.is_phone_valid ? "text-emerald-800" : "text-red-800"}`}
                          >
                            {lead.phone}
                          </span>
                          {!lead.is_phone_valid && (
                            <div className="text-xs text-red-600 mt-0.5">
                              Invalid Phone
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-2 py-1 hidden md:table-cell ">
                      {formatDate(lead.createdAt)}
                    </TableCell>
                    <TableCell className="px-2 py-1 hidden md:table-cell ">
                      <div className="flex space-x-1">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() =>
                            initiateDirectContact(lead, lead.contact_method)
                          }
                          className="h-6 w-6"
                          title={`Contact via ${lead.contact_method}`}
                        >
                          {lead.contact_method === "WhatsApp" && (
                            <Send className="h-3 w-3" />
                          )}
                          {lead.contact_method === "Call" && (
                            <Phone className="h-3 w-3" />
                          )}
                          {lead.contact_method === "SMS" && (
                            <MessageCircle className="h-3 w-3" />
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => openEditDialog(lead)}
                          className="h-6 w-6"
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleView(lead.id)}
                          className="h-6 w-6"
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="border-none hidden md:table-cell ">
                      <Select
                        defaultValue={JSON.stringify({
                          name: lead.status?.name || "Pending",
                          color: lead.status?.color || "#ea1212",
                        })}
                        onValueChange={(value) =>
                          handleStatusChange(lead.id, value)
                        }
                      >
                        <SelectTrigger className="group relative w-[200px] overflow-hidden rounded-xl border-0 bg-white px-4 py-3 shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl dark:bg-gray-800">
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <div
                                className="absolute -inset-1 rounded-lg bg-gray-400 opacity-20 blur-sm transition-opacity duration-200 group-hover:opacity-30"
                                style={{
                                  backgroundColor: lead?.status?.color,
                                }}
                              />
                              <div
                                className="relative h-3 w-3 rounded-lg bg-gray-400"
                                style={{
                                  backgroundColor: lead?.status?.color,
                                }}
                              />
                            </div>
                            <span className="text-sm font-medium">
                              {lead?.status?.name}
                            </span>
                          </div>
                        </SelectTrigger>

                        <SelectContent className="overflow-hidden rounded-xl border-0 bg-white p-2 shadow-2xl dark:bg-gray-800">
                          {statusData?.data.map(
                            (status: { name: string; color: string }) => (
                              <SelectItem
                                key={status.name}
                                value={JSON.stringify({
                                  name: status?.name,
                                  color: status?.color,
                                })}
                                className="cursor-pointer rounded-lg outline-none transition-colors focus:bg-transparent"
                              >
                                <div className="group flex items-center gap-3 rounded-lg p-2 transition-all hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                  <div className="relative">
                                    {/* Glow effect */}
                                    <div
                                      className="absolute -inset-1 rounded-lg opacity-20 blur-sm transition-all duration-200 group-hover:opacity-40"
                                      style={{
                                        backgroundColor: status?.color,
                                      }}
                                    />
                                    {/* Main dot */}
                                    <div
                                      className="relative h-3 w-3 rounded-lg transition-transform duration-200 group-hover:scale-110"
                                      style={{
                                        backgroundColor: status?.color,
                                      }}
                                    />
                                  </div>
                                  <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                    {status.name}
                                  </span>
                                </div>
                              </SelectItem>
                            )
                          )}
                        </SelectContent>
                      </Select>
                    </TableCell>

                    <TableCell className="border-none hidden md:table-cell ">
                      <Select
                        defaultValue={JSON.stringify({
                          name: lead?.assign_to?.name || "Not Assigned",
                          role: lead?.assign_to?.role || "(Not Assigned)",
                        })}
                        onValueChange={(value) =>
                          handleAssignChange(lead?.id, value)
                        } // Uncomment and use for status change handler
                      >
                        <SelectTrigger className="group relative w-[200px] overflow-hidden rounded-xl border-0 bg-white px-4 py-3 shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl dark:bg-gray-800">
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <div className="absolute -inset-1 rounded-lg bg-gray-400 opacity-20 blur-sm transition-opacity duration-200 group-hover:opacity-30" />
                              <div className="relative">
                                <UserIcon className="h-6 w-6 text-gray-400" />
                              </div>
                            </div>
                            <span className="text-sm font-medium">
                              {lead?.assign_to?.name}
                            </span>
                          </div>
                        </SelectTrigger>

                        <SelectContent className="overflow-hidden rounded-xl border-0 bg-white p-2 shadow-2xl dark:bg-gray-800">
                          <SelectItem
                            key="unassigned"
                            value={JSON.stringify({
                              name: "Unassigned",
                              role: "none",
                            })}
                            className="cursor-pointer rounded-lg outline-none transition-colors focus:bg-transparent"
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                Unassigned
                              </span>
                            </div>
                          </SelectItem>
                          {workspaceMembers?.data
                            .filter(
                              (status: { name: string | null }) =>
                                status.name && status.name !== "null"
                            )
                            .map((status: { name: string; role: string }) => (
                              <SelectItem
                                key={status.name}
                                value={JSON.stringify({
                                  name: status?.name,
                                  role: status?.role,
                                })}
                                className="cursor-pointer rounded-lg outline-none transition-colors focus:bg-transparent"
                              >
                                <div className="flex items-center gap-3">
                                  <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                    {status.name}
                                  </span>
                                </div>
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {/* <div className="flex justify-between items-center mt-4">
            <Button
              variant="outline"
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <span>
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              onClick={() =>
                setCurrentPage((prev) => Math.min(totalPages, prev + 1))
              }
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div> */}
        </CardContent>
      </Card>
      <Dialog
        open={dialogMode === "create" || dialogMode === "edit"}
        onOpenChange={() => resetDialog()}
      >
        <DialogContent className="w-[90%] max-w-md">
          <DialogHeader>
            <DialogTitle>
              {dialogMode === "create" ? "Add New Lead" : "Edit Lead"}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter Your Full name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {/* <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter last name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                /> */}
              </div>
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter email"
                        type="email"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter phone number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="company"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter company" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="position"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Position</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter position" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="contact_method"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Method</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select contact method" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="z-[1001]">
                        <SelectItem value="WhatsApp">WhatsApp</SelectItem>
                        <SelectItem value="SMS">SMS</SelectItem>
                        <SelectItem value="Call">Call</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="revenue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Revenue</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter revenue"
                        type="number"
                        {...field}
                        value={field.value ? String(field.value) : ""}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value
                              ? parseFloat(e.target.value)
                              : undefined
                          )
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                </DialogClose>
                <Button type="submit">
                  {isUpdateLoading ? (
                    <>
                      <Loader2 /> Loading...
                    </>
                  ) : dialogMode === "create" ? (
                    "Add Lead"
                  ) : (
                    "Update Lead"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      {/* Delete Confirmation Dialog */}
      <Dialog
        open={dialogMode === "delete"}
        onOpenChange={() => setDialogMode(null)}
      >
        <DialogContent className="w-[90%] max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Selected Leads</DialogTitle>
          </DialogHeader>
          <p>
            Are you sure you want to delete {selectedLeads?.length} lead(s)?
          </p>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LeadManagement;
