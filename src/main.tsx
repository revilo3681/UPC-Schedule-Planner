import { Component, ReactNode, StrictMode, ErrorInfo } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('App Error Caught:', error, errorInfo);
  }

  handleReset = () => {
    localStorage.clear();
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center font-sans">
          <div className="max-w-md w-full bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl space-y-4">
            <div className="w-12 h-12 rounded-xl bg-red-600/20 text-red-500 flex items-center justify-center mx-auto text-2xl font-bold">
              !
            </div>
            <h2 className="text-lg font-bold">Ha ocurrido un error al cargar la aplicación</h2>
            <p className="text-xs text-slate-400">
              {this.state.error?.message || 'Error inesperado de renderizado.'}
            </p>
            <div className="pt-2 flex flex-col gap-2">
              <button
                onClick={() => window.location.reload()}
                className="w-full py-2.5 px-4 bg-[#e31e24] hover:bg-red-700 text-white text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Recargar Página
              </button>
              <button
                onClick={this.handleReset}
                className="w-full py-2 px-4 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-semibold rounded-xl transition cursor-pointer"
              >
                Restablecer Datos de Horario
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);


