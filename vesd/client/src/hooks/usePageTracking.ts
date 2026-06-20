import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { trackPageView } from '../services/analytics';

export function usePageTracking() {
  const location = useLocation();
  const prevPath = useRef('');

  useEffect(() => {
    const path = location.pathname + location.search;
    if (prevPath.current !== path) {
      prevPath.current = path;
      trackPageView(path, document.title);
    }
  }, [location]);
}
