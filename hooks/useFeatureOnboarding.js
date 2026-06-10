import { useState, useEffect } from 'react';

export function useFeatureOnboarding(featureId) {
  const [showModal, setShowModal] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Check if the user has already seen the onboarding for this feature
    const storageKey = `skripzy_onboarding_v3_${featureId}`;
    const hasSeen = localStorage.getItem(storageKey);

    if (!hasSeen) {
      setShowModal(true);
    }
    
    setIsReady(true);
  }, [featureId]);

  const dismissModal = () => {
    const storageKey = `skripzy_onboarding_v3_${featureId}`;
    localStorage.setItem(storageKey, 'true');
    setShowModal(false);
  };

  return {
    showModal,
    dismissModal,
    isReady
  };
}
