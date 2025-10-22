"use client";

import { useState, useEffect, useCallback } from "react";

const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes in milliseconds

export function useAutoDisconnect(onDisconnect: () => void) {
  const [lastActivity, setLastActivity] = useState(Date.now());
  const [showPrompt, setShowPrompt] = useState(false);
  const [autoDisconnectEnabled, setAutoDisconnectEnabled] = useState(true);

  const updateActivity = useCallback(() => {
    setLastActivity(Date.now());
    setShowPrompt(false);
  }, []);

  const handleStayConnected = useCallback(() => {
    setShowPrompt(false);
    updateActivity();
  }, [updateActivity]);

  const handleDisconnect = useCallback(() => {
    setShowPrompt(false);
    onDisconnect();
  }, [onDisconnect]);

  const toggleAutoDisconnect = useCallback((enabled: boolean) => {
    setAutoDisconnectEnabled(enabled);
    if (!enabled) {
      setShowPrompt(false);
    }
  }, []);

  useEffect(() => {
    if (!autoDisconnectEnabled) return;

    const updateActivityHandler = () => updateActivity();

    // Track user activity
    window.addEventListener('mousemove', updateActivityHandler);
    window.addEventListener('keydown', updateActivityHandler);
    window.addEventListener('click', updateActivityHandler);
    window.addEventListener('scroll', updateActivityHandler);
    window.addEventListener('touchstart', updateActivityHandler);

    // Check inactivity every minute
    const checkInterval = setInterval(() => {
      const inactiveTime = Date.now() - lastActivity;
      
      if (inactiveTime > INACTIVITY_TIMEOUT && !showPrompt) {
        setShowPrompt(true);
      }
      
      // Auto-disconnect after 2 more minutes if no response to prompt
      if (showPrompt && inactiveTime > INACTIVITY_TIMEOUT + 2 * 60 * 1000) {
        onDisconnect();
        setShowPrompt(false);
      }
    }, 60 * 1000); // Check every minute

    return () => {
      window.removeEventListener('mousemove', updateActivityHandler);
      window.removeEventListener('keydown', updateActivityHandler);
      window.removeEventListener('click', updateActivityHandler);
      window.removeEventListener('scroll', updateActivityHandler);
      window.removeEventListener('touchstart', updateActivityHandler);
      clearInterval(checkInterval);
    };
  }, [lastActivity, showPrompt, autoDisconnectEnabled, onDisconnect, updateActivity]);

  const getTimeRemaining = useCallback(() => {
    const inactiveTime = Date.now() - lastActivity;
    const remaining = Math.max(0, INACTIVITY_TIMEOUT - inactiveTime);
    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    return { minutes, seconds, remaining };
  }, [lastActivity]);

  return {
    showPrompt,
    handleStayConnected,
    handleDisconnect,
    autoDisconnectEnabled,
    toggleAutoDisconnect,
    getTimeRemaining,
  };
}


