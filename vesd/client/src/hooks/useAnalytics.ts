import { usePageTracking } from './usePageTracking';
import { installInteractionTracking, installPerformanceTracking } from '../services/analytics';

export { event, setUserProperties, isActive } from '../services/analytics';

export function useAnalytics() {
  installPerformanceTracking();
  installInteractionTracking();
  usePageTracking();
}
