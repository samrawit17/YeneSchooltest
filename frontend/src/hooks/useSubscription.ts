import { useState, useEffect, useCallback } from 'react';
import { subscriptionAPI } from '@/lib/api/subscription';
import { toast } from 'sonner';
import {
  Plan,
  Subscription,
  SchoolWithPlan,
  CreatePlanInput,
  UpdatePlanInput,
  AssignPlanInput,
  PlanTier,
} from '@/types/subscription';

export const usePlans = () => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPlans = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await subscriptionAPI.getAllPlans();
      setPlans(response.data);
    } catch (err: any) {
      const message = err.response?.data?.message || 'Failed to fetch plans';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const createPlan = async (data: CreatePlanInput): Promise<Plan | null> => {
    try {
      const response = await subscriptionAPI.createPlan(data);
      toast.success('Plan created successfully');
      await fetchPlans();
      return response.data;
    } catch (err: any) {
      const message = err.response?.data?.message || 'Failed to create plan';
      toast.error(message);
      return null;
    }
  };

  const updatePlan = async (id: string, data: UpdatePlanInput): Promise<Plan | null> => {
    try {
      const response = await subscriptionAPI.updatePlan(id, data);
      toast.success('Plan updated successfully');
      await fetchPlans();
      return response.data;
    } catch (err: any) {
      const message = err.response?.data?.message || 'Failed to update plan';
      toast.error(message);
      return null;
    }
  };

  const deletePlan = async (id: string): Promise<boolean> => {
    try {
      await subscriptionAPI.deletePlan(id);
      toast.success('Plan deleted successfully');
      await fetchPlans();
      return true;
    } catch (err: any) {
      const message = err.response?.data?.message || 'Failed to delete plan';
      toast.error(message);
      return false;
    }
  };

  return {
    plans,
    loading,
    error,
    fetchPlans,
    createPlan,
    updatePlan,
    deletePlan,
  };
};

export const useSchoolPlans = () => {
  const [schools, setSchools] = useState<SchoolWithPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSchools = useCallback(async (planId?: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await subscriptionAPI.getSchools(planId);
      setSchools(response.data);
    } catch (err: any) {
      const message = err.response?.data?.message || 'Failed to fetch schools';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSchools();
  }, [fetchSchools]);

  const assignPlan = async (data: AssignPlanInput): Promise<boolean> => {
    try {
      await subscriptionAPI.assignPlan(data.schoolId, data.planId);
      toast.success('Plan assigned successfully');
      await fetchSchools();
      return true;
    } catch (err: any) {
      const message = err.response?.data?.message || 'Failed to assign plan';
      toast.error(message);
      return false;
    }
  };

  const getSchoolPlan = async (schoolId: string): Promise<Plan | null> => {
    try {
      const response = await subscriptionAPI.getSchoolPlan(schoolId);
      return response.data;
    } catch (err: any) {
      console.error('Failed to fetch school plan:', err);
      return null;
    }
  };

  return {
    schools,
    loading,
    error,
    fetchSchools,
    assignPlan,
    getSchoolPlan,
  };
};

export const usePlanFeatures = () => {
  const checkFeature = async (schoolId: string, feature: string) => {
    try {
      const response = await subscriptionAPI.checkFeature(schoolId, feature);
      return response.data;
    } catch (err: any) {
      return { hasAccess: false, feature, tier: 'CORE' as PlanTier };
    }
  };

  return { checkFeature };
};

export const useSubscription = () => {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(false);

  const getSubscription = async (schoolId: string) => {
    try {
      setLoading(true);
      const response = await subscriptionAPI.getSchoolSubscription(schoolId);
      setSubscription(response.data);
      return response.data;
    } catch (err: any) {
      console.error('Failed to fetch subscription:', err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    subscription,
    loading,
    getSubscription,
  };
};
