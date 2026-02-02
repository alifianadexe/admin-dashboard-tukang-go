'use client';

import { useQuery } from '@tanstack/react-query';
import {
  getFinanceStats,
  getMonthlyRevenueData,
  getPaymentMethodStats,
  getRecentTransactions,
} from '@/lib/api/finance';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  CreditCard,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

const COLORS = ['#f97316', '#22c55e', '#3b82f6', '#a855f7'];

export default function FinancePage() {
  const {
    data: stats,
    isLoading: statsLoading,
    refetch: refetchStats,
  } = useQuery({
    queryKey: ['finance-stats'],
    queryFn: getFinanceStats,
  });

  const { data: monthlyData, isLoading: monthlyLoading } = useQuery({
    queryKey: ['monthly-revenue'],
    queryFn: () => getMonthlyRevenueData(12),
  });

  const { data: paymentMethods, isLoading: methodsLoading } = useQuery({
    queryKey: ['payment-methods'],
    queryFn: getPaymentMethodStats,
  });

  const { data: transactions, isLoading: transactionsLoading } = useQuery({
    queryKey: ['recent-transactions'],
    queryFn: () => getRecentTransactions(20),
  });

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'earning':
        return <ArrowDownRight className="h-4 w-4 text-green-500" />;
      case 'payment':
        return <ArrowUpRight className="h-4 w-4 text-red-500" />;
      case 'withdrawal':
        return <ArrowUpRight className="h-4 w-4 text-orange-500" />;
      case 'topup':
        return <ArrowDownRight className="h-4 w-4 text-blue-500" />;
      default:
        return <DollarSign className="h-4 w-4" />;
    }
  };

  const getTransactionBadge = (type: string) => {
    const config: Record<string, { label: string; className: string }> = {
      earning: { label: 'Earning', className: 'bg-green-100 text-green-800' },
      payment: { label: 'Payment', className: 'bg-red-100 text-red-800' },
      withdrawal: { label: 'Withdrawal', className: 'bg-orange-100 text-orange-800' },
      topup: { label: 'Top Up', className: 'bg-blue-100 text-blue-800' },
      refund: { label: 'Refund', className: 'bg-purple-100 text-purple-800' },
    };
    const c = config[type] || { label: type, className: 'bg-gray-100 text-gray-800' };
    return <Badge className={c.className}>{c.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Finance</h1>
          <p className="text-muted-foreground">Revenue, commissions, and financial reports</p>
        </div>
        <Button onClick={() => refetchStats()} variant="outline" size="sm">
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <>
                <div className="text-2xl font-bold">{formatCurrency(stats?.totalRevenue || 0)}</div>
                <p className="text-xs text-muted-foreground">All-time completed orders</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Commission</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(stats?.totalCommission || 0)}
                </div>
                <p className="text-xs text-muted-foreground">Platform earnings</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month Revenue</CardTitle>
            {stats?.revenueGrowth !== undefined && stats.revenueGrowth >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-500" />
            )}
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {formatCurrency(stats?.monthlyRevenue || 0)}
                </div>
                <p
                  className={`text-xs ${
                    (stats?.revenueGrowth || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {(stats?.revenueGrowth || 0) >= 0 ? '+' : ''}
                  {stats?.revenueGrowth || 0}% from last month
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Payouts</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <>
                <div className="text-2xl font-bold text-orange-600">
                  {formatCurrency(stats?.pendingPayouts || 0)}
                </div>
                <p className="text-xs text-muted-foreground">Partner wallet balances</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-7">
        {/* Monthly Revenue Chart */}
        <Card className="lg:col-span-5">
          <CardHeader>
            <CardTitle>Revenue & Commission Trend</CardTitle>
            <CardDescription>Monthly breakdown for the last 12 months</CardDescription>
          </CardHeader>
          <CardContent>
            {monthlyLoading ? (
              <Skeleton className="h-[350px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" fontSize={12} tickLine={false} />
                  <YAxis
                    fontSize={12}
                    tickLine={false}
                    tickFormatter={value => `${(value / 1000000).toFixed(0)}M`}
                  />
                  <Tooltip
                    formatter={(value: number, name: string) => [
                      formatCurrency(value),
                      name === 'revenue' ? 'Revenue' : 'Commission',
                    ]}
                  />
                  <Legend />
                  <Bar dataKey="revenue" fill="#f97316" name="Revenue" />
                  <Bar dataKey="commission" fill="#22c55e" name="Commission" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Payment Methods */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Payment Methods</CardTitle>
            <CardDescription>Distribution by payment type</CardDescription>
          </CardHeader>
          <CardContent>
            {methodsLoading ? (
              <Skeleton className="h-[350px] w-full" />
            ) : (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={paymentMethods}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="count"
                      nameKey="method"
                    >
                      {paymentMethods?.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number, name: string, props: any) => [
                        `${value} orders (${formatCurrency(props.payload.amount)})`,
                        props.payload.method,
                      ]}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-4 space-y-2">
                  {paymentMethods?.map((method, index) => (
                    <div key={method.method} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span>{method.method}</span>
                      </div>
                      <span className="font-medium">{method.count} orders</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
          <CardDescription>Latest wallet transactions across the platform</CardDescription>
        </CardHeader>
        <CardContent>
          {transactionsLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {transactions?.map(transaction => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
                      {getTransactionIcon(transaction.type)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {transaction.user?.full_name || 'Unknown User'}
                        </span>
                        {getTransactionBadge(transaction.type)}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {transaction.description || 'No description'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p
                      className={`font-medium ${
                        ['earning', 'topup', 'refund'].includes(transaction.type)
                          ? 'text-green-600'
                          : 'text-red-600'
                      }`}
                    >
                      {['earning', 'topup', 'refund'].includes(transaction.type) ? '+' : '-'}
                      {formatCurrency(Math.abs(transaction.amount))}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(transaction.created_at), 'MMM dd, HH:mm')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
