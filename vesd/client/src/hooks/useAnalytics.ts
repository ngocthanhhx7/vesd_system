import { usePageTracking } from './usePageTracking';

export { event, setUserProperties, isActive } from '../services/analytics';

export function useAnalytics() {
  usePageTracking();
}
