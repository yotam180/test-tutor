/**
 * SM-2 based spaced repetition algorithm
 * Adapted from the SuperMemo 2 algorithm
 */

export interface ReviewResult {
  newEase: number;
  newInterval: number;
  newStreak: number;
  nextDueAt: Date;
}

/**
 * Calculate next review parameters based on whether the answer was correct
 * @param correct - Whether the user got the answer correct
 * @param currentEase - Current ease factor (starts at 2.5)
 * @param currentInterval - Current interval in days
 * @param currentStreak - Current streak of correct answers
 */
export function calculateNextReview(
  correct: boolean,
  currentEase: number,
  currentInterval: number,
  currentStreak: number
): ReviewResult {
  let newEase = currentEase;
  let newInterval: number;
  let newStreak: number;

  if (correct) {
    // Increase streak
    newStreak = currentStreak + 1;

    // Slightly increase ease factor (max 3.0)
    newEase = Math.min(3.0, currentEase + 0.1);

    // Calculate new interval
    if (newStreak === 1) {
      // First correct answer - review in 1 day
      newInterval = 1;
    } else if (newStreak === 2) {
      // Second correct - review in 3 days
      newInterval = 3;
    } else {
      // Subsequent correct answers - multiply by ease
      newInterval = Math.round(currentInterval * newEase);
    }

    // Cap maximum interval at 180 days
    newInterval = Math.min(180, newInterval);
  } else {
    // Reset on incorrect answer
    newStreak = 0;

    // Decrease ease factor (min 1.3)
    newEase = Math.max(1.3, currentEase - 0.2);

    // Reset interval - review again soon (in minutes, converted to fraction of day)
    // Review in 10 minutes = ~0.007 days
    newInterval = 0.007;
  }

  // Calculate next due date
  const nextDueAt = new Date();
  nextDueAt.setTime(nextDueAt.getTime() + newInterval * 24 * 60 * 60 * 1000);

  return {
    newEase,
    newInterval,
    newStreak,
    nextDueAt,
  };
}

/**
 * Get questions due for review, prioritizing overdue questions
 * and mixing in some new/unseen questions
 */
export function selectQuestionsForPractice<T extends { nextDueAt: Date | null; timesSeen: number }>(
  questions: T[],
  limit: number = 10
): T[] {
  const now = new Date();

  // Separate into due, new, and future questions
  const dueQuestions = questions.filter(
    (q) => q.nextDueAt && new Date(q.nextDueAt) <= now && q.timesSeen > 0
  );
  const newQuestions = questions.filter((q) => q.timesSeen === 0);
  const futureQuestions = questions.filter(
    (q) => q.nextDueAt && new Date(q.nextDueAt) > now && q.timesSeen > 0
  );

  // Sort due questions by how overdue they are (most overdue first)
  dueQuestions.sort((a, b) => {
    const aDate = new Date(a.nextDueAt!).getTime();
    const bDate = new Date(b.nextDueAt!).getTime();
    return aDate - bDate;
  });

  // Shuffle new and future questions
  shuffleArray(newQuestions);
  shuffleArray(futureQuestions);

  const selected: T[] = [];

  // First, add due questions (up to 70% of limit)
  const dueLimit = Math.floor(limit * 0.7);
  selected.push(...dueQuestions.slice(0, dueLimit));

  // Then add new questions (up to 20% of limit)
  const newLimit = Math.floor(limit * 0.2);
  const remainingSlots = limit - selected.length;
  selected.push(...newQuestions.slice(0, Math.min(newLimit, remainingSlots)));

  // Fill remaining slots with future questions if needed
  if (selected.length < limit) {
    const remaining = limit - selected.length;
    selected.push(...futureQuestions.slice(0, remaining));
  }

  // Final shuffle to mix the order
  shuffleArray(selected);

  return selected;
}

function shuffleArray<T>(array: T[]): void {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}
