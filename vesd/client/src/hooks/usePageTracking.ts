import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { pageView } from '../services/analytics';

export function usePageTracking() {
  const location = useLocation();
  const prevPath = useRef(location.pathname);

  useEffect(() => {
    if (prevPath.current !== location.pathname) {
      prevPath.current = location.pathname;
      pageView(location.pathname + location.search, document.title);
    }
  }, [location]);
}
