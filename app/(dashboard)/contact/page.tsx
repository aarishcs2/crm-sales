"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Resizable } from "react-resizable";
import "react-resizable/css/styles.css";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Mail,
  Phone,
  User,
  UserPlus,
  MoreVertical,
  Loader2,
  MessageCircle,
  Send,
  Plus,
  MessageSquare,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
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
} from "@/components/ui/dialog";
import { useGetTagsQuery } from "@/lib/store/services/tags";
import {
  useGetLeadsByWorkspaceQuery,
  useUpdateLeadMutation,
} from "@/lib/store/services/leadsApi";
import {
  useGetActiveWorkspaceQuery,
  useGetWorkspaceMembersQuery,
} from "@/lib/store/services/workspace";
import { useGetStatusQuery } from "@/lib/store/services/status";

import { Label } from "@/components/ui/label";
import WebhookStatus from "@/components/ui/WebhookStatus";
import { useSelector } from "react-redux";
import { RootState } from "@/lib/store/store";
import { CardTitle } from "@/components/ui/card";
import { ResizableHandle } from "@/components/ui/resizable";
// import { useRouter } from "next/router";
// import { Loader2} from "@/components/ui";

// Mock data for contacts
const mockContacts = Array.from({ length: 50 }, (_, i) => ({
  id: i + 1,
  name: `Contact ${i + 1}`,
  email: `contact${i + 1}@example.com`,
  phone: `+1 555-${String(i + 1).padStart(4, "0")}`,
  status: ["Active", "Inactive", "Pending"][Math.floor(Math.random() * 3)],
  lastContact: new Date(
    Date.now() - Math.random() * 10000000000
  ).toLocaleDateString(),
}));

interface Tags {
  id?: string;
  name: string;
  color: string;
}

