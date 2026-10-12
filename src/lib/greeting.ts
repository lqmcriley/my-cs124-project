// The greeting on Find a ride: a random one that fits the time of day,
// e.g. "Morning, Riley", "Hey, Riley" or "Up late, Riley?".

const ANY_TIME = ['Hi', 'Hey', 'Hello'];

function forHour(hour: number): { words: string[]; question?: boolean } {
  if (hour >= 5 && hour < 12) return { words: [...ANY_TIME, 'Morning', 'Good morning'] };
  if (hour >= 12 && hour < 17) return { words: [...ANY_TIME, 'Good afternoon'] };
  if (hour >= 17 && hour < 22) return { words: [...ANY_TIME, 'Evening', 'Good evening'] };
  return { words: ['Up late'], question: true }; // 10 PM to 5 AM
}

// `pick` is a number from 0 up to (not including) 1, like Math.random().
export function greeting(name: string, now: Date = new Date(), pick: number = Math.random()): string {
  const { words, question } = forHour(now.getHours());
  const word = words[Math.min(words.length - 1, Math.floor(pick * words.length))];
  // "Hey, Riley" has a comma; "Hey there" (no name) doesn't.
  const who = name.trim() ? `, ${name.trim()}` : ' there';
  return `${word}${who}${question ? '?' : ''}`;
}
