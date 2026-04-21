"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useSchoolPlans, usePlans } from '@/hooks/useSubscription';
import { toast } from 'sonner';
import {
  Building2,
  Search,
  Filter,
  MoreVertical,
  Edit,
  Shield,
  Star,
  Crown,
  Check,
  X,
  Loader2,
  AlertCircle,
  Users,
  Calendar,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Plan, PlanTier, SchoolWithPlan, TIER_CONFIG } from '@/types/subscription';

const SchoolSubscriptionPage = () => {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { schools, loading: loadingSchools, fetchSchools, assignPlan } = useSchoolPlans();
  const { plans, loading: loadingPlans } = usePlans();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTier, setFilterTier] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState<SchoolWithPlan | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/sign-in');
    }
  }, [isAuthenticated, authLoading, router]);

  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      if (user?.role?.toLowerCase() !== 'super_admin') {
        toast.error('Access denied. Super Admin only.');
        router.push('/dashboard');
        return;
      }
    }
  }, [isAuthenticated, authLoading, user, router]);

  const getTierIcon = (tier: PlanTier | undefined) => {
    switch (tier) {
      case 'CORE':
        return <Shield className="w-4 h-4" />;
      case 'STANDARD':
        return <Star className="w-4 h-4" />;
      case 'ULTIMATE':
        return <Crown className="w-4 h-4" />;
      default:
        return <Shield className="w-4 h-4" />;
    }
  };

  const getTierColor = (tier: PlanTier | undefined) => {
    switch (tier) {
      case 'CORE':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'STANDARD':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'ULTIMATE':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const filteredSchools = schools.filter((school) => {
    const matchesSearch =
      school.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      school.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTier =
      filterTier === 'all' || school.plan?.tier === filterTier;
    const matchesStatus =
      filterStatus === 'all' ||
      (filterStatus === 'active' && school.isActive) ||
      (filterStatus === 'inactive' && !school.isActive);
    return matchesSearch && matchesTier && matchesStatus;
  });

  const stats = {
    total: schools.length,
    core: schools.filter((s) => s.plan?.tier === 'CORE').length,
    standard: schools.filter((s) => s.plan?.tier === 'STANDARD').length,
    ultimate: schools.filter((s) => s.plan?.tier === 'ULTIMATE').length,
    noPlan: schools.filter((s) => !s.plan).length,
  };

  const handleAssignPlan = async () => {
    if (!selectedSchool || !selectedPlanId) {
      toast.error('Please select a plan');
      return;
    }

    setIsSubmitting(true);
    try {
      const success = await assignPlan({
        schoolId: selectedSchool.id,
        planId: selectedPlanId,
      });
      if (success) {
        setIsAssignDialogOpen(false);
        setSelectedSchool(null);
        setSelectedPlanId('');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const openAssignDialog = (school: SchoolWithPlan) => {
    setSelectedSchool(school);
    setSelectedPlanId(school.plan?.id || '');
    setIsAssignDialogOpen(true);
  };

  if (loadingSchools || loadingPlans || authLoading) {
    return (
      <div className="flex-1 p-4 md:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <Skeleton className="h-10 w-64 mb-2" />
            <Skeleton className="h-5 w-96" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardContent className="pt-6">
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
          <Card>
            <CardContent className="pt-6">
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">School Subscriptions</h1>
          <p className="text-gray-600">
            Manage subscription plans for all schools
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Schools</p>
                  <p className="text-xl font-bold">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                  <Crown className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Ultimate</p>
                  <p className="text-xl font-bold">{stats.ultimate}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Star className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Standard</p>
                  <p className="text-xl font-bold">{stats.standard}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Core</p>
                  <p className="text-xl font-bold">{stats.core}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">No Plan</p>
                  <p className="text-xl font-bold">{stats.noPlan}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle>Schools</CardTitle>
                <CardDescription>
                  {filteredSchools.length} school
                  {filteredSchools.length !== 1 ? 's' : ''} found
                </CardDescription>
              </div>
              <div className="flex flex-col md:flex-row gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search schools..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 w-64"
                  />
                </div>
                <Select value={filterTier} onValueChange={setFilterTier}>
                  <SelectTrigger className="w-40">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Tier" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Tiers</SelectItem>
                    <SelectItem value="CORE">Core</SelectItem>
                    <SelectItem value="STANDARD">Standard</SelectItem>
                    <SelectItem value="ULTIMATE">Ultimate</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-36">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>School</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Assigned</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSchools.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      <Building2 className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                      <p className="text-gray-600">No schools found</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSchools.map((school) => (
                    <TableRow key={school.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                            <Building2 className="w-5 h-5 text-purple-600" />
                          </div>
                          <div>
                            <p className="font-medium">{school.name}</p>
                            <p className="text-sm text-gray-500">{school.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={school.isActive ? 'default' : 'secondary'}
                          className={
                            school.isActive
                              ? 'bg-green-100 text-green-800 border-green-200'
                              : ''
                          }
                        >
                          {school.isActive ? (
                            <>
                              <Check className="w-3 h-3 mr-1" />
                              Active
                            </>
                          ) : (
                            <>
                              <X className="w-3 h-3 mr-1" />
                              Inactive
                            </>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {school.plan ? (
                          <Badge
                            variant="outline"
                            className={`gap-1 ${getTierColor(school.plan.tier)}`}
                          >
                            {getTierIcon(school.plan.tier)}
                            {school.plan.name}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-yellow-600 border-yellow-200">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            No Plan
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {school.planAssignedAt ? (
                          <div className="flex items-center gap-1 text-sm text-gray-500">
                            <Calendar className="w-4 h-4" />
                            {new Date(school.planAssignedAt).toLocaleDateString()}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">Never</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => openAssignDialog(school)}
                              className="gap-2"
                            >
                              <Edit className="w-4 h-4" />
                              Assign Plan
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Assign Plan to School</DialogTitle>
              <DialogDescription>
                {selectedSchool?.name} - Assign a subscription plan
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Current Plan</label>
                <div className="p-3 bg-gray-50 rounded-lg">
                  {selectedSchool?.plan ? (
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={`gap-1 ${getTierColor(selectedSchool.plan.tier)}`}
                      >
                        {getTierIcon(selectedSchool.plan.tier)}
                        {selectedSchool.plan.name}
                      </Badge>
                    </div>
                  ) : (
                    <span className="text-gray-500">No plan assigned</span>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">New Plan</label>
                <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a plan" />
                  </SelectTrigger>
                  <SelectContent>
                    {plans.map((plan) => (
                      <SelectItem key={plan.id} value={plan.id}>
                        <div className="flex items-center gap-2">
                          {getTierIcon(plan.tier)}
                          <span>{plan.name}</span>
                          <Badge variant="outline" className="ml-2 text-xs">
                            {plan.tier}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedPlanId && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm font-medium mb-2">Plan Features:</p>
                  <div className="flex flex-wrap gap-1">
                    {plans
                      .find((p) => p.id === selectedPlanId)
                      ?.features.slice(0, 6)
                      .map((feature) => (
                        <Badge key={feature} variant="secondary" className="text-xs">
                          {feature.replace(/_/g, ' ')}
                        </Badge>
                      ))}
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsAssignDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAssignPlan}
                disabled={isSubmitting || !selectedPlanId}
              >
                {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Assign Plan
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default SchoolSubscriptionPage;
