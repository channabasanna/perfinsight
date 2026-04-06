import {
  ExclamationCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import { Insight } from '../types';
import clsx from 'clsx';

interface InsightCardProps {
  insight: Insight;
}

const severityConfig = {
  critical: {
    icon: ExclamationCircleIcon,
    bg: 'bg-red-50',
    border: 'border-red-200',
    iconColor: 'text-red-500',
    titleColor: 'text-red-800',
    textColor: 'text-red-700',
    badge: 'bg-red-100 text-red-800',
  },
  warning: {
    icon: ExclamationTriangleIcon,
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    iconColor: 'text-amber-500',
    titleColor: 'text-amber-800',
    textColor: 'text-amber-700',
    badge: 'bg-amber-100 text-amber-800',
  },
  info: {
    icon: InformationCircleIcon,
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    iconColor: 'text-blue-500',
    titleColor: 'text-blue-800',
    textColor: 'text-blue-700',
    badge: 'bg-blue-100 text-blue-800',
  },
  success: {
    icon: CheckCircleIcon,
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    iconColor: 'text-emerald-500',
    titleColor: 'text-emerald-800',
    textColor: 'text-emerald-700',
    badge: 'bg-emerald-100 text-emerald-800',
  },
};

export default function InsightCard({ insight }: InsightCardProps) {
  const config = severityConfig[insight.severity];
  const Icon = config.icon;

  return (
    <div className={clsx('flex gap-3 p-4 rounded-lg border', config.bg, config.border)}>
      <Icon className={clsx('w-5 h-5 flex-shrink-0 mt-0.5', config.iconColor)} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className={clsx('text-sm font-semibold', config.titleColor)}>{insight.title}</span>
          <span className={clsx('text-xs px-2 py-0.5 rounded-full font-medium uppercase tracking-wide', config.badge)}>
            {insight.severity}
          </span>
        </div>
        <p className={clsx('text-sm', config.textColor)}>{insight.message}</p>
      </div>
    </div>
  );
}
