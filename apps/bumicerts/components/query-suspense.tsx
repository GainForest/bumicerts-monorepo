"use client";

import { QueryErrorResetBoundary } from '@tanstack/react-query';
import { ErrorBoundary } from 'react-error-boundary';
import React, { Suspense } from 'react'

const QuerySuspense = ({ children, loadingFallback, errorFallback }: { children: React.ReactNode, loadingFallback: React.ReactNode, errorFallback?: (error: unknown) => React.ReactNode }) => {
    return <QueryErrorResetBoundary>{({ reset }) => (
        <ErrorBoundary onError={(error) => {
            console.error("Error in QuerySuspense:", error);
            reset();
        }} fallbackRender={({ error }) => (
            errorFallback ? <>{errorFallback(error)}</> : null
        )}>
            <Suspense fallback={loadingFallback}>
                {children}
            </Suspense>
        </ErrorBoundary>
    )}
    </QueryErrorResetBoundary>
};

export default QuerySuspense;