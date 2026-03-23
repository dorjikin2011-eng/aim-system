import type { WorkflowStatus } from './aimsTypes';

interface Props {
  status: WorkflowStatus;
}

export default function WorkflowBar({ status }: Props) {
  return (
    <div className="text-sm font-medium mb-2">
      Status:{' '}
      {status === 'DRAFT'
        ? '🟡 Draft'
        : status === 'SUBMITTED_TO_AGENCY'
        ? '🔵 With Agency'
        : '🟢 Finalized'}
    </div>
  );
}

