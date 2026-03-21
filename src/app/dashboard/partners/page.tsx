"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createPartnerAccount,
  getUsers,
  updatePartner,
  updateUserStatus,
  UsersFilter,
} from "@/lib/api/users";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Search,
  Filter,
  Eye,
  Pencil,
  Plus,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Mail,
  Phone,
  Star,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";
import Swal from "sweetalert2";

type PartnerFormState = {
  fullName: string;
  email: string;
  phone: string;
  isActive: boolean;
  isVerified: boolean;
};

const initialPartnerForm: PartnerFormState = {
  fullName: "",
  email: "",
  phone: "",
  isActive: true,
  isVerified: false,
};

export default function PartnersPage() {
  const queryClient = useQueryClient();
  const [formMode, setFormMode] = useState<"add" | "edit">("add");
  const [editingPartnerId, setEditingPartnerId] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [partnerForm, setPartnerForm] =
    useState<PartnerFormState>(initialPartnerForm);

  const [filter, setFilter] = useState<UsersFilter>({
    role: "mitra",
    search: "",
    isActive: "all",
    isVerified: "all",
    page: 1,
    limit: 20,
  });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["users", filter],
    queryFn: () => getUsers(filter),
  });

  const verifyMutation = useMutation({
    mutationFn: ({
      userId,
      isVerified,
    }: {
      userId: string;
      isVerified: boolean;
    }) => updateUserStatus(userId, { is_verified: isVerified }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });

  const createPartnerMutation = useMutation({
    mutationFn: () =>
      createPartnerAccount({
        full_name: partnerForm.fullName.trim() || null,
        email: partnerForm.email.trim(),
        phone: partnerForm.phone.trim() || null,
        is_active: partnerForm.isActive,
        is_verified: partnerForm.isVerified,
      }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setIsDialogOpen(false);
      setPartnerForm(initialPartnerForm);
      void Swal.fire({
        icon: "success",
        title: "Partner added",
        text: `Temporary password: ${result.temporaryPassword}`,
      });
    },
    onError: (error) => {
      console.error("Error creating partner:", error);
      void Swal.fire({
        icon: "error",
        title: "Failed to add partner",
        text: error instanceof Error ? error.message : "Please try again.",
      });
    },
  });

  const updatePartnerMutation = useMutation({
    mutationFn: () => {
      if (!editingPartnerId) {
        throw new Error("No partner selected for edit");
      }

      return updatePartner(editingPartnerId, {
        full_name: partnerForm.fullName.trim() || null,
        email: partnerForm.email.trim() || null,
        phone: partnerForm.phone.trim() || null,
        is_active: partnerForm.isActive,
        is_verified: partnerForm.isVerified,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setIsDialogOpen(false);
      setEditingPartnerId(null);
      setPartnerForm(initialPartnerForm);
      void Swal.fire({
        icon: "success",
        title: "Partner updated",
      });
    },
    onError: (error) => {
      console.error("Error updating partner:", error);
      void Swal.fire({
        icon: "error",
        title: "Failed to update partner",
        text: error instanceof Error ? error.message : "Please try again.",
      });
    },
  });

  const isSubmitting =
    createPartnerMutation.isPending || updatePartnerMutation.isPending;

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setFilter((prev) => ({
      ...prev,
      search: formData.get("search") as string,
      page: 1,
    }));
  };

  const handleStatusChange = (status: string) => {
    setFilter((prev) => ({
      ...prev,
      isActive: status === "all" ? "all" : status === "active",
      page: 1,
    }));
  };

  const handleVerifiedChange = (verified: string) => {
    setFilter((prev) => ({
      ...prev,
      isVerified: verified === "all" ? "all" : verified === "verified",
      page: 1,
    }));
  };

  const handlePageChange = (newPage: number) => {
    setFilter((prev) => ({ ...prev, page: newPage }));
  };

  const openAddDialog = () => {
    setFormMode("add");
    setEditingPartnerId(null);
    setPartnerForm(initialPartnerForm);
    setIsDialogOpen(true);
  };

  const openEditDialog = (user: any) => {
    setFormMode("edit");
    setEditingPartnerId(user.id);
    setPartnerForm({
      fullName: user.full_name || "",
      email: user.email || "",
      phone: user.phone || "",
      isActive: Boolean(user.is_active),
      isVerified: Boolean(user.is_verified),
    });
    setIsDialogOpen(true);
  };

  const handleSubmitPartner = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!partnerForm.email.trim()) {
      void Swal.fire({
        icon: "warning",
        title: "Email is required",
      });
      return;
    }

    if (formMode === "add") {
      createPartnerMutation.mutate();
      return;
    }

    updatePartnerMutation.mutate();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Partners (Mitra)</h1>
          <p className="text-muted-foreground">Manage service providers</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={openAddDialog} size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Add Partner
          </Button>
          <Button onClick={() => refetch()} variant="outline" size="sm">
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {formMode === "add" ? "Add Partner" : "Edit Partner"}
            </DialogTitle>
            <DialogDescription>
              {formMode === "add"
                ? "Create a partner account automatically from email, name, and phone."
                : "Update partner profile information."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitPartner} className="space-y-4">
            {formMode === "edit" && (
              <div className="space-y-2">
                <Label>Auth User ID</Label>
                <Input value={editingPartnerId || ""} readOnly disabled />
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  value={partnerForm.fullName}
                  onChange={(e) =>
                    setPartnerForm((prev) => ({
                      ...prev,
                      fullName: e.target.value,
                    }))
                  }
                  placeholder="Partner full name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={partnerForm.email}
                  onChange={(e) =>
                    setPartnerForm((prev) => ({
                      ...prev,
                      email: e.target.value,
                    }))
                  }
                  placeholder="partner@email.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={partnerForm.phone}
                  onChange={(e) =>
                    setPartnerForm((prev) => ({
                      ...prev,
                      phone: e.target.value,
                    }))
                  }
                  placeholder="08xxxxxxxxxx"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="partnerStatus">Status</Label>
                <Select
                  value={partnerForm.isActive ? "active" : "inactive"}
                  onValueChange={(value) =>
                    setPartnerForm((prev) => ({
                      ...prev,
                      isActive: value === "active",
                    }))
                  }
                >
                  <SelectTrigger id="partnerStatus">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="partnerVerified">Verification</Label>
                <Select
                  value={partnerForm.isVerified ? "verified" : "unverified"}
                  onValueChange={(value) =>
                    setPartnerForm((prev) => ({
                      ...prev,
                      isVerified: value === "verified",
                    }))
                  }
                >
                  <SelectTrigger id="partnerVerified">
                    <SelectValue placeholder="Select verification" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="verified">Verified</SelectItem>
                    <SelectItem value="unverified">Unverified</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting
                  ? "Saving..."
                  : formMode === "add"
                    ? "Create Partner"
                    : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 sm:flex-row">
            <form onSubmit={handleSearch} className="flex flex-1 gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  name="search"
                  placeholder="Search by name, email, or phone..."
                  className="pl-9"
                  defaultValue={filter.search}
                />
              </div>
              <Button type="submit" variant="secondary">
                Search
              </Button>
            </form>

            <Select
              value={
                filter.isActive === "all"
                  ? "all"
                  : filter.isActive
                    ? "active"
                    : "inactive"
              }
              onValueChange={handleStatusChange}
            >
              <SelectTrigger className="w-[150px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={
                filter.isVerified === "all"
                  ? "all"
                  : filter.isVerified
                    ? "verified"
                    : "unverified"
              }
              onValueChange={handleVerifiedChange}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Verified" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="verified">Verified</SelectItem>
                <SelectItem value="unverified">Unverified</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Partners List</CardTitle>
          <CardDescription>{data?.total || 0} partners found</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Partner</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Rating</TableHead>
                      <TableHead>Jobs</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Verified</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data?.users.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="h-24 text-center">
                          No partners found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      data?.users.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar>
                                <AvatarFallback className="bg-orange-500 text-white">
                                  {user.full_name?.[0] || "M"}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">
                                  {user.full_name || "No Name"}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Wallet: Rp{" "}
                                  {user.wallet_balance?.toLocaleString(
                                    "id-ID",
                                  ) || 0}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 text-sm">
                                <Mail className="h-3 w-3" />
                                {user.email}
                              </div>
                              {user.phone && (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <Phone className="h-3 w-3" />
                                  {user.phone}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                              <span>{user.rating?.toFixed(1) || "-"}</span>
                            </div>
                          </TableCell>
                          <TableCell>{user.total_jobs || 0}</TableCell>
                          <TableCell>
                            <Badge
                              variant={user.is_active ? "default" : "secondary"}
                              className={user.is_active ? "bg-green-500" : ""}
                            >
                              {user.is_active ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {user.is_verified ? (
                              <CheckCircle className="h-5 w-5 text-green-500" />
                            ) : (
                              <XCircle className="h-5 w-5 text-red-500" />
                            )}
                          </TableCell>
                          <TableCell>
                            {format(new Date(user.created_at), "MMM dd, yyyy")}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Link href={`/dashboard/partners/${user.id}`}>
                                <Button variant="ghost" size="icon">
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </Link>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEditDialog(user)}
                                title="Edit partner"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              {!user.is_verified && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-green-600"
                                  onClick={() =>
                                    verifyMutation.mutate({
                                      userId: user.id,
                                      isVerified: true,
                                    })
                                  }
                                >
                                  Verify
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {data && data.totalPages > 1 && (
                <div className="flex items-center justify-between px-2 py-4">
                  <p className="text-sm text-muted-foreground">
                    Page {data.page} of {data.totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={data.page <= 1}
                      onClick={() => handlePageChange(data.page - 1)}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={data.page >= data.totalPages}
                      onClick={() => handlePageChange(data.page + 1)}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
