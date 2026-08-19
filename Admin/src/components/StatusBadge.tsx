import { STATUS_COLOR, STATUS_LABEL } from '../lib/utils';

export default function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        STATUS_COLOR[status] || 'bg-slate-100 text-slate-700'
      }`}
    >
      {STATUS_LABEL[status] || status}
    </span>
  );
}