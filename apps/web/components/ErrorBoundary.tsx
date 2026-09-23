"use client";

import { AlertTriangle, RefreshCcw } from "lucide-react";
import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("SOTA ERROR CAPTURED:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] border-2 border-dashed border-red-900 bg-red-950/20 rounded-lg p-8 text-center">
          <AlertTriangle className="text-red-500 mb-4" size={48} />
          <h2 className="text-xl font-bold text-white mb-2">Ontological Substrate Collapse</h2>
          <p className="text-red-400 text-sm mb-6 max-w-md">
            The web client encountered a non-recoverable render failure. [SOTA-E04-WEB]
            <br />
            <span className="font-mono text-xs opacity-50">{this.state.error?.message}</span>
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 px-4 py-2 bg-red-700 hover:bg-red-600 text-white rounded transition"
          >
            <RefreshCcw size={16} />
            Re-materialize View
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
