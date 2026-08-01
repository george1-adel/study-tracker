import { lazy, Suspense } from 'react';

const LazyAnalyticsPage = lazy(() => import('../analytics/AnalyticsPage'));

export function AnalyticsPage() {
  return (
    <Suspense fallback={<div className="analytics-loading" />}>
      <LazyAnalyticsPage />
    </Suspense>
  );
}
