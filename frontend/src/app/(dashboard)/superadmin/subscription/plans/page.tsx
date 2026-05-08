"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { usePlans } from '@/hooks/useSubscription';
import { subscriptionAPI } from '@/lib/api/subscription';
import { superadminAPI } from '@/lib/api/superadmin';
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

const SubscriptionPlansPage = () => {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { plans, loading, createPlan, updatePlan, deletePlan, fetchPlans } = usePlans();
  const [schools, setSchools] = useState<{ id: string; name: string; email: string; plan: { id: string; name: string; tier: string } | null; _count?: { users?: number } }[]>([]);
  const [loadingSchools, setLoadingSchools] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('plans');

  const [formData, setFormData] = useState({
    name: '',
    tier: 'CORE' as PlanTier,
    description: '',
    features: [] as string[],
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
      fetchSchools();
    }
  }, [isAuthenticated, authLoading, user, router]);

  const fetchSchools = async () => {
    try {
      setLoadingSchools(true);
      const response = await superadminAPI.getSchools();
      setSchools(response.data);
    } catch (error) {
      console.error('Failed to fetch schools:', error);
    } finally {
      setLoadingSchools(false);
    }
  };

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
        features: [],
      });
    }
    setIsDialogOpen(true);
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

  const getFeaturesByTier = (tier: PlanTier): typeof FEATURE_LIST => {
    const tierOrder: PlanTier[] = ['CORE', 'STANDARD', 'ULTIMATE'];
    const tierIndex = tierOrder.indexOf(tier);
    return FEATURE_LIST.filter((f) => tierOrder.indexOf(f.tier as PlanTier) <= tierIndex);
  };

  if (loading || authLoading) {
    return (
      <div className="flex-1 p-4 md:p-6">
        <div className="max-w-7xl mx-auto">
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

  return (
    <div className="flex-1 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Subscription Plans</h1>
              <p className="text-gray-600">Manage subscription tiers and features</p>
            </div>
            <div className="flex items-center gap-2">
              <TabsList>
                <TabsTrigger value="plans">Plans</TabsTrigger>
                <TabsTrigger value="schools">Schools</TabsTrigger>
                <TabsTrigger value="features">Feature Matrix</TabsTrigger>
              </TabsList>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => handleOpenDialog()} className="gap-2">
                    <Plus className="w-4 h-4" />
                    Create Plan
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>
                      {editingPlan ? 'Edit Plan' : 'Create New Plan'}
                    </DialogTitle>
                    <DialogDescription>
                      {editingPlan
                        ? 'Update the plan details and features'
                        : 'Create a new subscription plan for schools'}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Plan Name</Label>
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
                        <Label htmlFor="tier">Tier</Label>
                        <Select
                          value={formData.tier}
                          onValueChange={(value) =>
                            setFormData({ ...formData, tier: value as PlanTier })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select tier" />
                          </SelectTrigger>
                          <SelectContent>
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
                      <Label htmlFor="description">Description</Label>
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
                      <Label>Features</Label>
                      <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto border rounded-lg p-3">
                        {FEATURE_LIST.map((feature) => (
                          <div
                            key={feature.key}
                            className="flex items-center gap-2 p-2 rounded hover:bg-gray-50"
                          >
                            <Checkbox
                              id={feature.key}
                              checked={formData.features.includes(feature.key)}
                              onCheckedChange={() => toggleFeature(feature.key)}
                            />
                            <Label
                              htmlFor={feature.key}
                              className="text-sm cursor-pointer flex-1"
                            >
                              {feature.name}
                            </Label>
                            <Badge
                              variant="outline"
                              className={`text-xs ${
                                feature.tier === 'CORE'
                                  ? 'border-gray-400 text-gray-600'
                                  : feature.tier === 'STANDARD'
                                  ? 'border-blue-400 text-blue-600'
                                  : 'border-purple-400 text-purple-600'
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
                <Card className="col-span-full">
                  <CardContent className="py-12 text-center">
                    <Shield className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      No Plans Found
                    </h3>
                    <p className="text-gray-600 mb-4">
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
                    className={`relative overflow-hidden ${
                      plan.tier === 'CORE'
                        ? 'border-gray-200'
                        : plan.tier === 'STANDARD'
                        ? 'border-blue-200'
                        : 'border-purple-200'
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
                            <CardTitle className="text-lg">{plan.name}</CardTitle>
                            <Badge
                              variant="outline"
                              className={`mt-1 ${
                                plan.tier === 'CORE'
                                  ? 'border-gray-400 text-gray-600'
                                  : plan.tier === 'STANDARD'
                                  ? 'border-blue-400 text-blue-600'
                                  : 'border-purple-400 text-purple-600'
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
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => handleOpenDialog(plan)}
                              className="gap-2"
                            >
                              <Edit className="w-4 h-4" />
                              Edit Plan
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleDeletePlan(plan)}
                              className="gap-2 text-red-600"
                            >
                              <Trash2 className="w-4 h-4" />
                              Delete Plan
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <CardDescription className="mt-2">
                        {plan.description || TIER_CONFIG[plan.tier].description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Schools</span>
                          <span className="font-semibold">
                            {getSchoolsCountForPlan(plan.id)}
                          </span>
                        </div>
                        <Separator />
                        <div>
                          <p className="text-sm text-gray-600 mb-2">
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
                    <CardFooter className="bg-gray-50 border-t">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
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
            <Card>
              <CardHeader>
                <CardTitle>Schools</CardTitle>
                <CardDescription>
                  Assign subscription plans to schools
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingSchools ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
                  </div>
                ) : schools.length === 0 ? (
                  <div className="text-center py-8">
                    <Building2 className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-600">No schools found</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {schools.map((school: any) => {
                      const schoolPlan = school.plan;
                      return (
                        <div
                          key={school.id}
                          className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                              <Building2 className="w-5 h-5 text-purple-600" />
                            </div>
                            <div>
                              <p className="font-medium">{school.name}</p>
                              <p className="text-sm text-gray-500">{school.email}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {schoolPlan ? (
                              <Badge
                                variant="outline"
                                className={`gap-1 ${
                                  schoolPlan.tier === 'CORE'
                                    ? 'border-gray-400 text-gray-600'
                                    : schoolPlan.tier === 'STANDARD'
                                    ? 'border-blue-400 text-blue-600'
                                    : 'border-purple-400 text-purple-600'
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
                              <Badge variant="outline" className="text-yellow-600 border-yellow-200">
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
            <Card>
              <CardHeader>
                <CardTitle>Feature Matrix</CardTitle>
                <CardDescription>
                  Overview of all features by subscription tier
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 font-medium">Feature</th>
                        <th className="text-center py-3 px-4 font-medium">
                          <div className="flex items-center justify-center gap-1">
                            <Shield className="w-4 h-4" />
                            Core
                          </div>
                          <span className="text-xs font-normal text-gray-500">(Core features)</span>
                        </th>
                        <th className="text-center py-3 px-4 font-medium">
                          <div className="flex items-center justify-center gap-1">
                            <Star className="w-4 h-4" />
                            Standard
                          </div>
                          <span className="text-xs font-normal text-gray-500">(Core + Standard)</span>
                        </th>
                        <th className="text-center py-3 px-4 font-medium">
                          <div className="flex items-center justify-center gap-1">
                            <Crown className="w-4 h-4" />
                            Ultimate
                          </div>
                          <span className="text-xs font-normal text-gray-500">(All features)</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {FEATURE_LIST.map((feature) => (
                        <tr key={feature.key} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4">
                            <div>
                              <p className="font-medium">{feature.name}</p>
                              <p className="text-sm text-gray-500">
                                {feature.description}
                              </p>
                            </div>
                          </td>
                          <td className="text-center py-3 px-4">
                            {feature.tier === 'CORE' ? (
                              <Check className="w-5 h-5 mx-auto text-green-600" />
                            ) : (
                              <X className="w-5 h-5 mx-auto text-gray-300" />
                            )}
                          </td>
                          <td className="text-center py-3 px-4">
                            {feature.tier === 'CORE' || feature.tier === 'STANDARD' ? (
                              <Check className="w-5 h-5 mx-auto text-green-600" />
                            ) : (
                              <X className="w-5 h-5 mx-auto text-gray-300" />
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
