import React, { createContext, useContext, useState, useCallback } from 'react';
import { X, CheckCircle, AlertTriangle, AlertCircle } from 'lucide-react';

export type ToastType = 'success' | 'warning' | 'error' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
}

interface ToastContextType {
  toast: (title: string, description?: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const toast = useCallback((title: string, description?: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, title, description, type }]);

    // Remover toast automaticamente após 4 segundos
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      
      {/* Toast Container */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-md w-full pointer-events-none">
        {toasts.map((t) => {
          const icons = {
            success: <CheckCircle className="h-5 w-5 text-emerald-500 shrink-0" />,
            warning: <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />,
            error: <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />,
            info: <CheckCircle className="h-5 w-5 text-blue-500 shrink-0" />
          };

          const bgClasses = {
            success: 'bg-card border-emerald-500/20 text-card-foreground dark:border-emerald-500/30',
            warning: 'bg-card border-amber-500/20 text-card-foreground dark:border-amber-500/30',
            error: 'bg-card border-red-500/20 text-card-foreground dark:border-red-500/30',
            info: 'bg-card border-blue-500/20 text-card-foreground dark:border-blue-500/30'
          };

          return (
            <div
              key={t.id}
              className={`flex items-start gap-3 p-4 rounded-lg border shadow-xl backdrop-blur-md pointer-events-auto animate-fade-in ${bgClasses[t.type]} transition-all duration-300`}
            >
              {icons[t.type]}
              <div className="flex-1 space-y-0.5">
                <h4 className="text-sm font-semibold">{t.title}</h4>
                {t.description && (
                  <p className="text-xs text-muted-foreground">{t.description}</p>
                )}
              </div>
              <button
                onClick={() => removeToast(t.id)}
                className="text-muted-foreground/60 hover:text-muted-foreground transition-colors shrink-0"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast deve ser usado dentro de um ToastProvider');
  }
  return context;
};