export default function ContactPage() {
  const router = useRouter();
  const [contacts, setContacts] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [leads, setLeads] = useState<any[]>([]);
  const [editNameId, setEditNameId] = useState(null);
  const [nameInfo, setNameInfo] = useState("");
  const [editEmailId, setEditEmailId] = useState(null);
  const [emailInfo, setEmailInfo] = useState("");
  const [editPhoneId, setEditPhoneId] = useState(null);
  const [phoneInfo, setPhoneInfo] = useState("");
  const [editInfoId, setEditInfoId] = useState(null);
  const [editEmailValidationId, setEditEmailValidationId] = useState(null);
  const [emailValidation, setEmailValidation] = useState(false);

  const [businessInfo, setBusinessInfo] = useState(""); // Single field for input
  const [tags, setTags] = useState<Tags[]>([]);
  const [selectedTags, setSelectedTags] = useState<Record<string, string[]>>(
    {}
  );
  const [openAddress, setopenAddress] = useState<Record<string, string[]>>({});
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const isCollapsed = useSelector(
    (state: RootState) => state.sidebar.isCollapsed
  );

  const [updateLead, { isLoading }] = useUpdateLeadMutation();
  const [expandedRow, setExpandedRow] = useState(null);
  const toggleRow = (id: any) => {
    setExpandedRow(expandedRow === id ? null : id);
  };

  const [newContact, setNewContact] = useState({
    name: "",
    email: "",
    phone: "",
    status: "Active",
  });

  // fetching leads
  const { data: activeWorkspace, isLoading: isLoadingWorkspace } =
    useGetActiveWorkspaceQuery();
  const workspaceId = activeWorkspace?.data?.id;
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
  const { data: tagsData, isLoading: isLoadingTags }: any =
    useGetTagsQuery(workspaceId);

  const POLLING_INTERVAL = 10000;
  const { data: statusData, isLoading: isLoadingStatus }: any =
    useGetStatusQuery(workspaceId);

  // **Filter Leads into Contacts**
  const contactStatuses = new Set(
    Array.isArray(statusData?.data)
      ? statusData.data
          .filter((status: any) => status.count_statistics)
          .map((status: any) => status.name)
      : []
  );

  const handleView = (id: number) => {
    router.push(`/leads/${id}`);
  };

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
            status: lead.status || { name: "New" },
            revenue: lead.revenue || 0,
            assign_to: lead.assign_to || "Not Assigned",
            createdAt: lead.created_at
              ? new Date(lead.created_at).toISOString()
              : new Date().toISOString(),
            isDuplicate: false,
            is_email_valid: lead.is_email_valid,
            is_phone_valid: lead.is_phone_valid,
            sourceId: lead?.lead_source_id ?? null,
            businessInfo: lead?.businessInfo ?? "",
            tag: lead?.tags ?? {},
            address: lead?.address ?? "",
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
        const sortedLeads = updatedLeads.sort(
          (a: any, b: any) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        setLeads(sortedLeads);

        const QualifiedContacts = sortedLeads.filter((lead: any) =>
          contactStatuses.has(lead.status.name)
        );

        setContacts(QualifiedContacts);
      }
    };

    // Initial fetch
    fetchLeads();

    // Set up polling
    const pollInterval = setInterval(fetchLeads, POLLING_INTERVAL);

    // Cleanup
    return () => clearInterval(pollInterval);
  }, [workspaceData, isLoadingLeads]);

  // useEffect(() => {
  //   console.log("contact", contacts);
  // }, [contacts]);

  useEffect(() => {
    if (editInfoId) {
      const contactToEdit = contacts.find((c) => c.id === editInfoId);
      if (contactToEdit) {
        setAddressData({
          address1: contactToEdit.address1 || "",
          address2: contactToEdit.address2 || "",
          country: contactToEdit.country || "",
          zipCode: contactToEdit.zipCode || "",
        });
      }
    }
  }, [editInfoId, contacts]);

  useEffect(() => {
    if (tagsData?.data) {
      setTags(tagsData.data);
    }
  }, [tagsData]);

  // Filter contacts based on search and status
  const filteredContacts = Array.isArray(contacts)
    ? contacts.filter((contact) => {
        const searchLower = search.toLowerCase();
        const statusLower = statusFilter.toLowerCase();

        const matchesSearch =
          contact?.name?.toLowerCase().includes(searchLower) || // Fix: contact.Name -> contact.name
          contact?.email?.toLowerCase().includes(searchLower) ||
          contact?.phone?.includes(search);

        const matchesStatus =
          statusFilter === "all" ||
          contact?.status?.name?.toLowerCase() === statusLower;

        return matchesSearch && matchesStatus;
      })
    : [];

  // contact
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

  //update

  // const tags = [
  //   { name: "Facebook", color: "#1877F2" }, // Blue
  //   { name: "SEO", color: "#22C55E" }, // Green
  //   { name: "Google Ads", color: "#FACC15" }, // Yellow
  //   { name: "LinkedIn", color: "#0A66C2" }, // Dark Blue
  // ];

  const handleUpdate = async (
    id: string | number,
    updatedData: Partial<{
      businessInfo: string;
      tags: string[];
      address: string;
      email: string;
      name: string;
      phone: string;
      is_email_valid: boolean;
    }>
  ) => {
    // console.log("dataa", updatedData);

    if (
      !updatedData.businessInfo === undefined &&
      (!updatedData.tags || updatedData.tags.length === 0) &&
      !updatedData.address?.trim() &&
      !updatedData.email?.trim() &&
      !updatedData.phone?.trim() &&
      updatedData.is_email_valid === undefined &&
      !updatedData.name?.trim()
    ) {
      return; // Prevent empty updates
    }

    try {
      await updateLead({
        id,
        leads: updatedData,
      }).unwrap();
    } catch (error) {
      toast.error("Update failed");
    }

    toast.success("Update successfully");
  };

  const handleTagChange = (id: string, value: string) => {
    setSelectedTags((prev) => {
      const currentTags = prev?.[id] ?? [];

      const updatedTags = currentTags.includes(value)
        ? currentTags.filter((tag) => tag !== value) // Remove tag if already selected
        : [...currentTags, value];

      handleUpdate?.(id, { tags: updatedTags });

      return { ...prev, [id]: updatedTags };
    });
  };
  useEffect(() => {}, [selectedTags]);

  // useEffect(() => {
  //   if (contacts.length > 0) {
  //     const initialTags = contacts.reduce((acc, contact) => {
  //       acc[contact.id] = JSON.parse(contact.tag || "[]"); // Ensure it's an array
  //       return acc;
  //     }, {} as Record<string, string[]>);

  //     setSelectedTags(initialTags);
  //   }
  // }, [contacts]); // Make sure to update when `contacts` change

  const handleRemoveTag = async (contactId: string, tagToRemove: string) => {
    setSelectedTags((prev) => {
      if (!prev || !prev[contactId]) return prev;

      const updatedTags = prev[contactId].filter((tag) => tag !== tagToRemove);

      handleUpdate(contactId, { tags: updatedTags.length ? updatedTags : [] });

      return {
        ...prev,
        [contactId]: updatedTags.length ? updatedTags : [],
      };
    });
  };

  // Daynamic Table/////////////
  const tableHeaders = [
    "Name",
    "Email",
    "Phone",
    "Email Validation",
    "Platform",
    "Bussiness Info",
    "Tag",
    "Address",
  ];
  const [selectedHeaders, setSelectedHeaders] = useState<any[]>([
    "Name",
    "Email",
    "Phone",
    "Email Validation",
    "Platform",
    "Bussiness Info",
    "Tag",
  ]);
  const [addressData, setAddressData] = useState({
    address1: "",
    address2: "",
    country: "",
    zipCode: "",
  });
  const defaultHeaders = [
    "Name",
    "Email",
    "Phone",
    "Email Validation",
    "Platform",
    "Bussiness Info",
    "Tag",
  ];

  const [dropdownOpen, setDropdownOpen] = useState(false);

  const [newColumn, setNewColumn] = useState("");

  const addColumn = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedColumn = event.target.value;
    if (selectedColumn && !selectedHeaders.includes(selectedColumn)) {
      const updatedHeaders = [...selectedHeaders];

      // Find the correct index in the original tableHeaders
      const insertIndex = tableHeaders.indexOf(selectedColumn);

      // Find the correct position in selectedHeaders based on tableHeaders order
      for (let i = 0; i < selectedHeaders.length; i++) {
        if (tableHeaders.indexOf(selectedHeaders[i]) > insertIndex) {
          updatedHeaders.splice(i, 0, selectedColumn);
          setSelectedHeaders(updatedHeaders);
          return;
        }
      }

      // If it's the last item, push normally
      updatedHeaders.push(selectedColumn);
      setSelectedHeaders(updatedHeaders);
    }
  };

  // const [dropdownOpen, setDropdownOpen] = useState<string | null>(null);
  const [dropdownOpenRemove, setDropdownOpenRemove] = useState<string | null>(
    null
  );

  // Toggle dropdown for headers
  const toggleDropdown = (header: string) => {
    setDropdownOpenRemove((prev) => (prev === header ? null : header));
  };

  // };
  const removeColumn = (header: string) => {
    setSelectedHeaders((prevHeaders) =>
      prevHeaders.filter((h) => h !== header)
    );
    setDropdownOpenRemove(null); // Close dropdown after removing
  };

  // Calculate pagination
  const totalPages = Math.ceil(filteredContacts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedContacts = filteredContacts.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  // Rezieable columns
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(
    Object.fromEntries(tableHeaders.map((header) => [header, 150])) // Default width for each column
  );

  // Correctly type 'size' as ResizeCallbackData
  type ResizeCallbackData = {
    size: { width: number; height: number };
  };

  const handleResize =
    (header: string) =>
    (event: React.SyntheticEvent, { size }: ResizeCallbackData) => {
      setColumnWidths((prevWidths) => ({
        ...prevWidths,
        [header]: size.width, // Update width dynamically
      }));
    };

  const handleAddContact = (e: React.FormEvent) => {
    e.preventDefault();
    const newId = contacts.length + 1;
    setContacts([
      ...contacts,
      {
        ...newContact,
        id: newId,
        lastContact: new Date().toLocaleDateString(),
      },
    ]);
    setNewContact({
      name: "",
      email: "",
      phone: "",
      status: "Active",
    });
  };

  if (isLoadingWorkspace || isLoadingLeads || isLoadingMembers)
    return (
      <div className="flex items-center justify-center min-h-screen overflow-hidden">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );

  return (
    <div
      className={`transition-all duration-500 ease-in-out px-4 py-6  ${
        isCollapsed ? "md:ml-[80px]" : "md:ml-[250px]"
      } w-auto overflow-hidden`}
    >
      <div className="w-full rounded-[16px] md:rounded-[4px]">
        <div className="md:bg-white bg-gray-100 dark:bg-gray-800 flex items-center justify-between col-start-1 col-end-7 p-3 md:p-0">
          <div className="flex gap-2">
            <div className="md:hidden lg:hidden text-gray-900 dark:text-gray-100">
              <MessageSquare />
            </div>
            <CardTitle className="flex mr-2 text-md md:text-xl lg:text-2xl text-gray-900 dark:text-gray-100">
              Contact
            </CardTitle>
          </div>
        </div>

        {/* <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Contacts</h1>
          <Dialog>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                Add Contact
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Contact</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddContact} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={newContact.name}
                    onChange={(e) =>
                      setNewContact({ ...newContact, name: e.target.value })
                    }
                    placeholder="Enter name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newContact.email}
                    onChange={(e) =>
                      setNewContact({ ...newContact, email: e.target.value })
                    }
                    placeholder="Enter email"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={newContact.phone}
                    onChange={(e) =>
                      setNewContact({ ...newContact, phone: e.target.value })
                    }
                    placeholder="Enter phone number"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={newContact.status}
                    onValueChange={(value) =>
                      setNewContact({ ...newContact, status: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Proposal Sent">Proposal Sent</SelectItem>
                      <SelectItem value="Inactive">Inactive</SelectItem>
                      <SelectItem value="Pending">Pending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full">
                  Add Contact
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div> */}

        {/* Filters */}
        <div className="flex flex-col md:flex-row  gap-4 items-center">
          {/* Search Input */}
          <div className="md:flex-1 relative w-full mt-4 md:mt-0">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Search contacts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>

          {/* Status Filter Dropdown */}

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="md:w-[180px] w-full">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              {/* Default "All Status" option */}
              <SelectItem value="all">All Status</SelectItem>

              {/* Convert Set to Array and map over it */}
              {Array.from(contactStatuses).map((statusName) => (
                <SelectItem
                  key={statusName as string}
                  value={statusName as string}
                >
                  {statusName as string}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Contacts Table */}
        <div className="border rounded-lg mt-4">
          <div className="w-full overflow-x-auto">
            <Table className="min-w-full border-collapse table-auto">
              <TableHeader className="hidden md:table-header-group">
                <TableRow>
                  {selectedHeaders?.map((header) => (
                    <TableHead
                      key={header}
                      className="relative text-center font-semibold"
                      style={{ width: columnWidths[header] }} // Apply dynamic width
                    >
                      <Resizable
                        width={columnWidths[header]}
                        height={30}
                        axis="x"
                        resizeHandles={["e"]} // Enables resizing from the right edge
                        onResize={handleResize(header)}
                      >
                        <div
                          className="flex justify-center items-center cursor-pointer"
                          style={{ width: "100%" }} // Ensure div stretches fully
                        >
                          <span onClick={() => toggleDropdown(header)}>
                            {header}
                          </span>
                          {/* Resize Handle */}
                          <span className="w-2 h-full cursor-ew-resize bg-gray-300"></span>
                        </div>
                      </Resizable>

                      {/* Dropdown menu for removing column */}
                      {dropdownOpenRemove === header && (
                        <div className="absolute right-0 mt-2 bg-white border shadow-lg rounded-md p-2 w-40 z-50">
                          <button
                            className="w-full text-left px-2 py-1 hover:bg-red-500 hover:text-white rounded-md"
                            onClick={() => removeColumn(header)}
                          >
                            Hide Column
                          </button>
                        </div>
                      )}
                    </TableHead>
                  ))}
                  <TableHead className="text-center">
                    <button
                      onClick={() => setDropdownOpen(!dropdownOpen)}
                      className="p-2 rounded-full bg-blue-500 hover:bg-blue-600 text-white"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                    {dropdownOpen && (
                      <div className="absolute right-0 mt-2 bg-white border shadow-lg rounded-md p-2 w-40 z-50">
                        <select
                          className="w-full border p-2 rounded"
                          onChange={(e) => {
                            addColumn(e);
                            setDropdownOpen(false);
                          }}
                        >
                          <option value="">Select Column</option>
                          {tableHeaders
                            .filter(
                              (header) => !selectedHeaders.includes(header)
                            )
                            .map((header) => (
                              <option key={header} value={header}>
                                {header}
                              </option>
                            ))}
                        </select>
                      </div>
                    )}
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {/* Mobile veiw */}
                {filteredContacts.map((contact) => (
                  <>
                    <TableRow
                      key={contact.id}
                      className="md:hidden lg:hidden flex items-center p-3 justify-between gap-8"
                    >
                      <div className="flex flex-col gap-2 ">
                        {selectedHeaders?.includes("Name") && (
                          <div className=" left-0 bg-white dark:bg-gray-900 z-10 font-medium text-[1rem]  text-start  cursor-pointer">
                            {editNameId === contact.id ? (
                              // Editing mode: Show input field
                              <input
                                type="text"
                                placeholder="Enter Name..."
                                className="px-2 py-1 border rounded-md w-full"
                                value={nameInfo}
                                onChange={(e) => setNameInfo(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    handleUpdate(contact.id, {
                                      name: nameInfo,
                                    });
                                    setEditNameId(null); // Exit edit mode after updating
                                  } else if (e.key === "Escape") {
                                    setEditNameId(null);
                                    setNameInfo(contact.Name || ""); // Reset on cancel
                                  }
                                }}
                                autoFocus
                              />
                            ) : (
                              // Normal display mode
                              <span
                                className="text-gray-900 dark:text-gray-300"
                                onDoubleClick={() => {
                                  setEditNameId(contact.id);
                                  setNameInfo(contact.Name || ""); // Pre-fill existing name
                                }}
                              >
                                {contact.Name || (
                                  <span className="text-gray-400 italic">
                                    Double-click to add name
                                  </span>
                                )}
                              </span>
                            )}
                          </div>
                        )}

                        {selectedHeaders.includes("Email") && (
                          <div className=" text-center cursor-pointer">
                            {editEmailId === contact.id ? (
                              <input
                                type="email"
                                placeholder="Enter Email..."
                                className="px-2 py-1 border rounded-md w-full"
                                value={emailInfo}
                                onChange={(e) => setEmailInfo(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    handleUpdate(contact.id, {
                                      email: emailInfo,
                                    });
                                    setEditEmailId(null);
                                  } else if (e.key === "Escape") {
                                    setEditEmailId(null);
                                    setEmailInfo(contact.email || ""); // Reset on cancel
                                  }
                                }}
                                autoFocus
                              />
                            ) : (
                              <span
                                className="cursor-pointer group-hover:underline text-gray-600"
                                onDoubleClick={() => {
                                  setEditEmailId(contact.id);
                                  setEmailInfo(contact?.email || ""); // Pre-fill existing email
                                }}
                              >
                                {contact.email || (
                                  <span className="text-gray-400 italic">
                                    Double-click to add email
                                  </span>
                                )}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => toggleRow(contact.id)}
                          className="h-8 w-8 border-none bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-m"
                        >
                          {expandedRow === contact.id ? (
                            <ChevronUp />
                          ) : (
                            <ChevronDown />
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                    {expandedRow === contact.id && (
                      <TableRow className="md:hidden lg:hidden">
                        {selectedHeaders.includes("Phone") && (
                          <div className="p-3 grid grid-cols-2 relative  cursor-pointer">
                            <span className="text-gray-600">Phone</span>
                            {editPhoneId === contact.id ? (
                              // Editing mode: Show input field
                              <input
                                type="text"
                                placeholder="Enter Phone..."
                                className="px-2 py-1 border rounded-md w-full"
                                value={phoneInfo}
                                onChange={(e) => setPhoneInfo(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    handleUpdate(contact.id, {
                                      phone: phoneInfo,
                                    });
                                    setEditPhoneId(null); // Exit edit mode after updating
                                  } else if (e.key === "Escape") {
                                    setEditPhoneId(null);
                                    setPhoneInfo(contact.phone || ""); // Reset on cancel
                                  }
                                }}
                                autoFocus
                              />
                            ) : (
                              <div className="inline-block group relative">
                                {/* Phone Number */}
                                <span
                                  className="cursor-pointer group-hover:underline"
                                  onDoubleClick={() => {
                                    setEditPhoneId(contact.id);
                                    setPhoneInfo(contact.phone || ""); // Pre-fill existing phone number
                                  }}
                                >
                                  {contact.phone || (
                                    <span className="text-gray-400 italic">
                                      Double-click to add phone
                                    </span>
                                  )}
                                </span>

                                {/* Hover Menu - Appears Below */}
                                <div
                                  className="absolute left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col bg-white shadow-md rounded-md p-2 w-[140px] border border-gray-200 z-50"
                                  style={{
                                    bottom: "calc(100% + 2px)", // Ensures no gap
                                    transform: "translateX(-50%)",
                                    pointerEvents: "auto", // Ensures interaction
                                  }}
                                >
                                  {/* WhatsApp */}
                                  <button
                                    onClick={() =>
                                      window.open(
                                        `https://wa.me/${contact.phone}`,
                                        "_blank"
                                      )
                                    }
                                    className="flex items-center gap-2 text-sm text-gray-800 hover:text-green-600"
                                  >
                                    <Send className="h-4 w-4 text-green-500" />
                                    WhatsApp
                                  </button>

                                  {/* Call */}
                                  <button
                                    onClick={() =>
                                      (window.location.href = `tel:${contact.phone}`)
                                    }
                                    className="flex items-center gap-2 text-sm text-gray-800 hover:text-blue-600 mt-1"
                                  >
                                    <Phone className="h-4 w-4 text-blue-500" />
                                    Call
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {selectedHeaders.includes("Email Validation") && (
                          <div className=" p-3 grid grid-cols-2  cursor-pointer">
                            <span className="text-gray-600">
                              Email Validation
                            </span>
                            {editEmailValidationId === contact.id ? (
                              // Editing mode: Show <select> dropdown
                              <select
                                className="px-2 py-1 border rounded-md"
                                value={emailValidation ? "true" : "false"}
                                onChange={async (e) => {
                                  const newValue = e.target.value === "true"; // Convert to boolean
                                  setEmailValidation(newValue);
                                  await handleUpdate(contact.id, {
                                    is_email_valid: newValue,
                                  });
                                  setEditEmailValidationId(null); // Exit edit mode after update
                                }}
                                autoFocus
                              >
                                <option
                                  className="px-2 py-1 text-sm font-semibold rounded bg-green-200 text-green-800"
                                  value="true"
                                >
                                  True
                                </option>
                                <option
                                  className="px-2 py-1 text-sm font-semibold rounded-l-md bg-red-200 text-red-800"
                                  value="false"
                                >
                                  False
                                </option>
                              </select>
                            ) : (
                              // Normal mode: Show colored text
                              <div>
                                <span
                                  onDoubleClick={() => {
                                    setEditEmailValidationId(contact.id);
                                    setEmailValidation(contact.is_email_valid);
                                  }}
                                  className={`px-2 py-1 text-sm font-semibold rounded ${
                                    contact.is_email_valid
                                      ? "bg-green-200 text-green-800"
                                      : "bg-red-200 text-red-800"
                                  }`}
                                >
                                  {contact.is_email_valid ? "True" : "False"}
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                        {selectedHeaders.includes("Platform") && (
                          <div className=" grid grid-cols-2 w-auto ">
                            <span className="px-3 py-1 text-gray-600">
                              Platform
                            </span>
                            {contact.sourceId ? (
                              <WebhookStatus
                                sourceId={contact.sourceId}
                                workspaceId={workspaceId}
                              />
                            ) : (
                              <span className="text-gray-500">No Source</span>
                            )}
                          </div>
                        )}

                        {selectedHeaders.includes("Bussiness Info") && (
                          <div
                            className="p-3 grid grid-cols-2  cursor-pointer"
                            onDoubleClick={() => {
                              setEditInfoId(contact.id);
                              setBusinessInfo(contact.businessInfo || ""); // Pre-fill existing info
                            }}
                          >
                            <span className="text-gray-600">
                              Bussiness Info
                            </span>
                            {editInfoId === contact.id ? (
                              // Editing mode: Show input field
                              <input
                                type="text"
                                placeholder="Enter Business Info..."
                                className="px-2 py-1 border rounded-md w-full"
                                value={businessInfo}
                                onChange={(e) =>
                                  setBusinessInfo(e.target.value)
                                }
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    handleUpdate(contact.id, { businessInfo });
                                    setEditInfoId(null);
                                  } else if (e.key === "Escape") {
                                    setEditInfoId(null);
                                    setBusinessInfo(
                                      contact?.bussinessInfo || ""
                                    ); // Clear input on cancel
                                  }
                                }}
                                autoFocus
                              />
                            ) : (
                              // Normal display mode
                              <span className="text-gray-700 dark:text-gray-300">
                                {contact.businessInfo || (
                                  <span className="text-gray-400 italic">
                                    Double-click to add info
                                  </span>
                                )}
                              </span>
                            )}
                          </div>
                        )}
                        {selectedHeaders.includes("Tag") && (
                          <div
                            className=" p-3 grid grid-cols-2 border-none cursor-pointer mb-4"
                            onDoubleClick={() => {
                              setOpenDropdownId(contact.id); // Open dropdown on double-click
                            }}
                          >
                            <span className="text-gray-600">Tag</span>
                            <div className="flex flex-row ">
                              <div className="flex flex-row flex-wrap items-center">
                                {(() => {
                                  const parsedTags =
                                    typeof contact?.tag === "string"
                                      ? JSON.parse(contact.tag)
                                      : contact?.tag || [];

                                  return Array.isArray(parsedTags) ? (
                                    parsedTags.map((tag: string) => (
                                      <div
                                        key={tag}
                                        className="flex items-center gap-2  bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-md"
                                      >
                                        <div
                                          className="h-3 w-3 rounded-lg"
                                          style={{
                                            backgroundColor:
                                              tags.find((t) => t.name === tag)
                                                ?.color || "#ccc",
                                          }}
                                        />
                                        <span className="text-sm font-medium">
                                          {tag}
                                        </span>
                                        <button
                                          onClick={() =>
                                            handleRemoveTag(contact.id, tag)
                                          }
                                          className="text-xs text-red-500 hover:text-red-700"
                                        >
                                          ✕
                                        </button>
                                      </div>
                                    ))
                                  ) : (
                                    <span className="text-gray-400 italic">
                                      Double click to add tags
                                    </span>
                                  );
                                })()}
                              </div>

                              {/* Select Dropdown (Now opens on double-click) */}
                              <Select
                                open={openDropdownId === contact.id} // Control dropdown visibility
                                onOpenChange={(isOpen) => {
                                  if (!isOpen) setOpenDropdownId(null); // Close when user clicks outside
                                }}
                                onValueChange={(value) =>
                                  handleTagChange(contact.id, value)
                                }
                              >
                                {openDropdownId === contact.id && (
                                  <SelectTrigger className="relative w-[180px] overflow-hidden rounded-xl border-0 bg-white px-4 py-2 shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl dark:bg-gray-800">
                                    <span className="text-sm font-medium">
                                      + Add Tag
                                    </span>
                                  </SelectTrigger>
                                )}

                                <SelectContent className="hidden md:flex w-[200px] overflow-hidden rounded-xl border-0 bg-white p-2 shadow-2xl dark:bg-gray-800">
                                  <div className="flex flex-col gap-2">
                                    {tags.map((tag) => (
                                      <SelectItem
                                        key={tag.name}
                                        value={tag.name}
                                      >
                                        <div className="group flex items-center gap-3 rounded-lg p-2 transition-all hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                          <div className="relative">
                                            <div
                                              className="absolute -inset-1 rounded-lg opacity-20 blur-sm transition-all duration-200 group-hover:opacity-40"
                                              style={{
                                                backgroundColor: tag.color,
                                              }}
                                            />
                                            <div
                                              className="relative h-3 w-3 rounded-lg transition-transform duration-200 group-hover:scale-110"
                                              style={{
                                                backgroundColor: tag.color,
                                              }}
                                            />
                                          </div>
                                          <span
                                            className={`text-sm font-medium ${
                                              selectedTags[
                                                contact.id
                                              ]?.includes(tag.name)
                                                ? "font-bold text-blue-600"
                                                : "text-gray-700 dark:text-gray-200"
                                            }`}
                                          >
                                            {tag.name}
                                          </span>
                                        </div>
                                      </SelectItem>
                                    ))}
                                  </div>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        )}

                        {selectedHeaders.includes("Address") && (
                          <div
                            className="p-3 flex gap-16 text-center cursor-pointer relative"
                            onDoubleClick={() => {
                              setopenAddress(contact.id);
                              setAddressData({
                                address1: contact.address
                                  ? contact.address.split(",")[0]
                                  : "",
                                address2: contact.address
                                  ? contact.address.split(",")[1]?.trim() || ""
                                  : "",
                                country: contact.address
                                  ? contact.address.split(",")[2]?.trim() || ""
                                  : "",
                                zipCode: contact.address
                                  ? contact.address.split(",")[3]?.trim() || ""
                                  : "",
                              });
                            }}
                          >
                            <span className="text-gray-600">Address</span>
                            {openAddress === contact.id ? (
                              <div className="absolute left-1/2 -translate-x-1/2  bg-white border shadow-lg rounded-md p-4 w-[450px] z-50">
                                <div className="flex flex-row items-center mb-4">
                                  <label className="block text-sm font-semibold min-w-[80px]">
                                    Address 1
                                  </label>
                                  <input
                                    type="text"
                                    className="w-full border p-2 rounded mt-1"
                                    value={addressData.address1}
                                    onChange={(e) =>
                                      setAddressData({
                                        ...addressData,
                                        address1: e.target.value,
                                      })
                                    }
                                  />

                                  <label className="block text-sm font-semibold m-w-[90px]">
                                    Address 2
                                  </label>
                                  <input
                                    type="text"
                                    className="w-full border p-2 rounded mt-1"
                                    value={addressData.address2}
                                    onChange={(e) =>
                                      setAddressData({
                                        ...addressData,
                                        address2: e.target.value,
                                      })
                                    }
                                  />
                                </div>

                                <div className="flex flex-row">
                                  <label className="block text-sm font-semibold mt-2">
                                    Country
                                  </label>
                                  <input
                                    type="text"
                                    className="w-full border p-2 rounded mt-1"
                                    value={addressData.country}
                                    onChange={(e) =>
                                      setAddressData({
                                        ...addressData,
                                        country: e.target.value,
                                      })
                                    }
                                  />

                                  <label className="block text-sm font-semibold mt-2 min-w-[80px]">
                                    ZIP Code
                                  </label>
                                  <input
                                    type="text"
                                    className="w-full border p-2 rounded mt-1"
                                    value={addressData.zipCode}
                                    onChange={(e) =>
                                      setAddressData({
                                        ...addressData,
                                        zipCode: e.target.value,
                                      })
                                    }
                                  />
                                </div>
                                <div className="flex justify-end gap-2 mt-3">
                                  <button
                                    className="bg-gray-300 px-3 py-1 rounded"
                                    onClick={() => setopenAddress({})}
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    className="bg-blue-500 text-white px-3 py-1 rounded"
                                    onClick={() => {
                                      handleUpdate(contact.id, {
                                        address:
                                          `${addressData.address1}, ${addressData.address2}, ${addressData.country}, ${addressData.zipCode}`.trim(),
                                      });
                                      setopenAddress({});
                                    }}
                                  >
                                    Save
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <span className="text-gray-700 dark:text-gray-300">
                                {contact.address1 ? (
                                  <>
                                    {contact.address1}, {contact.address2},{" "}
                                    {contact.country} - {contact.zipCode}
                                  </>
                                ) : (
                                  <span className="text-gray-700 dark:text-gray-300">
                                    {contact.address ? (
                                      <>{contact.address}</>
                                    ) : (
                                      <span className="text-gray-400 italic">
                                        Double-click to add address
                                      </span>
                                    )}
                                  </span>
                                )}
                              </span>
                            )}
                          </div>
                        )}
                      </TableRow>
                    )}
                  </>
                ))}
                {/* Desktop Veiw */}
                {filteredContacts.map((contact) => (
                  <TableRow key={contact.id} className="hidden md:table-row">
                    {selectedHeaders?.includes("Name") && (
                      <TableCell className="block md:table-cell left-0 bg-white dark:bg-gray-900 z-10 font-medium text-center cursor-pointer">
                        {editNameId === contact.id ? (
                          // Editing mode: Show input field
                          <input
                            type="text"
                            placeholder="Enter Name..."
                            className="px-2 py-1 border rounded-md w-full"
                            value={nameInfo}
                            onChange={(e) => setNameInfo(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                handleUpdate(contact.id, { name: nameInfo });
                                setEditNameId(null); // Exit edit mode after updating
                              } else if (e.key === "Escape") {
                                setEditNameId(null);
                                setNameInfo(contact.Name || ""); // Reset on cancel
                              }
                            }}
                            autoFocus
                          />
                        ) : (
                          // Normal display mode
                          <span
                            className="text-gray-700 dark:text-gray-300"
                            onDoubleClick={() => {
                              setEditNameId(contact.id);
                              setNameInfo(contact.Name || ""); // Pre-fill existing name
                            }}
                          >
                            {contact.Name || (
                              <span className="text-gray-400 italic">
                                Double-click to add name
                              </span>
                            )}
                          </span>
                        )}
                      </TableCell>
                    )}

                    {selectedHeaders.includes("Email") && (
                      <TableCell className="relative text-center cursor-pointer">
                        {editEmailId === contact.id ? (
                          <input
                            type="email"
                            placeholder="Enter Email..."
                            className="px-2 py-1 border rounded-md w-full"
                            value={emailInfo}
                            onChange={(e) => setEmailInfo(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                handleUpdate(contact.id, { email: emailInfo });
                                setEditEmailId(null);
                              } else if (e.key === "Escape") {
                                setEditEmailId(null);
                                setEmailInfo(contact.email || ""); // Reset on cancel
                              }
                            }}
                            autoFocus
                          />
                        ) : (
                          <div className="relative inline-block group">
                            {/* Email Text */}
                            <span
                              className="cursor-pointer group-hover:underline"
                              onDoubleClick={() => {
                                setEditEmailId(contact.id);
                                setEmailInfo(contact?.email || ""); // Pre-fill existing email
                              }}
                            >
                              {contact.email || (
                                <span className="text-gray-400 italic">
                                  Double-click to add email
                                </span>
                              )}
                            </span>

                            {/* Hover Menu - Ensures it appears properly */}
                            {contact.email && (
                              <div
                                className="absolute left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col bg-white shadow-md rounded-md p-2 w-[140px] border border-gray-200 z-50"
                                style={{
                                  bottom: "calc(100% )", // Ensures no gap
                                  transform: "translateX(-50%)",
                                  pointerEvents: "auto", // Ensures interaction
                                }}
                              >
                                {/* Send Email */}
                                <button
                                  onClick={() =>
                                    (window.location.href = `mailto:${contact.email}`)
                                  }
                                  className="flex items-center gap-2 text-sm text-gray-800 hover:text-blue-600 w-full text-left"
                                >
                                  <Send className="h-4 w-4 text-blue-500" />
                                  Send Email
                                </button>

                                {/* Open in Gmail */}
                                <button
                                  onClick={() =>
                                    window.open(
                                      `https://mail.google.com/mail/?view=cm&fs=1&to=${contact.email}`,
                                      "_blank"
                                    )
                                  }
                                  className="flex items-center gap-2 text-sm text-gray-800 hover:text-red-600 w-full text-left mt-1"
                                >
                                  <Mail className="h-4 w-4 text-red-500" />
                                  Open in Gmail
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </TableCell>
                    )}

                    {selectedHeaders.includes("Phone") && (
                      <TableCell className=" relative text-center cursor-pointer">
                        {editPhoneId === contact.id ? (
                          // Editing mode: Show input field
                          <input
                            type="text"
                            placeholder="Enter Phone..."
                            className="px-2 py-1 border rounded-md w-full"
                            value={phoneInfo}
                            onChange={(e) => setPhoneInfo(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                handleUpdate(contact.id, { phone: phoneInfo });
                                setEditPhoneId(null); // Exit edit mode after updating
                              } else if (e.key === "Escape") {
                                setEditPhoneId(null);
                                setPhoneInfo(contact.phone || ""); // Reset on cancel
                              }
                            }}
                            autoFocus
                          />
                        ) : (
                          <div className="inline-block group relative">
                            {/* Phone Number */}
                            <span
                              className="cursor-pointer group-hover:underline"
                              onDoubleClick={() => {
                                setEditPhoneId(contact.id);
                                setPhoneInfo(contact.phone || ""); // Pre-fill existing phone number
                              }}
                            >
                              {contact.phone || (
                                <span className="text-gray-400 italic">
                                  Double-click to add phone
                                </span>
                              )}
                            </span>

                            {/* Hover Menu - Appears Below */}
                            <div
                              className="absolute left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col bg-white shadow-md rounded-md p-2 w-[140px] border border-gray-200 z-50"
                              style={{
                                bottom: "calc(100% + 2px)", // Ensures no gap
                                transform: "translateX(-50%)",
                                pointerEvents: "auto", // Ensures interaction
                              }}
                            >
                              {/* WhatsApp */}
                              <button
                                onClick={() =>
                                  window.open(
                                    `https://wa.me/${contact.phone}`,
                                    "_blank"
                                  )
                                }
                                className="flex items-center gap-2 text-sm text-gray-800 hover:text-green-600"
                              >
                                <Send className="h-4 w-4 text-green-500" />
                                WhatsApp
                              </button>

                              {/* Call */}
                              <button
                                onClick={() =>
                                  (window.location.href = `tel:${contact.phone}`)
                                }
                                className="flex items-center gap-2 text-sm text-gray-800 hover:text-blue-600 mt-1"
                              >
                                <Phone className="h-4 w-4 text-blue-500" />
                                Call
                              </button>
                            </div>
                          </div>
                        )}
                      </TableCell>
                    )}

                    {selectedHeaders.includes("Email Validation") && (
                      <TableCell className=" text-center cursor-pointer">
                        {editEmailValidationId === contact.id ? (
                          // Editing mode: Show <select> dropdown
                          <select
                            className="px-2 py-1 border rounded-md"
                            value={emailValidation ? "true" : "false"}
                            onChange={async (e) => {
                              const newValue = e.target.value === "true"; // Convert to boolean
                              setEmailValidation(newValue);
                              await handleUpdate(contact.id, {
                                is_email_valid: newValue,
                              });
                              setEditEmailValidationId(null); // Exit edit mode after update
                            }}
                            autoFocus
                          >
                            <option
                              className="px-2 py-1 text-sm font-semibold rounded bg-green-200 text-green-800"
                              value="true"
                            >
                              True
                            </option>
                            <option
                              className="px-2 py-1 text-sm font-semibold rounded-l-md bg-red-200 text-red-800"
                              value="false"
                            >
                              False
                            </option>
                          </select>
                        ) : (
                          // Normal mode: Show colored text
                          <span
                            onDoubleClick={() => {
                              setEditEmailValidationId(contact.id);
                              setEmailValidation(contact.is_email_valid);
                            }}
                            className={`px-2 py-1 text-sm font-semibold rounded ${
                              contact.is_email_valid
                                ? "bg-green-200 text-green-800"
                                : "bg-red-200 text-red-800"
                            }`}
                          >
                            {contact.is_email_valid ? "True" : "False"}
                          </span>
                        )}
                      </TableCell>
                    )}
                    {selectedHeaders.includes("Platform") && (
                      <TableCell className=" w-[170px] text-center">
                        {contact.sourceId ? (
                          <WebhookStatus
                            sourceId={contact.sourceId}
                            workspaceId={workspaceId}
                          />
                        ) : (
                          <span className="text-gray-500">No Source</span>
                        )}
                      </TableCell>
                    )}

                    {selectedHeaders.includes("Bussiness Info") && (
                      <TableCell
                        className=" text-center cursor-pointer"
                        onDoubleClick={() => {
                          setEditInfoId(contact.id);
                          setBusinessInfo(contact.businessInfo || ""); // Pre-fill existing info
                        }}
                      >
                        {editInfoId === contact.id ? (
                          // Editing mode: Show input field
                          <input
                            type="text"
                            placeholder="Enter Business Info..."
                            className="px-2 py-1 border rounded-md w-full"
                            value={businessInfo}
                            onChange={(e) => setBusinessInfo(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                handleUpdate(contact.id, { businessInfo });
                                setEditInfoId(null);
                              } else if (e.key === "Escape") {
                                setEditInfoId(null);
                                setBusinessInfo(contact?.bussinessInfo || ""); // Clear input on cancel
                              }
                            }}
                            autoFocus
                          />
                        ) : (
                          // Normal display mode
                          <span className="text-gray-700 dark:text-gray-300">
                            {contact.businessInfo || (
                              <span className="text-gray-400 italic">
                                Double-click to add info
                              </span>
                            )}
                          </span>
                        )}
                      </TableCell>
                    )}
                    {selectedHeaders.includes("Tag") && (
                      <TableCell
                        className=" border-none cursor-pointer"
                        onDoubleClick={() => {
                          setOpenDropdownId(contact.id); // Open dropdown on double-click
                        }}
                      >
                        <div className="flex flex-col gap-2 items-center">
                          <div className="flex flex-row flex-wrap gap-2 items-center">
                            {(() => {
                              const parsedTags =
                                typeof contact?.tag === "string"
                                  ? JSON.parse(contact.tag)
                                  : contact?.tag || [];

                              return Array.isArray(parsedTags) ? (
                                parsedTags.map((tag: string) => (
                                  <div
                                    key={tag}
                                    className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-md"
                                  >
                                    <div
                                      className="h-3 w-3 rounded-lg"
                                      style={{
                                        backgroundColor:
                                          tags.find((t) => t.name === tag)
                                            ?.color || "#ccc",
                                      }}
                                    />
                                    <span className="text-sm font-medium">
                                      {tag}
                                    </span>
                                    <button
                                      onClick={() =>
                                        handleRemoveTag(contact.id, tag)
                                      }
                                      className="text-xs text-red-500 hover:text-red-700"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                ))
                              ) : (
                                <span className="text-gray-400 italic">
                                  Double click to add tags
                                </span>
                              );
                            })()}
                          </div>

                          {/* Select Dropdown (Now opens on double-click) */}
                          <Select
                            open={openDropdownId === contact.id} // Control dropdown visibility
                            onOpenChange={(isOpen) => {
                              if (!isOpen) setOpenDropdownId(null); // Close when user clicks outside
                            }}
                            onValueChange={(value) =>
                              handleTagChange(contact.id, value)
                            }
                          >
                            {openDropdownId === contact.id && (
                              <SelectTrigger className="relative w-[180px] overflow-hidden rounded-xl border-0 bg-white px-4 py-2 shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl dark:bg-gray-800">
                                <span className="text-sm font-medium">
                                  + Add Tag
                                </span>
                              </SelectTrigger>
                            )}

                            <SelectContent className="hidden md:flex   w-[200px] overflow-hidden rounded-xl border-0 bg-white p-2 shadow-2xl dark:bg-gray-800">
                              <div className="hidden md:flex flex-col gap-2">
                                {tags.map((tag) => (
                                  <SelectItem key={tag.name} value={tag.name}>
                                    <div className="hidden group md:flex items-center gap-3 rounded-lg p-2 transition-all hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                      <div className="relative">
                                        <div
                                          className="absolute -inset-1 rounded-lg opacity-20 blur-sm transition-all duration-200 group-hover:opacity-40"
                                          style={{ backgroundColor: tag.color }}
                                        />
                                        <div
                                          className="relative h-3 w-3 rounded-lg transition-transform duration-200 group-hover:scale-110"
                                          style={{ backgroundColor: tag.color }}
                                        />
                                      </div>
                                      <span
                                        className={`text-sm font-medium ${
                                          selectedTags[contact.id]?.includes(
                                            tag.name
                                          )
                                            ? "font-bold text-blue-600"
                                            : "text-gray-700 dark:text-gray-200"
                                        }`}
                                      >
                                        {tag.name}
                                      </span>
                                    </div>
                                  </SelectItem>
                                ))}
                              </div>
                            </SelectContent>
                          </Select>
                        </div>
                      </TableCell>
                    )}

                    {selectedHeaders.includes("Address") && (
                      <TableCell
                        className=" text-center cursor-pointer relative"
                        onDoubleClick={() => {
                          setopenAddress(contact.id);
                          setAddressData({
                            address1: contact.address
                              ? contact.address.split(",")[0]
                              : "",
                            address2: contact.address
                              ? contact.address.split(",")[1]?.trim() || ""
                              : "",
                            country: contact.address
                              ? contact.address.split(",")[2]?.trim() || ""
                              : "",
                            zipCode: contact.address
                              ? contact.address.split(",")[3]?.trim() || ""
                              : "",
                          });
                        }}
                      >
                        {openAddress === contact.id ? (
                          <div className="absolute left-1/4 -translate-x-[65%]  bg-white border shadow-lg rounded-md p-4 w-[450px] z-50">
                            <div className="flex flex-row items-center mb-4">
                              <label className="block text-sm font-semibold min-w-[80px]">
                                Address 1
                              </label>
                              <input
                                type="text"
                                className="w-full border p-2 rounded mt-1"
                                value={addressData.address1}
                                onChange={(e) =>
                                  setAddressData({
                                    ...addressData,
                                    address1: e.target.value,
                                  })
                                }
                              />

                              <label className="block text-sm font-semibold m-w-[90px]">
                                Address 2
                              </label>
                              <input
                                type="text"
                                className="w-full border p-2 rounded mt-1"
                                value={addressData.address2}
                                onChange={(e) =>
                                  setAddressData({
                                    ...addressData,
                                    address2: e.target.value,
                                  })
                                }
                              />
                            </div>

                            <div className="flex flex-row">
                              <label className="block text-sm font-semibold mt-2">
                                Country
                              </label>
                              <input
                                type="text"
                                className="w-full border p-2 rounded mt-1"
                                value={addressData.country}
                                onChange={(e) =>
                                  setAddressData({
                                    ...addressData,
                                    country: e.target.value,
                                  })
                                }
                              />

                              <label className="block text-sm font-semibold mt-2 min-w-[80px]">
                                ZIP Code
                              </label>
                              <input
                                type="text"
                                className="w-full border p-2 rounded mt-1"
                                value={addressData.zipCode}
                                onChange={(e) =>
                                  setAddressData({
                                    ...addressData,
                                    zipCode: e.target.value,
                                  })
                                }
                              />
                            </div>
                            <div className="flex justify-end gap-2 mt-3">
                              <button
                                className="bg-gray-300 px-3 py-1 rounded"
                                onClick={() => setopenAddress({})}
                              >
                                Cancel
                              </button>
                              <button
                                className="bg-blue-500 text-white px-3 py-1 rounded"
                                onClick={() => {
                                  handleUpdate(contact.id, {
                                    address:
                                      `${addressData.address1}, ${addressData.address2}, ${addressData.country}, ${addressData.zipCode}`.trim(),
                                  });
                                  setopenAddress({});
                                }}
                              >
                                Save
                              </button>
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-700 dark:text-gray-300">
                            {contact.address1 ? (
                              <>
                                {contact.address1}, {contact.address2},{" "}
                                {contact.country} - {contact.zipCode}
                              </>
                            ) : (
                              <span className="text-gray-700 dark:text-gray-300">
                                {contact.address ? (
                                  <>{contact.address}</>
                                ) : (
                                  <span className="text-gray-400 italic">
                                    Double-click to add address
                                  </span>
                                )}
                              </span>
                            )}
                          </span>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {/* {dropdownOpen && (
            <div className="absolute left-0 mt-2 bg-white border shadow-lg rounded-md p-2 w-40 z-50">
              <select
                className="border p-2 rounded"
                value={newColumn}
                onChange={(e) => setNewColumn(e.target.value)}
              >
                <option value="">Select Column</option>
                {tableHeaders
                  .filter((header) => !selectedHeaders.includes(header))
                  .map((header) => (
                    <option key={header} value={header}>
                      {header}
                    </option>
                  ))}
              </select>
              <button
                onClick={addColumn}
                className="bg-green-500 text-white px-3 py-2 rounded ml-2 hover:bg-green-600"
              >
                Add
              </button>
            </div>
          )} */}
          </div>
        </div>
      </div>

      {/* Pagination */}
      {contacts.length > 10 && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Select
              value={String(itemsPerPage)}
              onValueChange={(value) => {
                setItemsPerPage(Number(value));
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5 per page</SelectItem>
                <SelectItem value="10">10 per page</SelectItem>
                <SelectItem value="20">20 per page</SelectItem>
                <SelectItem value="50">50 per page</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm text-gray-500">
              Showing {startIndex + 1} to{" "}
              {Math.min(startIndex + itemsPerPage, filteredContacts.length)} of{" "}
              {filteredContacts.length} entries
            </span>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((page) => {
                const distance = Math.abs(page - currentPage);
                return (
                  distance === 0 ||
                  distance === 1 ||
                  page === 1 ||
                  page === totalPages
                );
              })
              .map((page, i, arr) => (
                <React.Fragment key={page}>
                  {i > 0 && arr[i - 1] !== page - 1 && (
                    <Button variant="outline" size="icon" disabled>
                      ...
                    </Button>
                  )}
                  <Button
                    variant={currentPage === page ? "default" : "outline"}
                    size="icon"
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </Button>
                </React.Fragment>
              ))}
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
