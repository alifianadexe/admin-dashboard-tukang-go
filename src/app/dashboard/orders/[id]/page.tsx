'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { getOrderById } from '@/lib/api/orders';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowLeft,
  MapPin,
  Phone,
  Mail,
  Calendar,
  Clock,
  Star,
  User,
  Wrench,
  DollarSign,
  FileText,
  Image as ImageIcon,
} from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function getStatusBadge(status: string) {
  const statusConfig: Record<string, { label: string; className: string }> = {
    searching: { label: 'Searching', className: 'bg-yellow-100 text-yellow-800' },
    accepted: { label: 'Accepted', className: 'bg-blue-100 text-blue-800' },
    arrived: { label: 'Arrived', className: 'bg-purple-100 text-purple-800' },
    in_progress: { label: 'In Progress', className: 'bg-cyan-100 text-cyan-800' },
    payment_pending: { label: 'Payment Pending', className: 'bg-orange-100 text-orange-800' },
    completed: { label: 'Completed', className: 'bg-green-100 text-green-800' },
    cancelled: { label: 'Cancelled', className: 'bg-red-100 text-red-800' },
  };

  const config = statusConfig[status] || { label: status, className: 'bg-gray-100 text-gray-800' };

  return <Badge className={`${config.className} text-sm px-3 py-1`}>{config.label}</Badge>;
}

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;

  const { data: order, isLoading } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => getOrderById(orderId),
    enabled: !!orderId,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-64 lg:col-span-2" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-lg text-muted-foreground">Order not found</p>
        <Button variant="outline" className="mt-4" onClick={() => router.back()}>
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">Order #{order.order_no}</h1>
              {getStatusBadge(order.status)}
            </div>
            <p className="text-muted-foreground">
              Created {format(new Date(order.created_at), 'MMMM dd, yyyy HH:mm')}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Details */}
        <div className="space-y-6 lg:col-span-2">
          {/* Service Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5" />
                Service Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Service</span>
                <span className="font-medium">{order.service?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Working Days</span>
                <span className="font-medium">{order.working_days} day(s)</span>
              </div>
              <Separator />
              <div>
                <span className="text-muted-foreground">Problem Description</span>
                <p className="mt-2 rounded-lg bg-gray-50 p-3">
                  {order.problem_description || 'No description provided'}
                </p>
              </div>
              {order.photos && order.photos.length > 0 && (
                <div>
                  <span className="text-muted-foreground flex items-center gap-2">
                    <ImageIcon className="h-4 w-4" />
                    Photos ({order.photos.length})
                  </span>
                  <div className="mt-2 flex gap-2 flex-wrap">
                    {order.photos.map((photo, i) => (
                      <div key={i} className="h-20 w-20 rounded-lg bg-gray-200 overflow-hidden">
                        <img
                          src={photo}
                          alt={`Photo ${i + 1}`}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Location */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Location
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg">{order.address_origin}</p>
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <TimelineItem label="Created" time={order.created_at} active={true} />
                <TimelineItem
                  label="Accepted by Partner"
                  time={order.accepted_at}
                  active={!!order.accepted_at}
                />
                <TimelineItem
                  label="Partner Arrived"
                  time={order.arrived_at}
                  active={!!order.arrived_at}
                />
                <TimelineItem
                  label="Work Started"
                  time={order.started_at}
                  active={!!order.started_at}
                />
                <TimelineItem
                  label="Completed"
                  time={order.completed_at}
                  active={!!order.completed_at}
                  isLast
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Payment Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Payment Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Base Price</span>
                <span>{formatCurrency(order.price_base)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Working Days</span>
                <span>× {order.working_days}</span>
              </div>
              {order.price_additional > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Additional Cost</span>
                  <span>{formatCurrency(order.price_additional)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span className="text-orange-600">{formatCurrency(order.price_total)}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Commission</span>
                <span className="text-green-600">{formatCurrency(order.commission_amount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Partner Earning</span>
                <span>{formatCurrency(order.price_total - order.commission_amount)}</span>
              </div>
              {order.payment_method && (
                <>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Payment Method</span>
                    <Badge variant="outline" className="capitalize">
                      {order.payment_method}
                    </Badge>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Client Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Client
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="font-medium">{order.client?.full_name || 'Unknown'}</p>
              </div>
              {order.client?.phone && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  {order.client.phone}
                </div>
              )}
              {order.client?.email && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  {order.client.email}
                </div>
              )}
              <Link href={`/dashboard/clients/${order.client_id}`}>
                <Button variant="outline" size="sm" className="w-full mt-2">
                  View Profile
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Partner Info */}
          {order.mitra && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wrench className="h-5 w-5" />
                  Partner (Mitra)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="font-medium">{order.mitra.full_name}</p>
                  {order.mitra.rating && (
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span className="text-sm">{order.mitra.rating.toFixed(1)}</span>
                    </div>
                  )}
                </div>
                {order.mitra.phone && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    {order.mitra.phone}
                  </div>
                )}
                {order.mitra.email && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    {order.mitra.email}
                  </div>
                )}
                <Link href={`/dashboard/partners/${order.mitra_id}`}>
                  <Button variant="outline" size="sm" className="w-full mt-2">
                    View Profile
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}

          {/* Review */}
          {order.status === 'completed' && order.rating && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5" />
                  Review
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map(star => (
                    <Star
                      key={star}
                      className={`h-5 w-5 ${
                        star <= order.rating! ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
                      }`}
                    />
                  ))}
                  <span className="font-medium">{order.rating}/5</span>
                </div>
                {order.review && <p className="text-sm text-muted-foreground">{order.review}</p>}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function TimelineItem({
  label,
  time,
  active,
  isLast = false,
}: {
  label: string;
  time: string | null;
  active: boolean;
  isLast?: boolean;
}) {
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div className={`h-3 w-3 rounded-full ${active ? 'bg-orange-500' : 'bg-gray-300'}`} />
        {!isLast && <div className={`h-full w-0.5 ${active ? 'bg-orange-500' : 'bg-gray-300'}`} />}
      </div>
      <div className="pb-4">
        <p className={`font-medium ${active ? 'text-foreground' : 'text-muted-foreground'}`}>
          {label}
        </p>
        {time && (
          <p className="text-sm text-muted-foreground">
            {format(new Date(time), 'MMM dd, yyyy HH:mm')}
          </p>
        )}
      </div>
    </div>
  );
}
