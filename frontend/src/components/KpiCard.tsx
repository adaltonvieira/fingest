import { ReactNode } from 'react';
import clsx from 'clsx';

interface KpiCardProps {
  label: string;
  value: string;
  icon: ReactNode;
  tone?: 'default' | 'positive' | 'negative';
}

export default function KpiCard({ label, value, icon, tone = 'default' }: KpiCardProps) {
  return (
    <div className="card flex items-center justify-between">
      <div>
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
        <p
          className={clsx(
            'text-2xl font-bold mt-1',
            tone === 'positive' && 'text-emerald-600',
            tone === 'negative' && 'text-red-600',
            tone === 'default' && 'text-slate-900 dark:text-white',
          )}
        >
          {value}
        </p>
      </div>
      <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-500/10 text-brand-600 flex items-center justify-center">
        {icon}
      </div>
    </div>
  );
}
