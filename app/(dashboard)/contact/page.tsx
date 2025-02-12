"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

export default function ContactPage() {
  const router = useRouter();
  const [contacts, setContacts] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [leads, setLeads] = useState<any[]>([]);
  const [editInfoId, setEditInfoId] = useState(null);
  const [businessInfo, setBusinessInfo] = useState(""); // Single field for input
  // const [selectedTags, setSelectedTags] = useState<string[]>(leads.tags ?? []);

  const [updateLead, { isLoading }] = useUpdateLeadMutation();

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

  const POLLING_INTERVAL = 10000;
  const { data: statusData, isLoading: isLoadingStatus }: any =
    useGetStatusQuery(workspaceId);

  // **Filter Leads into Contacts**
  const contactStatuses = new Set([
    "Proposal Sent",
    "Lost - To Competition",
    "Interaction",
    "Warm-Tentative 1",
    "Lost- Venue Not Available",
    "First Interaction",
    "Duplicate",
    "Converted",
    "Cancelled- Only Query",
    "Hot-Tentative 2",
  ]);

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
            sourceId: lead.lead_source_id || null,
            businessInfo: lead.businessInfo ?? "",
            tag: lead.tags ?? [], // Instead of a single string, store an array
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

  useEffect(() => {}, [contacts]);

  // Filter contacts based on search and status
  const filteredContacts = contacts?.filter((contact) => {
    // Normalize search and statusFilter
    const searchLower = search.toLowerCase();
    const statusLower = statusFilter.toLowerCase();

    // Check if contact matches search (Name, email, or phone)
    const matchesSearch =
      contact?.Name?.toLowerCase().includes(searchLower) ||
      contact?.email?.toLowerCase().includes(searchLower) ||
      contact?.phone?.includes(search);

    // Check if contact matches selected status (handling case sensitivity)
    const matchesStatus =
      statusFilter === "all" ||
      contact?.status?.name?.toLowerCase() === statusLower;

    return matchesSearch && matchesStatus;
  });

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

  const tags = [
    { name: "Facebook", color: "#1877F2" }, // Blue
    { name: "SEO", color: "#22C55E" }, // Green
    { name: "Google Ads", color: "#FACC15" }, // Yellow
    { name: "LinkedIn", color: "#0A66C2" }, // Dark Blue
  ];

  const handleUpdate = async (
    id: string | number,
    updatedData: Partial<{ businessInfo: string; tags: string[] }> // Change 'tag' to 'tags' as an array
  ) => {
    if (
      !updatedData.businessInfo?.trim() &&
      (!updatedData.tags || updatedData.tags.length === 0)
    )
      return; // Prevent empty updates

    try {
      await updateLead({
        id,
        leads: updatedData, // Ensure correct structure
      }).unwrap();
    } catch (error) {
      console.error("Update failed", error);
    }
  };

  const [selectedTags, setSelectedTags] = useState<Record<string, string[]>>(
    {}
  );

  const handleTagChange = (id: string, value: string) => {
    setSelectedTags((prev) => {
      const currentTags = prev[id] || [];
      const updatedTags = currentTags.includes(value)
        ? currentTags.filter((tag) => tag !== value) // Remove if already selected
        : [...currentTags, value]; // Add if not selected

      // 🔥 Update backend AFTER updating state
      setTimeout(() => {
        handleUpdate(id, { tags: updatedTags });
      }, 0);

      return { ...prev, [id]: updatedTags };
    });
  };

  // Calculate pagination
  const totalPages = Math.ceil(filteredContacts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedContacts = filteredContacts.slice(
    startIndex,
    startIndex + itemsPerPage
  );

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
    <div className="p-6 max-w-7xl mx-auto space-y-6">
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
      <div className="flex gap-4 items-center">
        {/* Search Input */}
        <div className="flex-1 relative">
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
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            {/* Default "All Status" option */}
            <SelectItem value="all">All Status</SelectItem>

            {/* Convert Set to Array and map over it */}
            {[...contactStatuses].map((status) => (
              <SelectItem key={status} value={status.toLowerCase()}>
                {status}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Contacts Table */}
      <div className="border rounded-lg">
        <div className="w-full overflow-x-auto">
          <Table className="min-w-full border-collapse table-auto">
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 bg-white dark:bg-gray-900 z-10 w-[100px] text-center">
                  Name
                </TableHead>
                <TableHead className="w-[150px] text-center">Email</TableHead>
                <TableHead className="w-[100px] text-center">Phone</TableHead>
                <TableHead className="w-[100px] text-center">Status</TableHead>
                <TableHead className="w-[100px] text-center">
                  Email Validation
                </TableHead>
                <TableHead className="w-[170px] text-center">
                  Platform
                </TableHead>
                <TableHead className="w-[200px] text-center">
                  Bussiness Info
                </TableHead>
                <TableHead className="w-[100px] text-center">Tag</TableHead>
                {/* <TableHead className="min-w-[50px] text-center">
                  Actions
                </TableHead> */}
              </TableRow>
            </TableHeader>
            <TableBody>
              {contacts.map((contact) => (
                <TableRow key={contact.id}>
                  <TableCell className="left-0 bg-white dark:bg-gray-900 z-10 font-medium w-[150px] text-center">
                    {contact.Name}
                  </TableCell>
                  <TableCell className="relative group w-[150px] text-center">
                    <div className="inline-block relative">
                      {/* Email Address */}
                      <span className="cursor-pointer group-hover:underline">
                        {contact.email}
                      </span>

                      {/* Hover Menu - Appears Above or Below */}
                      <div
                        className="absolute left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col bg-white shadow-md rounded-md p-2 w-[140px] border border-gray-200 z-50 pointer-events-none"
                        style={{
                          bottom: "calc(100% + 2px)", // Ensures no gap
                          transform: "translateX(-50%)",
                          pointerEvents: "auto", // Ensures interaction
                        }}
                      >
                        {/* Ensure menu remains clickable */}
                        <div className="pointer-events-auto">
                          <button
                            onClick={() =>
                              (window.location.href = `mailto:${contact.email}`)
                            }
                            className="flex items-center gap-2 text-sm text-gray-800 hover:text-red-600"
                          >
                            <Mail className="h-4 w-4 text-red-500" />
                            Send Email
                          </button>
                        </div>
                      </div>
                    </div>
                  </TableCell>

                  {/* Phone Number with Hover Menu */}
                  {/* Phone Number with Hover Menu */}
                  <TableCell className="relative text-center w-[100px]">
                    <div className="inline-block group relative">
                      {/* Phone Number */}
                      <span className="cursor-pointer group-hover:underline">
                        {contact.phone}
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

                        {/* SMS */}
                        {/* <button
                          onClick={() =>
                            (window.location.href = `sms:${contact.phone}`)
                          }
                          className="flex items-center gap-2 text-sm text-gray-800 hover:text-purple-600 mt-1"
                        >
                          <MessageCircle className="h-4 w-4 text-purple-500" />
                          SMS
                        </button> */}
                      </div>
                    </div>
                  </TableCell>

                  <TableCell className="min-w-[200px] text-center">
                    <span
                      className="px-2 py-1 rounded-full text-xs text-white"
                      style={{ backgroundColor: contact?.status?.color }}
                    >
                      {contact?.status?.name}
                    </span>
                  </TableCell>
                  <TableCell className="w-[100px] text-center">
                    <span
                      className={`px-2 py-1 text-sm font-semibold rounded ${
                        contact.is_email_valid
                          ? "bg-green-200 text-green-800"
                          : "bg-red-200 text-red-800"
                      }`}
                    >
                      {contact.is_email_valid ? "True" : "False"}
                    </span>
                  </TableCell>
                  <TableCell className="w-[170px] text-center">
                    {contact.sourceId ? (
                      <WebhookStatus
                        sourceId={contact.sourceId}
                        workspaceId={workspaceId}
                      />
                    ) : (
                      <span className="text-gray-500">No Source</span>
                    )}
                  </TableCell>

                  <TableCell className="w-[250px] text-center">
                    {contact.businessInfo ? (
                      editInfoId === contact.id ? (
                        // If editing mode is enabled, show input and buttons
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Enter Business Info..."
                            className="px-2 py-1 border rounded-md w-full"
                            value={businessInfo}
                            onChange={(e) => setBusinessInfo(e.target.value)}
                          />
                          <button
                            onClick={() =>
                              handleUpdate(contact.id, { businessInfo })
                            }
                            className="px-1 py-1 bg-green-500 text-white rounded-md hover:bg-green-600"
                            disabled={isLoading}
                          >
                            {isLoading ? "Saving..." : "✅"}
                          </button>
                          <button
                            onClick={() => {
                              setEditInfoId(null);
                              setBusinessInfo(""); // Clear input on cancel
                            }}
                            className="px-1 py-1 bg-gray-400 text-white rounded-md hover:bg-gray-500"
                          >
                            ❌
                          </button>
                        </div>
                      ) : (
                        // If businessInfo exists but not in edit mode, show info with edit button
                        <div className="flex items-center justify-center gap-2">
                          <span className="text-gray-700 dark:text-gray-300">
                            {contact.businessInfo}
                          </span>
                          <button
                            onClick={() => {
                              setEditInfoId(contact.id);
                              setBusinessInfo(contact.businessInfo || ""); // Pre-fill existing info
                            }}
                            className="px-2 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                          >
                            Edit
                          </button>
                        </div>
                      )
                    ) : (
                      // If no businessInfo exists, show "Add Info" button
                      <button
                        onClick={() => {
                          setEditInfoId(contact.id);
                          setBusinessInfo(""); // Start with empty input
                        }}
                        className="px-2 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                      >
                        Add Info
                      </button>
                    )}
                  </TableCell>

                  <TableCell className=" w-[150px] border-none">
                    <Select>
                      <SelectTrigger className="group relative w-[200px] overflow-hidden rounded-xl border-0 bg-white px-4 py-3 shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl dark:bg-gray-800">
                        <div className="flex flex-wrap items-center gap-2">
                          {selectedTags[contact.id]?.length > 0 ? (
                            selectedTags[contact.id].map((tag) => (
                              <div
                                key={tag}
                                className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-md"
                              >
                                <div
                                  className="h-3 w-3 rounded-lg"
                                  style={{
                                    backgroundColor:
                                      tags.find((t) => t.name === tag)?.color ||
                                      "#ccc",
                                  }}
                                />
                                <span className="text-sm font-medium">
                                  {tag}
                                </span>
                              </div>
                            ))
                          ) : (
                            <span className="text-sm font-medium">
                              Select Tags
                            </span>
                          )}
                        </div>
                      </SelectTrigger>

                      <SelectContent className="overflow-hidden rounded-xl border-0 bg-white p-2 shadow-2xl dark:bg-gray-800">
                        {tags.map((tag) => {
                          const isSelected =
                            selectedTags[contact.id]?.includes(tag.name) ||
                            false;

                          return (
                            <SelectItem
                              key={tag.name}
                              value={tag.name} // Store only the tag name
                              className="cursor-pointer rounded-lg outline-none transition-colors focus:bg-transparent"
                              onClick={() =>
                                handleTagChange(contact.id, tag.name)
                              }
                              // Handle multi-selection manually
                            >
                              <div className="group flex items-center gap-3 rounded-lg p-2 transition-all hover:bg-gray-50 dark:hover:bg-gray-700/50">
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
                                    isSelected
                                      ? "font-bold text-blue-600"
                                      : "text-gray-700 dark:text-gray-200"
                                  }`}
                                >
                                  {tag.name}
                                </span>
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </TableCell>

                  {/* <TableCell className="min-w-[200px] text-center">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            window.location.href = `mailto:${contact.email}`;
                          }}
                          className="cursor-pointer"
                        >
                          <Mail className="mr-2 h-4 w-4" />
                          Email
                        </DropdownMenuItem>

                        <DropdownMenuItem>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() =>
                              initiateDirectContact(
                                contact,
                                contact.contact_method
                              )
                            }
                            className="h-6 w-6"
                            title={`Contact via ${contact.contact_method}`}
                          >
                            {contact.contact_method === "WhatsApp" && (
                              <Send className="h-3 w-3" />
                            )}
                            {contact?.contact_method === "Call" && (
                              <Phone className="h-3 w-3" />
                            )}
                            {contact?.contact_method === "SMS" && (
                              <MessageCircle className="h-3 w-3" />
                            )}
                          </Button>
                          Call
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <User
                            variant="outline"
                            size="icon"
                            onClick={() => handleView(contact.id)}
                            className="h-3 w-3"
                          />
                          View Profile
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell> */}
                </TableRow>
              ))}
            </TableBody>
          </Table>
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
