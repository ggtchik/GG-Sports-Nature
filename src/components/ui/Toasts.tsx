import { useApp } from '../../state/AppContext';
import { Icon } from './Icon';

export function Toasts() {
  const { toasts, dismissToast } = useApp();
  if (toasts.length === 0) return null;
  return (
    <div className="toasts" role="status" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast--${toast.tone}`}>
          <span>{toast.message}</span>
          <button type="button" className="icon-btn" aria-label="Fermer" onClick={() => dismissToast(toast.id)}>
            <Icon name="close" size={15} />
          </button>
        </div>
      ))}
    </div>
  );
}
