import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import {
  AuthState,
  Injury,
  OnboardingState,
  PlanState,
  TodayState,
} from './types';
import { seedPlan } from './data';

const initialOnboarding: OnboardingState = {
  step: 1,
  profile: { age: 34, weight: 72, height: 178, sex: 'female' },
  background: { ability: 'getting-back', frequency: 1, injuries: ['none'] },
  goal: { type: '5k', targetDate: '9 Aug 2026', daysPerWeek: 4 },
  generating: false,
};

const initialAuth: AuthState = {
  email: '',
  session: false,
  needs2fa: false,
  code: '',
  resendCountdown: 24,
  error: null,
};

interface Store {
  onboarding: OnboardingState;
  auth: AuthState;
  plan: PlanState;
  /** Which of the five designed Today variants to render. */
  todayState: TodayState;

  setOnboarding: React.Dispatch<React.SetStateAction<OnboardingState>>;
  toggleInjury: (injury: Injury) => void;

  setAuth: React.Dispatch<React.SetStateAction<AuthState>>;

  setTodayState: (s: TodayState) => void;
  pausePlan: () => void;
  resumePlan: () => void;
  retrySync: () => void;
}

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [onboarding, setOnboarding] = useState(initialOnboarding);
  const [auth, setAuth] = useState(initialAuth);
  const [plan, setPlan] = useState(seedPlan);
  const [todayState, setTodayState] = useState<TodayState>('planned');

  const toggleInjury = useCallback((injury: Injury) => {
    setOnboarding((prev) => {
      const has = prev.background.injuries.includes(injury);
      // "none" is exclusive with the specific injuries.
      let next: Injury[];
      if (injury === 'none') {
        next = has ? [] : ['none'];
      } else {
        const without = prev.background.injuries.filter((i) => i !== 'none');
        next = has ? without.filter((i) => i !== injury) : [...without, injury];
      }
      return { ...prev, background: { ...prev.background, injuries: next } };
    });
  }, []);

  const pausePlan = useCallback(() => {
    setPlan((p) => ({ ...p, status: 'paused', pausedAt: '15 Jul' }));
    setTodayState('paused');
  }, []);

  const resumePlan = useCallback(() => {
    setPlan((p) => ({ ...p, status: 'active', pausedAt: null }));
    setTodayState('planned');
  }, []);

  const retrySync = useCallback(() => setTodayState('planned'), []);

  const value = useMemo<Store>(
    () => ({
      onboarding,
      auth,
      plan,
      todayState,
      setOnboarding,
      toggleInjury,
      setAuth,
      setTodayState,
      pausePlan,
      resumePlan,
      retrySync,
    }),
    [onboarding, auth, plan, todayState, toggleInjury, pausePlan, resumePlan, retrySync],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within a StoreProvider');
  return ctx;
}
