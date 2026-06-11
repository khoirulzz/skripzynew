"use client";

import { useCallback } from "react";

export function useHaptics() {
  const isCapacitor = typeof window !== 'undefined' && window.Capacitor && window.Capacitor.isNativePlatform();

  const vibrateLight = useCallback(async () => {
    if (isCapacitor) {
      try {
        const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
        await Haptics.impact({ style: ImpactStyle.Light });
      } catch (e) {
        // Ignore error if unsupported
      }
    }
  }, [isCapacitor]);

  const vibrateMedium = useCallback(async () => {
    if (isCapacitor) {
      try {
        const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
        await Haptics.impact({ style: ImpactStyle.Medium });
      } catch (e) {
        // Ignore
      }
    }
  }, [isCapacitor]);

  const vibrateHeavy = useCallback(async () => {
    if (isCapacitor) {
      try {
        const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
        await Haptics.impact({ style: ImpactStyle.Heavy });
      } catch (e) {
        // Ignore
      }
    }
  }, [isCapacitor]);

  const vibrateError = useCallback(async () => {
    if (isCapacitor) {
      try {
        const { Haptics, NotificationType } = await import('@capacitor/haptics');
        await Haptics.notification({ type: NotificationType.Error });
      } catch (e) {
        // Ignore
      }
    }
  }, [isCapacitor]);

  const vibrateSuccess = useCallback(async () => {
    if (isCapacitor) {
      try {
        const { Haptics, NotificationType } = await import('@capacitor/haptics');
        await Haptics.notification({ type: NotificationType.Success });
      } catch (e) {
        // Ignore
      }
    }
  }, [isCapacitor]);

  return { vibrateLight, vibrateMedium, vibrateHeavy, vibrateError, vibrateSuccess };
}
