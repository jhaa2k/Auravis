import { useStore } from '../app/hooks.js';
import { toastStore } from '../app/services.js';
import Icon from './Icon.jsx';

export default function Toasts() {
  const list = useStore(toastStore);
  return (
    <div className="toasts" role="status" aria-live="polite">
      {list.map((t) => (<div key={t.id} className={`toast ${t.level}`}><Icon name={t.level === 'error' ? 'error' : t.level === 'warning' ? 'warn' : 'info'} size={16} />{t.message}</div>))}
    </div>
  );
}
