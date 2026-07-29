'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(_: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="w-full h-full flex flex-col items-center justify-center bg-gray-900 text-white rounded-xl border border-gray-800 p-4 text-center">
          <p className="text-sm font-medium text-red-400 mb-2">3D rendering disabled</p>
          <p className="text-xs text-gray-400">WebGL context could not be created.</p>
        </div>
      );
    }

    return this.props.children;
  }
}
