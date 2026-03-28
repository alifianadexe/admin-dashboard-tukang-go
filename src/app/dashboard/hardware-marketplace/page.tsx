"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createHardwareMarketplaceItem,
  deleteHardwareMarketplaceItem,
  getHardwareMarketplaceItems,
  updateHardwareMarketplaceItem,
} from "@/lib/api/hardware-marketplace";
import { HardwareMarketplaceItem } from "@/types/database";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Pencil, Trash2, RefreshCw, Store } from "lucide-react";

interface HardwareItemFormData {
  name: string;
  category: string;
  unit: string;
  stock_amount: string;
  price: string;
  original_price: string;
  discount_label: string;
  description: string;
  image_url: string;
  store_name: string;
  store_phone: string;
  store_whatsapp_phone: string;
  store_address: string;
  display_order: string;
  is_active: boolean;
}

const initialFormData: HardwareItemFormData = {
  name: "",
  category: "",
  unit: "unit",
  stock_amount: "0",
  price: "",
  original_price: "",
  discount_label: "",
  description: "",
  image_url: "",
  store_name: "",
  store_phone: "",
  store_whatsapp_phone: "",
  store_address: "",
  display_order: "0",
  is_active: true,
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function calculateDiscountPercent(
  item: HardwareMarketplaceItem,
): number | null {
  if (!item.original_price || item.original_price <= item.price) {
    return null;
  }

  return Math.round(
    ((item.original_price - item.price) / item.original_price) * 100,
  );
}

export default function HardwareMarketplacePage() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [editingItem, setEditingItem] =
    useState<HardwareMarketplaceItem | null>(null);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);
  const [formData, setFormData] =
    useState<HardwareItemFormData>(initialFormData);

  const {
    data: hardwareItems,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["hardware-marketplace-items"],
    queryFn: getHardwareMarketplaceItems,
  });

  const createMutation = useMutation({
    mutationFn: createHardwareMarketplaceItem,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["hardware-marketplace-items"],
      });
      setDialogOpen(false);
      setFormError(null);
      setFormData(initialFormData);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Parameters<typeof updateHardwareMarketplaceItem>[1];
    }) => updateHardwareMarketplaceItem(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["hardware-marketplace-items"],
      });
      setDialogOpen(false);
      setFormError(null);
      setEditingItem(null);
      setFormData(initialFormData);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteHardwareMarketplaceItem,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["hardware-marketplace-items"],
      });
      setDeleteDialogOpen(false);
      setDeletingItemId(null);
    },
  });

  const handleOpenDialog = (item?: HardwareMarketplaceItem) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        name: item.name,
        category: item.category || "",
        unit: item.unit,
        stock_amount: item.stock_amount.toString(),
        price: item.price.toString(),
        original_price: item.original_price?.toString() || "",
        discount_label: item.discount_label || "",
        description: item.description || "",
        image_url: item.image_url || "",
        store_name: item.store_name,
        store_phone: item.store_phone,
        store_whatsapp_phone: item.store_whatsapp_phone || "",
        store_address: item.store_address || "",
        display_order: item.display_order.toString(),
        is_active: item.is_active,
      });
    } else {
      setEditingItem(null);
      setFormData(initialFormData);
    }

    setFormError(null);
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const price = Number(formData.price);
    const stockAmount = Number(formData.stock_amount);
    const originalPrice = formData.original_price.trim().length
      ? Number(formData.original_price)
      : null;

    if (!price || price <= 0) {
      setFormError("Price must be greater than zero.");
      return;
    }

    if (stockAmount < 0) {
      setFormError("Stock amount cannot be negative.");
      return;
    }

    if (originalPrice !== null && originalPrice < price) {
      setFormError(
        "Original price must be greater than or equal to current price.",
      );
      return;
    }

    setFormError(null);

    const data = {
      name: formData.name,
      category: formData.category || undefined,
      unit: formData.unit,
      stock_amount: stockAmount,
      price,
      original_price: originalPrice,
      discount_label: formData.discount_label || undefined,
      description: formData.description || undefined,
      image_url: formData.image_url || undefined,
      store_name: formData.store_name,
      store_phone: formData.store_phone,
      store_whatsapp_phone: formData.store_whatsapp_phone || undefined,
      store_address: formData.store_address || undefined,
      display_order: Number(formData.display_order) || 0,
      is_active: formData.is_active,
    };

    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDelete = (itemId: string) => {
    setDeletingItemId(itemId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (deletingItemId) {
      deleteMutation.mutate(deletingItemId);
    }
  };

  const toggleItemStatus = (item: HardwareMarketplaceItem) => {
    updateMutation.mutate({
      id: item.id,
      data: { is_active: !item.is_active },
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Hardware Marketplace</h1>
          <p className="text-muted-foreground">
            Manage materials, prices, store references, and discount highlights.
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => refetch()} variant="outline" size="sm">
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button
            onClick={() => handleOpenDialog()}
            className="bg-orange-500 hover:bg-orange-600"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Material
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Materials List</CardTitle>
          <CardDescription>
            {hardwareItems?.length || 0} materials listed
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Material</TableHead>
                    <TableHead>Store</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Discount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {hardwareItems?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center">
                        No materials found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    hardwareItems?.map((item) => {
                      const discountPercent = calculateDiscountPercent(item);

                      return (
                        <TableRow key={item.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100">
                                <Store className="h-5 w-5 text-orange-600" />
                              </div>
                              <div>
                                <p className="font-medium">{item.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {item.category || "General"} • {item.unit}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{item.store_name}</p>
                              <p className="text-xs text-muted-foreground">
                                {item.store_phone}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">
                                {formatCurrency(item.price)}
                              </p>
                              {item.original_price &&
                                item.original_price > item.price && (
                                  <p className="text-xs text-muted-foreground line-through">
                                    {formatCurrency(item.original_price)}
                                  </p>
                                )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {item.stock_amount.toLocaleString("id-ID")}
                          </TableCell>
                          <TableCell>
                            {discountPercent ? (
                              <Badge className="bg-red-500">
                                -{discountPercent}%
                              </Badge>
                            ) : (
                              <Badge variant="secondary">-</Badge>
                            )}
                            {item.discount_label && (
                              <p className="mt-1 text-xs text-muted-foreground">
                                {item.discount_label}
                              </p>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={item.is_active ? "default" : "secondary"}
                              className={
                                item.is_active
                                  ? "bg-green-500 cursor-pointer"
                                  : "cursor-pointer"
                              }
                              onClick={() => toggleItemStatus(item)}
                            >
                              {item.is_active ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleOpenDialog(item)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-red-600"
                                onClick={() => handleDelete(item.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? "Edit Material" : "Add New Material"}
            </DialogTitle>
            <DialogDescription>
              Add marketplace-ready material details and hardware store
              reference.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Material Name *</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Sand"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Input
                    id="category"
                    placeholder="e.g., Foundation"
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <div className="space-y-2 md:col-span-1">
                  <Label htmlFor="unit">Unit *</Label>
                  <Input
                    id="unit"
                    placeholder="kg"
                    value={formData.unit}
                    onChange={(e) =>
                      setFormData({ ...formData, unit: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="space-y-2 md:col-span-1">
                  <Label htmlFor="stock_amount">Stock Amount *</Label>
                  <Input
                    id="stock_amount"
                    type="number"
                    placeholder="100"
                    value={formData.stock_amount}
                    onChange={(e) =>
                      setFormData({ ...formData, stock_amount: e.target.value })
                    }
                    min="0"
                    step="0.01"
                    required
                  />
                </div>

                <div className="space-y-2 md:col-span-1">
                  <Label htmlFor="display_order">Display Order</Label>
                  <Input
                    id="display_order"
                    type="number"
                    value={formData.display_order}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        display_order: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="flex items-end md:col-span-1">
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          is_active: e.target.checked,
                        })
                      }
                    />
                    Active Item
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="price">Current Price (Rp) *</Label>
                  <Input
                    id="price"
                    type="number"
                    placeholder="50000"
                    value={formData.price}
                    onChange={(e) =>
                      setFormData({ ...formData, price: e.target.value })
                    }
                    min="1"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="original_price">Original Price (Rp)</Label>
                  <Input
                    id="original_price"
                    type="number"
                    placeholder="60000"
                    value={formData.original_price}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        original_price: e.target.value,
                      })
                    }
                    min="0"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="discount_label">Discount Label</Label>
                  <Input
                    id="discount_label"
                    placeholder="Promo akhir pekan"
                    value={formData.discount_label}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        discount_label: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Short details about quality or usage"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="image_url">Image URL</Label>
                <Input
                  id="image_url"
                  placeholder="https://..."
                  value={formData.image_url}
                  onChange={(e) =>
                    setFormData({ ...formData, image_url: e.target.value })
                  }
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="store_name">Store Name *</Label>
                  <Input
                    id="store_name"
                    placeholder="Toko Bangunan Jaya"
                    value={formData.store_name}
                    onChange={(e) =>
                      setFormData({ ...formData, store_name: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="store_phone">Store Phone *</Label>
                  <Input
                    id="store_phone"
                    placeholder="081234567890"
                    value={formData.store_phone}
                    onChange={(e) =>
                      setFormData({ ...formData, store_phone: e.target.value })
                    }
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="store_whatsapp_phone">
                    Store WhatsApp Phone
                  </Label>
                  <Input
                    id="store_whatsapp_phone"
                    placeholder="6281234567890"
                    value={formData.store_whatsapp_phone}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        store_whatsapp_phone: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="store_address">Store Address</Label>
                  <Input
                    id="store_address"
                    placeholder="Jl. Merdeka No. 10"
                    value={formData.store_address}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        store_address: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              {formError && <p className="text-sm text-red-600">{formError}</p>}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-orange-500 hover:bg-orange-600"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {editingItem ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Material</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this marketplace material? This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={confirmDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
