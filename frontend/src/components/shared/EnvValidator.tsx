'use client'

import { useEffect } from 'react';
import { validateAndWarn } from '@/lib/utils/env-validation';

export function EnvValidator(): null {
  useEffect(() => {
    // Only run validation once on mount
    validateAndWarn();
  }, []);

  // This component renders nothing but performs validation
  return null;
}