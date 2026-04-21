"use client";

import { useSubscription } from '@/context/SubscriptionContext';
import { PlanTier } from '@/types/subscription';
import { Loader2 } from 'lucide-react';

interface FeatureGuardProps {
  children: React.ReactNode;
  feature?: string;
  tier?: PlanTier;
  fallback?: React.ReactNode;
  showUpgradePrompt?: boolean;
}

export function FeatureGuard({
  children,
  feature,
  tier,
  fallback = null,
  showUpgradePrompt = true,
}: FeatureGuardProps) {
  const { hasFeature, hasTier, loading, plan } = useSubscription();

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
      </div>
    );
  }

  const hasAccess = feature ? hasFeature(feature) : tier ? hasTier(tier) : true;

  if (!hasAccess) {
    if (!showUpgradePrompt) return <>{fallback}</>;

    return (
      <div className="p-6 text-center bg-gray-50 rounded-lg border">
        <h3 className="text-lg font-semibold text-gray-900">Feature Not Available</h3>
        <p className="text-gray-600 mt-2">
          {feature ? (
            <>This feature requires an upgraded subscription plan.</>
          ) : tier ? (
            <>This feature requires a {tier} plan or higher.</>
          ) : null}
        </p>
        <div className="mt-4">
          <span className="text-sm text-gray-500">
            Current plan: <span className="font-medium">{plan?.name || 'No Plan'}</span>
          </span>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

interface FeatureGateProps {
  features: string[];
  mode?: 'all' | 'any';
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function FeatureGate({
  features,
  mode = 'all',
  children,
  fallback = null,
}: FeatureGateProps) {
  const { hasFeature, loading } = useSubscription();

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
      </div>
    );
  }

  const hasAccess = mode === 'all'
    ? features.every(f => hasFeature(f))
    : features.some(f => hasFeature(f));

  if (!hasAccess) return <>{fallback}</>;

  return <>{children}</>;
}
