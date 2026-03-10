'use client';

import { JSXElementConstructor, Key, ReactElement, ReactNode, ReactPortal, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAllReferrals, updateReferralBonus } from '@/lib/api/users';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Users, CheckCircle, XCircle, Gift, Calendar, RefreshCw, TrendingUp } from 'lucide-react';
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

export default function ReferralsPage() {
  const queryClient = useQueryClient();
  const [selectedReferral, setSelectedReferral] = useState<any>(null);
  const [bonusAmount, setBonusAmount] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);

  interface Referral {
    id: string;
    referrer: {
      id: string;
      full_name: string;
      email: string;
    };
    referred: {
      id: string;
      full_name: string;
      email: string;
    };
    referral_code: string;
    status: string;
    bonus_amount: number;
    bonus_paid_at: string | null;
    created_at: string;
  }

  const {
    data: referrals,
    isLoading,
    refetch,
  } = useQuery<Referral[]>({
    queryKey: ['all-referrals'],
    queryFn: getAllReferrals,
  });

  const updateBonusMutation = useMutation({
    mutationFn: ({ referralId, amount }: { referralId: string; amount: number }) =>
      updateReferralBonus(referralId, amount, new Date().toISOString()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-referrals'] });
      setDialogOpen(false);
      setBonusAmount('');
      setSelectedReferral(null);
    },
  });

  const handlePayBonus = () => {
    if (selectedReferral && bonusAmount) {
      updateBonusMutation.mutate({
        referralId: selectedReferral.id,
        amount: parseFloat(bonusAmount),
      });
    }
  };

  const stats =
    referrals && Array.isArray(referrals)
      ? {
          total: referrals.length,
          active: referrals.filter(r => r.status === 'active').length,
          pending: referrals.filter(r => r.status === 'pending').length,
          totalBonus: referrals.reduce((sum, r) => sum + (r.bonus_amount || 0), 0),
        }
      : { total: 0, active: 0, pending: 0, totalBonus: 0 };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Partner Referrals</h1>
          <p className="text-muted-foreground">Track and manage partner referral program</p>
        </div>
        <Button onClick={() => refetch()} variant="outline" size="sm">
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Referrals</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">All referral relationships</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.active}</div>
            <p className="text-xs text-muted-foreground">Verified referrals</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <XCircle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">Awaiting verification</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Bonuses</CardTitle>
            <Gift className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalBonus)}</div>
            <p className="text-xs text-muted-foreground">Paid to referrers</p>
          </CardContent>
        </Card>
      </div>

      {/* Referrals Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Referrals</CardTitle>
          <CardDescription>Complete list of partner referrals</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(10)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Referrer (Partner A)</TableHead>
                    <TableHead>Referred (Partner B)</TableHead>
                    <TableHead>Code Used</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Bonus</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {referrals && Array.isArray(referrals) && referrals.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center">
                        <div className="flex flex-col items-center justify-center py-8">
                          <Users className="h-12 w-12 text-muted-foreground/50 mb-2" />
                          <p className="text-muted-foreground">No referrals yet</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    referrals?.map((referral: Referral) => (
                      <TableRow key={referral.id}>
                        <TableCell>
                          <Link
                            href={`/dashboard/partners/${referral.referrer?.id}`}
                            className="flex items-center gap-3 hover:underline"
                          >
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="bg-orange-500 text-white text-xs">
                                {typeof referral.referrer?.full_name === 'string'
                                  ? referral.referrer.full_name[0]
                                  : 'R'}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{referral.referrer?.full_name}</p>
                              <p className="text-xs text-muted-foreground">
                                {referral.referrer?.email}
                              </p>
                            </div>
                          </Link>
                        </TableCell>
                        <TableCell>
                          <Link
                            href={`/dashboard/partners/${referral.referred?.id}`}
                            className="flex items-center gap-3 hover:underline"
                          >
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="bg-blue-500 text-white text-xs">
                                {typeof referral.referred?.full_name === 'string'
                                  ? referral.referred.full_name[0]
                                  : 'R'}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{referral.referred?.full_name}</p>
                              <p className="text-xs text-muted-foreground">
                                {referral.referred?.email}
                              </p>
                            </div>
                          </Link>
                        </TableCell>
                        <TableCell>
                          <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                            {referral.referral_code}
                          </code>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={referral.status === 'active' ? 'default' : 'secondary'}
                            className={referral.status === 'active' ? 'bg-green-500' : ''}
                          >
                            {referral.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {referral.bonus_amount > 0 ? (
                            <div>
                              <p className="font-medium text-green-600">
                                {formatCurrency(referral.bonus_amount)}
                              </p>
                              {referral.bonus_paid_at && (
                                <p className="text-xs text-muted-foreground">
                                  Paid {format(new Date(referral.bonus_paid_at), 'MMM dd, yyyy')}
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {format(new Date(referral.created_at), 'MMM dd, yyyy')}
                        </TableCell>
                        <TableCell className="text-right">
                          {referral.status === 'active' && referral.bonus_amount === 0 && (
                            <Dialog
                              open={dialogOpen && selectedReferral?.id === referral.id}
                              onOpenChange={open => {
                                setDialogOpen(open);
                                if (open) {
                                  setSelectedReferral(referral);
                                } else {
                                  setSelectedReferral(null);
                                  setBonusAmount('');
                                }
                              }}
                            >
                              <DialogTrigger asChild>
                                <Button variant="outline" size="sm">
                                  <Gift className="mr-2 h-4 w-4" />
                                  Pay Bonus
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Pay Referral Bonus</DialogTitle>
                                  <DialogDescription>
                                    Award bonus to {referral.referrer?.full_name} for referring{' '}
                                    {referral.referred?.full_name}
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                  <div className="space-y-2">
                                    <Label htmlFor="bonus">Bonus Amount (Rp)</Label>
                                    <Input
                                      id="bonus"
                                      type="number"
                                      placeholder="50000"
                                      value={bonusAmount}
                                      onChange={e => setBonusAmount(e.target.value)}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                      Suggested: Rp 50,000 - Rp 100,000
                                    </p>
                                  </div>
                                </div>
                                <DialogFooter>
                                  <Button
                                    variant="outline"
                                    onClick={() => {
                                      setDialogOpen(false);
                                      setBonusAmount('');
                                    }}
                                  >
                                    Cancel
                                  </Button>
                                  <Button
                                    onClick={handlePayBonus}
                                    disabled={!bonusAmount || updateBonusMutation.isPending}
                                  >
                                    {updateBonusMutation.isPending ? 'Processing...' : 'Pay Bonus'}
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
