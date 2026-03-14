'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getUserById, getUserOrders, getUserStats, updateUserStatus } from '@/lib/api/users';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  ArrowLeft,
  Calendar,
  CheckCircle,
  Mail,
  Phone,
  Wallet,
  Briefcase,
  Shield,
  XCircle,
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

export default function ClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const userId = params.id as string;

  const { data: client, isLoading: clientLoading } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => getUserById(userId),
  });

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['user-stats', userId],
    queryFn: () => getUserStats(userId, 'client'),
    enabled: !!client,
  });

  const { data: orders, isLoading: ordersLoading } = useQuery<any[]>({
    queryKey: ['user-orders', userId],
    queryFn: () => getUserOrders(userId, 'client'),
    enabled: !!client,
  });

  const updateStatusMutation = useMutation({
    mutationFn: (updates: { is_active?: boolean; is_verified?: boolean }) =>
      updateUserStatus(userId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', userId] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  if (clientLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!client || client.role !== 'client') {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <p className="text-muted-foreground">Client not found</p>
        <Button onClick={() => router.back()} className="mt-4">
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>

        <div className="flex-1">
          <h1 className="text-2xl font-bold">Client Details</h1>
          <p className="text-muted-foreground">Manage client profile, status, and activity</p>
        </div>

        <div className="flex gap-2">
          {!client.is_verified && (
            <Button
              onClick={() => updateStatusMutation.mutate({ is_verified: true })}
              className="bg-green-600 hover:bg-green-700"
              disabled={updateStatusMutation.isPending}
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              Verify Client
            </Button>
          )}

          <Button
            variant={client.is_active ? 'destructive' : 'default'}
            onClick={() => updateStatusMutation.mutate({ is_active: !client.is_active })}
            disabled={updateStatusMutation.isPending}
          >
            {client.is_active ? 'Deactivate' : 'Activate'}
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-6 md:flex-row md:items-start">
            <Avatar className="h-24 w-24">
              <AvatarFallback className="bg-blue-500 text-2xl text-white">
                {client.full_name?.[0] || 'C'}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 space-y-4">
              <div>
                <div className="mb-2 flex flex-wrap items-center gap-3">
                  <h2 className="text-2xl font-bold">{client.full_name || 'No Name'}</h2>

                  {client.is_verified ? (
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

                  {client.is_active ? (
                    <Badge>Active</Badge>
                  ) : (
                    <Badge variant="destructive">Inactive</Badge>
                  )}
                </div>

                <div className="flex flex-col gap-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    {client.email}
                  </div>
                  {client.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      {client.phone}
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Joined {format(new Date(client.created_at), 'MMMM dd, yyyy')}
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Wallet</p>
                  <p className="text-xl font-bold">{formatCurrency(client.wallet_balance || 0)}</p>
                </div>

                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Total Orders</p>
                  <p className="text-xl font-bold">
                    {statsLoading ? '-' : (stats?.totalOrders ?? 0)}
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Completed Orders</p>
                  <p className="text-xl font-bold">
                    {statsLoading ? '-' : (stats?.completedOrders ?? 0)}
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Total Spent</p>
                  <p className="text-xl font-bold">
                    {statsLoading ? '-' : formatCurrency(stats?.totalSpent ?? 0)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Account Status
            </CardTitle>
            <CardDescription>Current moderation and account state for this client</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <span>Verification</span>
              <Badge variant={client.is_verified ? 'default' : 'secondary'}>
                {client.is_verified ? 'Verified' : 'Pending Verification'}
              </Badge>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <span>Account</span>
              <Badge variant={client.is_active ? 'default' : 'destructive'}>
                {client.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <span>Role</span>
              <Badge variant="outline">Client</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Financial Summary
            </CardTitle>
            <CardDescription>Spending behavior and available wallet balance</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <span>Wallet Balance</span>
              <span className="font-semibold">{formatCurrency(client.wallet_balance || 0)}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <span>Total Spent</span>
              <span className="font-semibold">
                {statsLoading ? '-' : formatCurrency(stats?.totalSpent ?? 0)}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <span>Average Rating Given</span>
              <span className="font-semibold">
                {statsLoading ? '-' : (stats?.averageRating ?? 0).toFixed(1)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            Recent Orders
          </CardTitle>
          <CardDescription>Latest service requests created by this client</CardDescription>
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
                  className="flex items-center justify-between rounded-lg border p-3 hover:bg-accent"
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
            <div className="py-8 text-center text-muted-foreground">
              <Briefcase className="mx-auto mb-2 h-12 w-12 opacity-50" />
              <p>No orders yet</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
