'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getUserById,
  getUserStats,
  getUserOrders,
  updateUserStatus,
  getPartnerServices,
  updatePartnerServices,
  getPartnerReferrals,
} from '@/lib/api/users';
import { getServices } from '@/lib/api/services';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import {
  ArrowLeft,
  Mail,
  Phone,
  Star,
  Calendar,
  Wallet,
  CheckCircle,
  XCircle,
  Briefcase,
  Award,
  Users,
  Wrench,
} from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function PartnerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const userId = params.id as string;

  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [savingServices, setSavingServices] = useState(false);

  const { data: partner, isLoading: partnerLoading } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => getUserById(userId),
  });

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['user-stats', userId],
    queryFn: () => getUserStats(userId, 'mitra'),
    enabled: !!partner,
  });

  const { data: orders, isLoading: ordersLoading } = useQuery<any[]>({
    queryKey: ['user-orders', userId],
    queryFn: () => getUserOrders(userId, 'mitra'),
    enabled: !!partner,
  });

  const { data: allServices, isLoading: allServicesLoading } = useQuery({
    queryKey: ['services'],
    queryFn: getServices,
  });

  const { data: partnerServices, isLoading: partnerServicesLoading } = useQuery({
    queryKey: ['partner-services', userId],
    queryFn: () => getPartnerServices(userId),
    enabled: !!partner,
  });

  // Sync selected services when partner services are loaded
  useEffect(() => {
    if (partnerServices && selectedServices.length === 0) {
      setSelectedServices(partnerServices.map((s: any) => s.id));
    }
  }, [partnerServices]);

  const { data: referrals, isLoading: referralsLoading } = useQuery<any[]>({
    queryKey: ['partner-referrals', userId],
    queryFn: () => getPartnerReferrals(userId),
    enabled: !!partner,
  });

  const verifyMutation = useMutation({
    mutationFn: (isVerified: boolean) => updateUserStatus(userId, { is_verified: isVerified }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', userId] });
    },
  });

  const handleServiceToggle = (serviceId: string, checked: boolean) => {
    setSelectedServices(prev =>
      checked ? [...prev, serviceId] : prev.filter(id => id !== serviceId)
    );
  };

  const handleSaveServices = async () => {
    setSavingServices(true);
    try {
      await updatePartnerServices(userId, selectedServices);
      queryClient.invalidateQueries({ queryKey: ['partner-services', userId] });
      queryClient.invalidateQueries({ queryKey: ['user', userId] });
      alert('Services updated successfully!');
    } catch (error) {
      console.error('Error updating services:', error);
      alert('Failed to update services');
    } finally {
      setSavingServices(false);
    }
  };

  if (partnerLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!partner) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <p className="text-muted-foreground">Partner not found</p>
        <Button onClick={() => router.back()} className="mt-4">
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Partner Details</h1>
          <p className="text-muted-foreground">Manage partner information and services</p>
        </div>
        {!partner.is_verified && (
          <Button
            onClick={() => verifyMutation.mutate(true)}
            className="bg-green-500 hover:bg-green-600"
          >
            <CheckCircle className="mr-2 h-4 w-4" />
            Verify Partner
          </Button>
        )}
      </div>

      {/* Profile Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-6">
            <Avatar className="h-24 w-24">
              <AvatarFallback className="bg-orange-500 text-white text-2xl">
                {partner.full_name?.[0] || 'M'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-2xl font-bold">{partner.full_name || 'No Name'}</h2>
                  {partner.is_verified ? (
                    <Badge className="bg-green-500">
                      <CheckCircle className="mr-1 h-3 w-3" />
                      Verified
                    </Badge>
                  ) : (
                    <Badge variant="secondary">
                      <XCircle className="mr-1 h-3 w-3" />
                      Unverified
                    </Badge>
                  )}
                  {partner.is_active ? (
                    <Badge>Active</Badge>
                  ) : (
                    <Badge variant="destructive">Inactive</Badge>
                  )}
                </div>
                <div className="flex flex-col gap-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    {partner.email}
                  </div>
                  {partner.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      {partner.phone}
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Joined {format(new Date(partner.created_at), 'MMMM dd, yyyy')}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Rating</p>
                  <div className="flex items-center gap-1">
                    <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                    <span className="text-xl font-bold">
                      {partner.rating_avg?.toFixed(1) || 'N/A'}
                    </span>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Total Jobs</p>
                  <p className="text-xl font-bold">{partner.total_jobs || 0}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Wallet</p>
                  <p className="text-xl font-bold">{formatCurrency(partner.wallet_balance || 0)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Referral Code</p>
                  <p className="text-xl font-bold font-mono">{partner.referral_code || 'N/A'}</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Services Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              Assigned Services
            </CardTitle>
            <CardDescription>Select which services this partner can handle</CardDescription>
          </CardHeader>
          <CardContent>
            {allServicesLoading || partnerServicesLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                  {allServices?.map(service => (
                    <div
                      key={service.id}
                      className="flex items-center space-x-3 p-3 rounded-lg border"
                    >
                      <Checkbox
                        id={service.id}
                        checked={selectedServices.includes(service.id)}
                        onCheckedChange={checked =>
                          handleServiceToggle(service.id, checked as boolean)
                        }
                      />
                      <label
                        htmlFor={service.id}
                        className="flex-1 cursor-pointer text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        <div>{service.name}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {formatCurrency(service.base_price)} • {service.commission_percentage}%
                          commission
                        </div>
                      </label>
                    </div>
                  ))}
                </div>
                <Button onClick={handleSaveServices} disabled={savingServices} className="w-full">
                  {savingServices ? 'Saving...' : 'Save Services'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Referrals */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Referred Partners
            </CardTitle>
            <CardDescription>Partners referred by {partner.full_name}</CardDescription>
          </CardHeader>
          <CardContent>
            {referralsLoading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : referrals && referrals.length > 0 ? (
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {referrals.map(referral => (
                  <div key={referral.id} className="flex items-center gap-3 p-3 rounded-lg border">
                    <Avatar>
                      <AvatarFallback className="bg-orange-500 text-white">
                        {referral.referred?.full_name?.[0] || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium">{referral.referred?.full_name}</p>
                      <p className="text-xs text-muted-foreground">{referral.referred?.email}</p>
                    </div>
                    <div className="text-right text-xs">
                      <Badge
                        variant={referral.referred?.is_verified ? 'default' : 'secondary'}
                        className={referral.referred?.is_verified ? 'bg-green-500' : ''}
                      >
                        {referral.referred?.is_verified ? 'Verified' : 'Pending'}
                      </Badge>
                      <p className="text-muted-foreground mt-1">
                        {format(new Date(referral.created_at), 'MMM dd, yyyy')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No referrals yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Orders</CardTitle>
          <CardDescription>Latest jobs completed by this partner</CardDescription>
        </CardHeader>
        <CardContent>
          {ordersLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : orders && orders.length > 0 ? (
            <div className="space-y-2">
              {orders.map(order => (
                <Link
                  key={order.id}
                  href={`/dashboard/orders/${order.id}`}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent"
                >
                  <div>
                    <p className="font-medium">
                      #{order.order_no} • {order.service?.name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(order.created_at), 'MMM dd, yyyy HH:mm')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{formatCurrency(order.price_total)}</p>
                    <Badge variant={order.status === 'completed' ? 'default' : 'secondary'}>
                      {order.status}
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Briefcase className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No orders yet</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
