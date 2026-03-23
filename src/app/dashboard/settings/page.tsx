"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/providers/auth-provider";
import {
  getCityProvinces,
  getIndonesianCities,
  createCity,
  updateCity,
  deleteCity,
} from "@/lib/api/cities";
import type { IndonesianCity } from "@/types/database";
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
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  User,
  Shield,
  Bell,
  Palette,
  Save,
  MapPin,
  Plus,
  Pencil,
  Trash2,
} from "lucide-react";

type CityFormState = {
  province: string;
  city_name: string;
  city_type: "Kota" | "Kabupaten";
  is_active: boolean;
};

const initialCityForm: CityFormState = {
  province: "",
  city_name: "",
  city_type: "Kota",
  is_active: true,
};

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const [saving, setSaving] = useState(false);
  const [citySearch, setCitySearch] = useState("");
  const [cityProvinceFilter, setCityProvinceFilter] = useState("all");
  const [cityTypeFilter, setCityTypeFilter] = useState<
    "all" | "Kota" | "Kabupaten"
  >("all");
  const [cityStatusFilter, setCityStatusFilter] = useState<
    "all" | "active" | "inactive"
  >("all");
  const [cityDialogOpen, setCityDialogOpen] = useState(false);
  const [cityDialogMode, setCityDialogMode] = useState<"add" | "edit">("add");
  const [editingCityId, setEditingCityId] = useState<number | null>(null);
  const [cityForm, setCityForm] = useState<CityFormState>(initialCityForm);

  const { data: cities, isLoading: citiesLoading } = useQuery({
    queryKey: [
      "indonesian-cities",
      citySearch,
      cityProvinceFilter,
      cityTypeFilter,
      cityStatusFilter,
    ],
    queryFn: () =>
      getIndonesianCities({
        search: citySearch,
        province: cityProvinceFilter === "all" ? undefined : cityProvinceFilter,
        cityType: cityTypeFilter,
        isActive:
          cityStatusFilter === "all" ? "all" : cityStatusFilter === "active",
      }),
  });

  const { data: provinces } = useQuery({
    queryKey: ["indonesian-city-provinces"],
    queryFn: getCityProvinces,
  });

  const createCityMutation = useMutation({
    mutationFn: () => createCity(cityForm),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["indonesian-cities"] });
      queryClient.invalidateQueries({
        queryKey: ["indonesian-city-provinces"],
      });
      setCityDialogOpen(false);
      setCityForm(initialCityForm);
      alert("City added successfully");
    },
    onError: (error) => {
      console.error("Error creating city:", error);
      alert(error instanceof Error ? error.message : "Failed to add city");
    },
  });

  const updateCityMutation = useMutation({
    mutationFn: () => {
      if (!editingCityId) {
        throw new Error("No city selected");
      }

      return updateCity(editingCityId, cityForm);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["indonesian-cities"] });
      queryClient.invalidateQueries({
        queryKey: ["indonesian-city-provinces"],
      });
      setCityDialogOpen(false);
      setEditingCityId(null);
      setCityForm(initialCityForm);
      alert("City updated successfully");
    },
    onError: (error) => {
      console.error("Error updating city:", error);
      alert(error instanceof Error ? error.message : "Failed to update city");
    },
  });

  const deleteCityMutation = useMutation({
    mutationFn: (cityId: number) => deleteCity(cityId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["indonesian-cities"] });
      queryClient.invalidateQueries({
        queryKey: ["indonesian-city-provinces"],
      });
      alert("City deleted successfully");
    },
    onError: (error) => {
      console.error("Error deleting city:", error);
      alert(error instanceof Error ? error.message : "Failed to delete city");
    },
  });

  const handleSave = async () => {
    setSaving(true);
    // Simulate save
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setSaving(false);
  };

  const openAddCityDialog = () => {
    setCityDialogMode("add");
    setEditingCityId(null);
    setCityForm(initialCityForm);
    setCityDialogOpen(true);
  };

  const openEditCityDialog = (city: IndonesianCity) => {
    setCityDialogMode("edit");
    setEditingCityId(city.id);
    setCityForm({
      province: city.province,
      city_name: city.city_name,
      city_type: city.city_type,
      is_active: city.is_active,
    });
    setCityDialogOpen(true);
  };

  const handleCitySubmit = () => {
    if (!cityForm.province.trim() || !cityForm.city_name.trim()) {
      alert("Province and city name are required");
      return;
    }

    if (cityDialogMode === "add") {
      createCityMutation.mutate();
      return;
    }

    updateCityMutation.mutate();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account and preferences
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Profile Section */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profile Information
            </CardTitle>
            <CardDescription>Update your personal details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-6">
              <Avatar className="h-20 w-20">
                <AvatarFallback className="bg-orange-500 text-white text-2xl">
                  {profile?.full_name?.[0] || "A"}
                </AvatarFallback>
              </Avatar>
              <div>
                <Button variant="outline" size="sm">
                  Change Avatar
                </Button>
                <p className="mt-1 text-xs text-muted-foreground">
                  JPG, PNG. Max 2MB
                </p>
              </div>
            </div>

            <Separator />

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input id="fullName" defaultValue={profile?.full_name || ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  defaultValue={profile?.email || ""}
                  disabled
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input id="phone" defaultValue={profile?.phone || ""} />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <div className="flex h-10 items-center">
                  <Badge className="bg-orange-500">Admin</Badge>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                onClick={handleSave}
                disabled={saving}
                className="bg-orange-500 hover:bg-orange-600"
              >
                <Save className="mr-2 h-4 w-4" />
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Security
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">Password</span>
                <Button variant="outline" size="sm">
                  Change
                </Button>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Two-Factor Auth</span>
                <Badge variant="secondary">Disabled</Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notifications
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">Email Notifications</span>
                <Badge className="bg-green-500">On</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Push Notifications</span>
                <Badge variant="secondary">Off</Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Appearance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-sm">Theme</span>
                <Badge variant="outline">Light</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Platform Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Platform Configuration</CardTitle>
          <CardDescription>
            Global settings for the Tukang Go platform
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="defaultCommission">Default Commission (%)</Label>
              <Input
                id="defaultCommission"
                type="number"
                defaultValue="10"
                min="0"
                max="100"
              />
              <p className="text-xs text-muted-foreground">
                Applied to new services
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="searchRadius">Search Radius (km)</Label>
              <Input
                id="searchRadius"
                type="number"
                defaultValue="10"
                min="1"
              />
              <p className="text-xs text-muted-foreground">
                Max distance for partner matching
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="minWithdrawal">Min Withdrawal (Rp)</Label>
              <Input
                id="minWithdrawal"
                type="number"
                defaultValue="50000"
                step="10000"
              />
              <p className="text-xs text-muted-foreground">
                Minimum wallet withdrawal
              </p>
            </div>
          </div>
          <div className="mt-6 flex justify-end">
            <Button className="bg-orange-500 hover:bg-orange-600">
              <Save className="mr-2 h-4 w-4" />
              Save Configuration
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Indonesian Cities Management
              </CardTitle>
              <CardDescription>
                Maintain standardized city options used for partner service area
              </CardDescription>
            </div>
            <Button onClick={openAddCityDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Add City
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Dialog open={cityDialogOpen} onOpenChange={setCityDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {cityDialogMode === "add" ? "Add City" : "Edit City"}
                </DialogTitle>
                <DialogDescription>
                  Use standardized values to avoid service area typos.
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="cityProvince">Province</Label>
                  <Input
                    id="cityProvince"
                    value={cityForm.province}
                    onChange={(event) =>
                      setCityForm((prev) => ({
                        ...prev,
                        province: event.target.value,
                      }))
                    }
                    placeholder="Jawa Barat"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cityName">City Name</Label>
                  <Input
                    id="cityName"
                    value={cityForm.city_name}
                    onChange={(event) =>
                      setCityForm((prev) => ({
                        ...prev,
                        city_name: event.target.value,
                      }))
                    }
                    placeholder="Bandung"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cityType">City Type</Label>
                  <select
                    id="cityType"
                    value={cityForm.city_type}
                    onChange={(event) =>
                      setCityForm((prev) => ({
                        ...prev,
                        city_type: event.target.value as "Kota" | "Kabupaten",
                      }))
                    }
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="Kota">Kota</option>
                    <option value="Kabupaten">Kabupaten</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cityActive">Status</Label>
                  <select
                    id="cityActive"
                    value={cityForm.is_active ? "active" : "inactive"}
                    onChange={(event) =>
                      setCityForm((prev) => ({
                        ...prev,
                        is_active: event.target.value === "active",
                      }))
                    }
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setCityDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCitySubmit}
                  disabled={
                    createCityMutation.isPending || updateCityMutation.isPending
                  }
                >
                  {createCityMutation.isPending || updateCityMutation.isPending
                    ? "Saving..."
                    : cityDialogMode === "add"
                      ? "Create"
                      : "Save"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1">
              <Label htmlFor="citySearch">Search</Label>
              <Input
                id="citySearch"
                value={citySearch}
                onChange={(event) => setCitySearch(event.target.value)}
                placeholder="Province or city"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="provinceFilter">Province</Label>
              <select
                id="provinceFilter"
                value={cityProvinceFilter}
                onChange={(event) => setCityProvinceFilter(event.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="all">All Provinces</option>
                {provinces?.map((province) => (
                  <option key={province} value={province}>
                    {province}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="typeFilter">Type</Label>
              <select
                id="typeFilter"
                value={cityTypeFilter}
                onChange={(event) =>
                  setCityTypeFilter(
                    event.target.value as "all" | "Kota" | "Kabupaten",
                  )
                }
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="all">All Types</option>
                <option value="Kota">Kota</option>
                <option value="Kabupaten">Kabupaten</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="statusFilter">Status</Label>
              <select
                id="statusFilter"
                value={cityStatusFilter}
                onChange={(event) =>
                  setCityStatusFilter(
                    event.target.value as "all" | "active" | "inactive",
                  )
                }
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Province</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {citiesLoading ? (
                  [...Array(6)].map((_, idx) => (
                    <TableRow key={idx}>
                      <TableCell colSpan={5}>
                        <div className="h-6 w-full animate-pulse rounded bg-muted" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : cities && cities.length > 0 ? (
                  cities.map((city) => (
                    <TableRow key={city.id}>
                      <TableCell>{city.province}</TableCell>
                      <TableCell>{city.city_name}</TableCell>
                      <TableCell>{city.city_type}</TableCell>
                      <TableCell>
                        {city.is_active ? (
                          <Badge className="bg-green-500">Active</Badge>
                        ) : (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditCityDialog(city)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-600"
                            onClick={() => deleteCityMutation.mutate(city.id)}
                            disabled={deleteCityMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center text-muted-foreground"
                    >
                      No city data found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
