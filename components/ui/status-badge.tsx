import { formatStatusLabel, normalizeWorkflowStatus, getStatusBadgeClass } from '@/lib/workflow';

type StatusBadgeProps = {
  status: string;
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const normalizedStatus = normalizeWorkflowStatus(status);
  return (
    <span className={`rounded-full px-3 py-1 text-sm font-semibold ${getStatusBadgeClass(normalizedStatus)}`}>
      {formatStatusLabel(normalizedStatus)}
    </span>
  );
}
