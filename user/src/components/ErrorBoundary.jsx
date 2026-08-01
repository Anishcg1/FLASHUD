import { Component } from 'react';

/**
 * Root Error Boundary — catches any unhandled render-time JavaScript errors
 * in the component tree and shows a recovery UI instead of a blank page.
 *
 * Without this, any runtime TypeError (e.g. calling .startsWith on a non-string)
 * inside a React component will silently unmount the ENTIRE app → blank screen.
 */
class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, info) {
        console.error('[ErrorBoundary] Caught error:', error, info);
    }

    handleReload = () => {
        // Clear state and force a clean reload
        this.setState({ hasError: false, error: null });
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex flex-col items-center justify-center bg-white px-6 text-center">
                    <div className="w-16 h-16 rounded-full bg-brand-orange/10 flex items-center justify-center mb-6">
                        <svg className="w-8 h-8 text-brand-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"
                                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-light uppercase tracking-[0.2em] text-brand-dark mb-3">
                        Something went <span className="font-bold text-brand-orange">wrong</span>
                    </h1>
                    <p className="text-[10px] font-medium text-brand-dark/40 uppercase tracking-[0.3em] mb-10 max-w-sm">
                        An unexpected error occurred. Please reload the page to continue.
                    </p>
                    <button
                        onClick={this.handleReload}
                        className="px-10 py-4 rounded-full bg-brand-orange text-white font-bold uppercase tracking-[0.2em] text-[10px] hover:bg-brand-dark hover:-translate-y-0.5 transition-all"
                    >
                        Reload Page
                    </button>
                    {import.meta.env.DEV && this.state.error && (
                        <pre className="mt-8 p-4 bg-red-50 border border-red-100 rounded-xl text-left text-[10px] text-red-500 max-w-2xl overflow-auto">
                            {this.state.error.toString()}
                        </pre>
                    )}
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
