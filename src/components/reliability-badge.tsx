// "Shows up 9 of 9 trips" (green), "Shows up 7 of 9 trips" (orange/red), or "New".

import { Badge } from '@/components/ui';
import { Reliability, reliabilitySummary } from '@/lib/reliability';

export function ReliabilityBadge({ stats }: { stats: Reliability | undefined }) {
  const { label, tone } = reliabilitySummary(stats);
  return <Badge label={label} tone={tone} />;
}
