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
  PaginatedResponse,
} from '@/types/subscription';

const isCanceledRequest = (err: any) =>
  err?.code === 'ERR_CANCELED' ||
  err?.name === 'CanceledError' ||
  err?.message === 'canceled';

export const usePlans = () => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPlans = useCallback(async (options?: { signal?: AbortSignal; showToast?: boolean }) => {
    try {
      setLoading(true);
      setError(null);
      const response = await subscriptionAPI.getAllPlans({ signal: options?.signal });
      const result = Array.isArray(response.data) ? response.data : response.data?.data;
      setPlans(Array.isArray(result) ? result : []);
    } catch (err: any) {
      if (isCanceledRequest(err)) return;
      const message = err.response?.data?.message || 'Failed to fetch plans';
      setError(message);
      if (options?.showToast !== false) {
        toast.error(message);
      }
    } finally {
      if (!options?.signal?.aborted) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchPlans({ signal: controller.signal });
    return () => controller.abort();
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

  const fetchSchools = useCallback(async (
    planId?: string,
    options?: { signal?: AbortSignal; showToast?: boolean },
  ) => {
    try {
      setLoading(true);
      setError(null);
      const response = await subscriptionAPI.getSchools(planId, { signal: options?.signal });
      const result = Array.isArray(response.data) ? response.data : response.data?.data;
      setSchools(Array.isArray(result) ? result : []);
    } catch (err: any) {
      if (isCanceledRequest(err)) return;
      const message = err.response?.data?.message || 'Failed to fetch schools';
      setError(message);
      if (options?.showToast !== false) {
        toast.error(message);
      }
    } finally {
      if (!options?.signal?.aborted) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchSchools(undefined, { signal: controller.signal });
    return () => controller.abort();
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

  const renewSubscription = async (subscriptionId: string): Promise<Subscription | null> => {
    try {
      setLoading(true);
      const response = await subscriptionAPI.renewSubscription(subscriptionId);
      setSubscription(response.data);
      toast.success('Subscription renewed for another year');
      return response.data;
    } catch (err: any) {
      const message = err.response?.data?.message || 'Failed to renew subscription';
      toast.error(message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    subscription,
    loading,
    getSubscription,
    renewSubscription,
  };
};
