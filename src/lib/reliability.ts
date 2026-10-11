// Reliability: how often someone shows up. Totals come from the database
// (see reliability-api.ts); this file turns them into a label.

export type Reliability = {
  user_id: string;
  completed: number; // trips they drove (with riders) or rode
  late_cancels: number; // cancelled within 24 hours
  no_shows: number; // reported as not showing up
};

export type ReliabilityTone = 'good' | 'waiting' | 'bad' | 'neutral';

// "New", "Shows up 9 of 9 trips", "Shows up 7 of 9 trips"...
export function reliabilitySummary(stats: Reliability | undefined): { label: string; tone: ReliabilityTone } {
  if (!stats) return { label: 'New', tone: 'neutral' };
  const total = stats.completed + stats.late_cancels + stats.no_shows;
  if (total === 0) return { label: 'New', tone: 'neutral' };
  const label = `Shows up ${stats.completed} of ${total} ${total === 1 ? 'trip' : 'trips'}`;
  const ratio = stats.completed / total;
  return { label, tone: ratio === 1 ? 'good' : ratio >= 0.8 ? 'waiting' : 'bad' };
}
