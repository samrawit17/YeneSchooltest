"use client";

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { usePlans } from '@/hooks/useSubscription';
import { subscriptionAPI } from '@/lib/api/subscription';
import { toast } from 'sonner';
import {
  Crown,
  Shield,
  Zap,
  Plus,
  Edit,
  Trash2,
  Check,
  X,
  ChevronDown,
  Building2,
  Users,
  Settings,
  Star,
  Loader2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
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
import { Plan, PlanTier, FEATURE_LIST, TIER_CONFIG } from '@/types/subscription';

const getFeaturesByTier = (tier: PlanTier): typeof FEATURE_LIST => {
  const tierOrder: PlanTier[] = ['CORE', 'STANDARD', 'ULTIMATE'];
  const tierIndex = tierOrder.indexOf(tier);
  return FEATURE_LIST.filter((f) => tierOrder.indexOf(f.tier as PlanTier) <= tierIndex);
};

const getFeatureKeysByTier = (tier: PlanTier) =>
  getFeaturesByTier(tier).map((feature) => feature.key);

const SubscriptionPlansPage = () => {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { plans, loading, error, createPlan, updatePlan, deletePlan, fetchPlans } = usePlans();
  const [schools, setSchools] = useState<{ id: string; name: string; email: string; plan: { id: string; name: string; tier: string } | null; _count?: { users?: number } }[]>([]);
  const [loadingSchools, setLoadingSchools] = useState(false);
  const [schoolsLoaded, setSchoolsLoaded] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('plans');

  const [formData, setFormData] = useState({
    name: '',
    tier: 'CORE' as PlanTier,
    description: '',
    features: getFeatureKeysByTier('CORE'),
  });

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

  const fetchSchools = useCallback(async () => {
    try {
      setLoadingSchools(true);
      const response = await subscriptionAPI.getSchools();
      setSchools(response.data);
    } catch (error) {
      console.error('Failed to fetch schools:', error);
      toast.error('Failed to load schools');
    } finally {
      setLoadingSchools(false);
      setSchoolsLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'schools' && !schoolsLoaded && !loadingSchools) {
      void fetchSchools();
    }
  }, [activeTab, fetchSchools, loadingSchools, schoolsLoaded]);

  const getTierIcon = (tier: PlanTier) => {
    switch (tier) {
      case 'CORE':
        return <Shield className="w-5 h-5" />;
      case 'STANDARD':
        return <Star className="w-5 h-5" />;
      case 'ULTIMATE':
        return <Crown className="w-5 h-5" />;
    }
  };

  const getTierColor = (tier: PlanTier) => {
    switch (tier) {
      case 'CORE':
        return 'bg-gray-500';
      case 'STANDARD':
        return 'bg-blue-500';
      case 'ULTIMATE':
        return 'bg-purple-500';
    }
  };

  const getSchoolsCountForPlan = (planId: string) => {
    const plan = plans.find((item) => item.id === planId);
    if (!schoolsLoaded) {
      return plan?.assignedSchoolsCount || 0;
    }
    return schools.filter((s: any) => s.plan?.id === planId).length;
  };

  const handleOpenDialog = (plan?: Plan) => {
    if (plan) {
      setEditingPlan(plan);
      setFormData({
        name: plan.name,
        tier: plan.tier,
        description: plan.description || '',
        features: plan.features || [],
      });
    } else {
      setEditingPlan(null);
      setFormData({
        name: '',
        tier: 'CORE',
        description: '',
        features: getFeatureKeysByTier('CORE'),
      });
    }
    setIsDialogOpen(true);
  };

  const handleTierChange = (tier: PlanTier) => {
    setFormData((prev) => ({
      ...prev,
      tier,
      features: getFeatureKeysByTier(tier),
    }));
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error('Plan name is required');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingPlan) {
        await updatePlan(editingPlan.id, formData);
      } else {
        await createPlan(formData);
      }
      setIsDialogOpen(false);
      await fetchPlans();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePlan = async (plan: Plan) => {
    if (!confirm(`Are you sure you want to delete "${plan.name}"?`)) {
      return;
    }

    const schoolsCount = getSchoolsCountForPlan(plan.id);
    if (schoolsCount > 0) {
      toast.error(`Cannot delete plan: ${schoolsCount} schools are using this plan`);
      return;
    }

    await deletePlan(plan.id);
  };

  const toggleFeature = (featureKey: string) => {
    setFormData((prev) => ({
      ...prev,
      features: prev.features.includes(featureKey)
        ? prev.features.filter((f) => f !== featureKey)
        : [...prev.features, featureKey],
    }));
  };

  if (loading || authLoading) {
    return (
    <div className="flex-1 p-4 md:p-6 bg-gray-50 dark:bg-gray-900">
      <div>
          <div className="mb-6">
            <Skeleton className="h-10 w-64 mb-2" />
            <Skeleton className="h-5 w-96" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-32" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 p-4 md:p-6 bg-gray-50 dark:bg-gray-900">
        <Card className="max-w-2xl dark:bg-gray-800 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
              <AlertCircle className="h-5 w-5 text-red-600" />
              Subscription data unavailable
            </CardTitle>
            <CardDescription className="dark:text-gray-400">{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => fetchPlans()} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 md:p-6 bg-gray-50 dark:bg-gray-900">
      <div>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Subscription Plans</h1>
              <p className="text-gray-600 dark:text-gray-400">Manage subscription tiers and features</p>
            </div>
            <div className="flex items-center gap-2">
              <TabsList className="inline-flex h-auto w-max min-w-0 flex-nowrap bg-transparent p-0 shadow-none border-0">
                <TabsTrigger value="plans" className="shrink-0 gap-1.5 px-3 text-xs font-semibold data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-[var(--brand-color,#e35336)] data-[state=active]:text-[var(--brand-color,#e35336)] rounded-none md:gap-2 md:px-4 md:text-sm dark:text-gray-400 dark:data-[state=active]:text-[var(--brand-color,#e35336)]">Plans</TabsTrigger>
                <TabsTrigger value="schools" className="shrink-0 gap-1.5 px-3 text-xs font-semibold data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-[var(--brand-color,#e35336)] data-[state=active]:text-[var(--brand-color,#e35336)] rounded-none md:gap-2 md:px-4 md:text-sm dark:text-gray-400 dark:data-[state=active]:text-[var(--brand-color,#e35336)]">Schools</TabsTrigger>
                <TabsTrigger value="features" className="shrink-0 gap-1.5 px-3 text-xs font-semibold data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-[var(--brand-color,#e35336)] data-[state=active]:text-[var(--brand-color,#e35336)] rounded-none md:gap-2 md:px-4 md:text-sm dark:text-gray-400 dark:data-[state=active]:text-[var(--brand-color,#e35336)]">Feature Matrix</TabsTrigger>
              </TabsList>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => handleOpenDialog()} className="gap-2">
                    <Plus className="w-4 h-4" />
                    Create Plan
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto dark:bg-gray-800 dark:border-gray-700">
                  <DialogHeader>
                    <DialogTitle className="dark:text-white">
                      {editingPlan ? 'Edit Plan' : 'Create New Plan'}
                    </DialogTitle>
                    <DialogDescription className="dark:text-gray-400">
                      {editingPlan
                        ? 'Update the plan details and features'
                        : 'Create a new subscription plan for schools'}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name" className="dark:text-gray-300">Plan Name</Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) =>
                            setFormData({ ...formData, name: e.target.value })
                          }
                          placeholder="e.g., Premium School"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="tier" className="dark:text-gray-300">Tier</Label>
                        <Select
                          value={formData.tier}
                          onValueChange={(value) => handleTierChange(value as PlanTier)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select tier" />
                          </SelectTrigger>
                          <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                            <SelectItem value="CORE">
                              <div className="flex items-center gap-2">
                                <Shield className="w-4 h-4" />
                                Core
                              </div>
                            </SelectItem>
                            <SelectItem value="STANDARD">
                              <div className="flex items-center gap-2">
                                <Star className="w-4 h-4" />
                                Standard
                              </div>
                            </SelectItem>
                            <SelectItem value="ULTIMATE">
                              <div className="flex items-center gap-2">
                                <Crown className="w-4 h-4" />
                                Ultimate
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description" className="dark:text-gray-300">Description</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) =>
                          setFormData({ ...formData, description: e.target.value })
                        }
                        placeholder="Brief description of the plan"
                        rows={2}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="dark:text-gray-300">Features</Label>
                      <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto border rounded-lg p-3 dark:border-gray-700">
                        {FEATURE_LIST.map((feature) => (
                          <div
                            key={feature.key}
                            className="flex items-center gap-2 p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700/50"
                          >
                            <Checkbox
                              id={feature.key}
                              checked={formData.features.includes(feature.key)}
                              onCheckedChange={() => toggleFeature(feature.key)}
                            />
                            <Label
                              htmlFor={feature.key}
                              className="text-sm cursor-pointer flex-1 dark:text-gray-300"
                            >
                              {feature.name}
                            </Label>
                            <Badge
                              variant="outline"
                              className={`text-xs ${
                                feature.tier === 'CORE'
                                  ? 'border-gray-400 text-gray-600 dark:text-gray-400'
                                  : feature.tier === 'STANDARD'
                                  ? 'border-blue-400 text-blue-600 dark:text-blue-400'
                                  : 'border-purple-400 text-purple-600 dark:text-purple-400'
                              }`}
                            >
                              {feature.tier}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={isSubmitting}>
                      {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      {editingPlan ? 'Update Plan' : 'Create Plan'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <TabsContent value="plans" className="mt-0">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {plans.length === 0 ? (
                <Card className="col-span-full dark:bg-gray-800 dark:border-gray-700">
                  <CardContent className="py-12 text-center">
                    <Shield className="w-12 h-12 mx-auto text-gray-400 dark:text-gray-500 mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      No Plans Found
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                      Create your first subscription plan to get started
                    </p>
                    <Button onClick={() => handleOpenDialog()}>
                      <Plus className="w-4 h-4 mr-2" />
                      Create Plan
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                plans.map((plan) => (
                  <Card
                    key={plan.id}
                    className={`relative overflow-hidden dark:bg-gray-800 ${
                      plan.tier === 'CORE'
                        ? 'border-gray-200 dark:border-gray-700'
                        : plan.tier === 'STANDARD'
                        ? 'border-blue-200 dark:border-blue-800'
                        : 'border-purple-200 dark:border-purple-800'
                    }`}
                  >
                    <div
                      className={`absolute top-0 left-0 right-0 h-1 ${getTierColor(
                        plan.tier
                      )}`}
                    />
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-10 h-10 rounded-lg flex items-center justify-center text-white ${getTierColor(
                              plan.tier
                            )}`}
                          >
                            {getTierIcon(plan.tier)}
                          </div>
                          <div>
                            <CardTitle className="text-lg text-gray-900 dark:text-white">{plan.name}</CardTitle>
                            <Badge
                              variant="outline"
                              className={`mt-1 ${
                                plan.tier === 'CORE'
                                  ? 'border-gray-400 text-gray-600 dark:text-gray-400'
                                  : plan.tier === 'STANDARD'
                                  ? 'border-blue-400 text-blue-600 dark:text-blue-400'
                                  : 'border-purple-400 text-purple-600 dark:text-purple-400'
                              }`}
                            >
                              {plan.tier}
                            </Badge>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <Settings className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="dark:bg-gray-800 dark:border-gray-700">
                            <DropdownMenuItem
                              onClick={() => handleOpenDialog(plan)}
                              className="gap-2 dark:focus:bg-gray-700"
                            >
                              <Edit className="w-4 h-4" />
                              Edit Plan
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="dark:bg-gray-700" />
                            <DropdownMenuItem
                              onClick={() => handleDeletePlan(plan)}
                              className="gap-2 text-red-600 dark:text-red-400 dark:focus:bg-gray-700"
                            >
                              <Trash2 className="w-4 h-4" />
                              Delete Plan
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <CardDescription className="mt-2 dark:text-gray-400">
                        {plan.description || TIER_CONFIG[plan.tier].description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">Schools</span>
                          <span className="font-semibold dark:text-white">
                            {getSchoolsCountForPlan(plan.id)}
                          </span>
                        </div>
                        <Separator className="dark:bg-gray-700" />
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                            {plan.features?.length || 0} Features Included
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {(plan.features || []).slice(0, 4).map((feature) => (
                              <Badge
                                key={feature}
                                variant="secondary"
                                className="text-xs"
                              >
                                {feature.replace(/_/g, ' ')}
                              </Badge>
                            ))}
                            {(plan.features?.length || 0) > 4 && (
                              <Badge variant="outline" className="text-xs">
                                +{(plan.features?.length || 0) - 4} more
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="bg-gray-50 dark:bg-gray-800/80 border-t dark:border-gray-700">
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <Building2 className="w-4 h-4" />
                        {getSchoolsCountForPlan(plan.id)} schools subscribed
                      </div>
                    </CardFooter>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="schools" className="mt-0">
            <Card className="dark:bg-gray-800 dark:border-gray-700">
              <CardHeader>
                <CardTitle className="dark:text-white">Schools</CardTitle>
                <CardDescription className="dark:text-gray-400">
                  Assign subscription plans to schools
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingSchools ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-[var(--brand-color,#e35336)]" />
                  </div>
                ) : schools.length === 0 ? (
                  <div className="text-center py-8">
                    <Building2 className="w-12 h-12 mx-auto text-gray-400 dark:text-gray-500 mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">No schools found</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {schools.map((school: any) => {
                      const schoolPlan = school.plan;
                      return (
                        <div
                          key={school.id}
                          className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 dark:border-gray-700 dark:bg-gray-800/50"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                              <Building2 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                            </div>
                            <div>
                              <p className="font-medium dark:text-white">{school.name}</p>
                              <p className="text-sm text-gray-500 dark:text-gray-400">{school.email}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {schoolPlan ? (
                              <Badge
                                variant="outline"
                                className={`gap-1 ${
                                  schoolPlan.tier === 'CORE'
                                    ? 'border-gray-400 text-gray-600 dark:text-gray-400'
                                    : schoolPlan.tier === 'STANDARD'
                                    ? 'border-blue-400 text-blue-600 dark:text-blue-400'
                                    : 'border-purple-400 text-purple-600 dark:text-purple-400'
                                }`}
                              >
                                {schoolPlan.tier === 'CORE' ? (
                                  <Shield className="w-3 h-3" />
                                ) : schoolPlan.tier === 'STANDARD' ? (
                                  <Star className="w-3 h-3" />
                                ) : (
                                  <Crown className="w-3 h-3" />
                                )}
                                {schoolPlan.name}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-yellow-600 border-yellow-200 dark:text-yellow-400 dark:border-yellow-800">
                                No Plan
                              </Badge>
                            )}
                            <Select
                              value={schoolPlan?.id || 'none'}
                              onValueChange={async (value) => {
                                try {
                                  await subscriptionAPI.assignPlan(
                                    school.id,
                                    value === 'none' ? null : value
                                  );
                                  toast.success('Plan assigned successfully');
                                  await fetchSchools();
                                } catch (error: any) {
                                  toast.error(error.response?.data?.message || 'Failed to assign plan');
                                }
                              }}
                            >
                              <SelectTrigger className="w-40">
                                <SelectValue placeholder="Assign Plan" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">No Plan</SelectItem>
                                {plans.map((plan) => (
                                  <SelectItem key={plan.id} value={plan.id}>
                                    {plan.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="features" className="mt-0">
            <Card className="dark:bg-gray-800 dark:border-gray-700">
              <CardHeader>
                <CardTitle className="dark:text-white">Feature Matrix</CardTitle>
                <CardDescription className="dark:text-gray-400">
                  Overview of all features by subscription tier
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b dark:border-gray-700">
                        <th className="text-left py-3 px-4 font-medium dark:text-white">Feature</th>
                        <th className="text-center py-3 px-4 font-medium dark:text-white">
                          <div className="flex items-center justify-center gap-1">
                            <Shield className="w-4 h-4" />
                            Core
                          </div>
                          <span className="text-xs font-normal text-gray-500 dark:text-gray-400">(Core features)</span>
                        </th>
                        <th className="text-center py-3 px-4 font-medium dark:text-white">
                          <div className="flex items-center justify-center gap-1">
                            <Star className="w-4 h-4" />
                            Standard
                          </div>
                          <span className="text-xs font-normal text-gray-500 dark:text-gray-400">(Core + Standard)</span>
                        </th>
                        <th className="text-center py-3 px-4 font-medium dark:text-white">
                          <div className="flex items-center justify-center gap-1">
                            <Crown className="w-4 h-4" />
                            Ultimate
                          </div>
                          <span className="text-xs font-normal text-gray-500 dark:text-gray-400">(All features)</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {FEATURE_LIST.map((feature) => (
                        <tr key={feature.key} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                          <td className="py-3 px-4">
                            <div>
                              <p className="font-medium dark:text-white">{feature.name}</p>
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                {feature.description}
                              </p>
                            </div>
                          </td>
                          <td className="text-center py-3 px-4">
                            {feature.tier === 'CORE' ? (
                              <Check className="w-5 h-5 mx-auto text-green-600" />
                            ) : (
                              <X className="w-5 h-5 mx-auto text-gray-300 dark:text-gray-600" />
                            )}
                          </td>
                          <td className="text-center py-3 px-4">
                            {feature.tier === 'CORE' || feature.tier === 'STANDARD' ? (
                              <Check className="w-5 h-5 mx-auto text-green-600" />
                            ) : (
                              <X className="w-5 h-5 mx-auto text-gray-300 dark:text-gray-600" />
                            )}
                          </td>
                          <td className="text-center py-3 px-4">
                            <Check className="w-5 h-5 mx-auto text-green-600" />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default SubscriptionPlansPage;
