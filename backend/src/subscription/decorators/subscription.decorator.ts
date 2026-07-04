import { SetMetadata } from '@nestjs/common';
import {
  CORE_FEATURES,
  STANDARD_FEATURES,
  ULTIMATE_FEATURES,
  FEATURE_DESCRIPTIONS,
  FEATURE_TIERS,
} from '../constants/feature-tiers.const';

export const SUBSCRIPTION_FEATURE_KEY = 'subscription_features';

export const RequiresFeature = (...features: string[]) =>
  SetMetadata(SUBSCRIPTION_FEATURE_KEY, features);

export const RequiresTier = (tier: 'CORE' | 'STANDARD' | 'ULTIMATE') =>
  SetMetadata('minimumTier', tier);

export {
  CORE_FEATURES,
  STANDARD_FEATURES,
  ULTIMATE_FEATURES,
  FEATURE_DESCRIPTIONS,
  FEATURE_TIERS,
};

export const TIER_DESCRIPTIONS = {
  CORE: {
    name: 'Core',
    description: 'Guided school setup, reliable user management, daily attendance, calendar, and announcements',
    features: CORE_FEATURES,
  },
  STANDARD: {
    name: 'Standard',
    description: 'Complete school management with essential integrations',
    features: STANDARD_FEATURES,
  },
  ULTIMATE: {
    name: 'Ultimate',
    description: 'Full-featured platform with advanced capabilities',
    features: ULTIMATE_FEATURES,
  },
};
