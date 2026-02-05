import { useEffect, useCallback, useRef } from 'react';
import { useAppStore } from '../stores/appStore';
import type { Position } from '../types';
import { hasMovedSignificantly } from '../utils/coordinates';

const DEFAULT_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 10000,
  maximumAge: 0,
};

/**
 * Hook to manage geolocation watching
 */
export function useGeolocation() {
  const watchIdRef = useRef<number | null>(null);
  const lastPositionRef = useRef<Position | null>(null);

  const {
    position,
    positionHistory,
    heading,
    geolocationError,
    isWatching,
    permissionState,
    settings,
    setPosition,
    setHeading,
    setGeolocationError,
    setIsWatching,
    setPermissionState,
  } = useAppStore();

  // Check for geolocation support
  const isSupported = 'geolocation' in navigator;

  // Handle position update
  const handlePosition = useCallback(
    (geoPosition: GeolocationPosition) => {
      const newPosition: Position = {
        latitude: geoPosition.coords.latitude,
        longitude: geoPosition.coords.longitude,
        heading: geoPosition.coords.heading,
        accuracy: geoPosition.coords.accuracy,
        timestamp: geoPosition.timestamp,
      };

      // Only update if moved significantly (saves battery and reduces noise)
      if (
        hasMovedSignificantly(
          lastPositionRef.current,
          newPosition,
          settings.movementThreshold
        )
      ) {
        lastPositionRef.current = newPosition;
        setPosition(newPosition);
        setGeolocationError(null);

        // Update heading separately if available
        if (geoPosition.coords.heading !== null) {
          setHeading(geoPosition.coords.heading);
        }
      }
    },
    [setPosition, setGeolocationError, setHeading, settings.movementThreshold]
  );

  // Handle error
  const handleError = useCallback(
    (error: GeolocationPositionError) => {
      setGeolocationError(error);

      if (error.code === error.PERMISSION_DENIED) {
        setPermissionState('denied');
      }
    },
    [setGeolocationError, setPermissionState]
  );

  // Start watching position
  const startWatching = useCallback(() => {
    if (!isSupported) {
      setGeolocationError({
        code: 2,
        message: 'Geolocation is not supported by this browser',
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3,
      } as GeolocationPositionError);
      return;
    }

    if (watchIdRef.current !== null) return; // Already watching

    // Get initial position
    navigator.geolocation.getCurrentPosition(handlePosition, handleError, DEFAULT_OPTIONS);

    // Start watching
    watchIdRef.current = navigator.geolocation.watchPosition(
      handlePosition,
      handleError,
      DEFAULT_OPTIONS
    );

    setIsWatching(true);
    setPermissionState('granted');
  }, [isSupported, handlePosition, handleError, setIsWatching, setPermissionState, setGeolocationError]);

  // Stop watching position
  const stopWatching = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsWatching(false);
  }, [setIsWatching]);

  // Request permission
  const requestPermission = useCallback(async () => {
    if (!isSupported) {
      setPermissionState('denied');
      return false;
    }

    try {
      // Check current permission state
      const result = await navigator.permissions.query({ name: 'geolocation' });
      setPermissionState(result.state as 'prompt' | 'granted' | 'denied');

      if (result.state === 'granted') {
        startWatching();
        return true;
      } else if (result.state === 'prompt') {
        // This will trigger the permission prompt
        startWatching();
        return true;
      } else {
        return false;
      }
    } catch {
      // Fallback for browsers that don't support permissions API
      startWatching();
      return true;
    }
  }, [isSupported, setPermissionState, startWatching]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  // Listen for device orientation for compass heading
  useEffect(() => {
    const handleOrientation = (event: DeviceOrientationEvent) => {
      // Alpha is the compass heading (0-360)
      if (event.alpha !== null) {
        // On iOS, we need to use webkitCompassHeading if available
        const heading =
          (event as DeviceOrientationEvent & { webkitCompassHeading?: number })
            .webkitCompassHeading ?? (360 - event.alpha);
        setHeading(heading);
      }
    };

    // Request permission for device orientation on iOS
    const requestOrientationPermission = async () => {
      const DeviceOrientationEvent = window.DeviceOrientationEvent as typeof window.DeviceOrientationEvent & {
        requestPermission?: () => Promise<string>;
      };

      if (typeof DeviceOrientationEvent.requestPermission === 'function') {
        try {
          const permission = await DeviceOrientationEvent.requestPermission();
          if (permission === 'granted') {
            window.addEventListener('deviceorientation', handleOrientation);
          }
        } catch {
          console.warn('Device orientation permission denied');
        }
      } else {
        window.addEventListener('deviceorientation', handleOrientation);
      }
    };

    if (isWatching) {
      requestOrientationPermission();
    }

    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  }, [isWatching, setHeading]);

  return {
    position,
    positionHistory,
    heading,
    error: geolocationError,
    isWatching,
    isSupported,
    permissionState,
    startWatching,
    stopWatching,
    requestPermission,
  };
}
