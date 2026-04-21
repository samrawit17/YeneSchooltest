"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '@/lib/api';
import { PlanTier } from '@/types/subscription';

interface Plan {
  id: string;
  name: string;
  tier: PlanTier;
  features: string[];
}

interface SubscriptionContextType {
  plan: Plan | null;
  loading: boolean;
  hasFeature: (feature: string) => boolean;
  hasTier: (tier: PlanTier) => boolean;
  refreshPlan: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType>({
  plan: null,
  loading: true,
  hasFeature: () => false,
  hasTier: () => false,
  refreshPlan: async () => {},
});

export const useSubscription = () => useContext(SubscriptionContext);

const TIER_LEVELS: Record<PlanTier, number> = {
  CORE: 1,
  STANDARD: 2,
  ULTIMATE: 3,
};

export function SubscriptionProvider({ 
  schoolId, 
  children 
}: { 
  schoolId?: string; 
  children: ReactNode 
}) {
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchPlan = async () => {
    if (!schoolId) {
      setPlan(null);
      setLoading(false);
      return;
    }

    try {
      const response = await api.get(`/subscription/school/${schoolId}`);
      setPlan(response.data);
    } catch (error) {
      console.error('Failed to fetch school plan:', error);
      setPlan(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlan();
  }, [schoolId]);

  const hasFeature = (feature: string): boolean => {
    if (!plan) return false;
    return plan.features?.includes(feature) ?? false;
  };

  const hasTier = (tier: PlanTier): boolean => {
    if (!plan) return false;
    const currentLevel = TIER_LEVELS[plan.tier] || 0;
    const requiredLevel = TIER_LEVELS[tier] || 0;
    return currentLevel >= requiredLevel;
  };

  return (
    <SubscriptionContext.Provider 
      value={{ 
        plan, 
        loading, 
        hasFeature, 
        hasTier,
        refreshPlan: fetchPlan 
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

export function withSubscriptionCheck<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  requiredFeature?: string,
  requiredTier?: PlanTier
) {
  return function WithSubscriptionCheckComponent(props: P) {
    const { hasFeature, hasTier, loading } = useSubscription();

    if (loading) return null;

    if (requiredFeature && !hasFeature(requiredFeature)) {
      return (
        <div className="p-4 text-center">
          <h3 className="text-lg font-semibold text-gray-900">Feature Not Available</h3>
          <p className="text-gray-600 mt-2">
            This feature requires an upgraded subscription plan.
          </p>
        </div>
      );
    }

    if (requiredTier && !hasTier(requiredTier)) {
      return (
        <div className="p-4 text-center">
          <h3 className="text-lg font-semibold text-gray-900">Plan Upgrade Required</h3>
          <p className="text-gray-600 mt-2">
            This feature requires a {requiredTier} plan or higher.
          </p>
        </div>
      );
    }

    return <WrappedComponent {...props} />;
  };
}
