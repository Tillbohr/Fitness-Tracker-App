import { Redirect } from 'expo-router';
import { useDatabase, toDateString } from '../database';

// TESTING ONLY - remove before shipping.
// The dated logs are wiped and re-seeded once per app start so the graphs tab has
// something to plot. Module scope, not component state, so React re-renders don't
// re-run the ~450 inserts.
let seeded = false;

const SEED_DAYS = 120;

const MEAL_TEMPLATES = [
  { name: 'Oatmeal & Berries', calories: 380, protein: 12, carbs: 62, fat: 8 },
  { name: 'Eggs & Toast', calories: 450, protein: 24, carbs: 34, fat: 22 },
  { name: 'Chicken & Rice', calories: 620, protein: 52, carbs: 68, fat: 12 },
  { name: 'Turkey Sandwich', calories: 540, protein: 34, carbs: 52, fat: 20 },
  { name: 'Salmon & Potatoes', calories: 700, protein: 46, carbs: 54, fat: 30 },
  { name: 'Beef Stir Fry', calories: 660, protein: 44, carbs: 58, fat: 26 },
  { name: 'Protein Shake', calories: 220, protein: 30, carbs: 14, fat: 4 },
  { name: 'Greek Yogurt', calories: 180, protein: 18, carbs: 20, fat: 3 },
];

// Rotating four-day split. startWeight climbs by `gainPerWeek` over the seeded range
// so the volume lines trend upward instead of looking like noise.
const EXERCISE_TEMPLATES = [
  { name: 'Bench Press', sets: 4, reps: 8, startWeight: 155, gainPerWeek: 2.5 },
  { name: 'Squat', sets: 5, reps: 5, startWeight: 205, gainPerWeek: 5 },
  { name: 'Deadlift', sets: 3, reps: 5, startWeight: 245, gainPerWeek: 5 },
  { name: 'Overhead Press', sets: 4, reps: 8, startWeight: 95, gainPerWeek: 1.5 },
];

// A duration-measured exercise, so the time path has something to plot without
// hand-entry. Seeded on its own cadence rather than folded into the lifting
// split above, since a run isn't one of the four rotating slots. Climbs from
// ~28 to ~45 minutes across the range so the line trends rather than wanders.
const RUN = {
  name: 'Running',
  startSeconds: 28 * 60,
  gainPerWeek: 60,
};

function seedDatabase(db: ReturnType<typeof useDatabase>) {
  db.clearExerciseDatabase();
  db.clearMealDatabase();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let daysAgo = SEED_DAYS - 1; daysAgo >= 0; daysAgo--) {
    const date = new Date(today);
    date.setDate(date.getDate() - daysAgo);
    const dateString = toDateString(date);

    // Skip scattered days entirely so the graph has real gaps to draw across.
    if (daysAgo % 13 === 0 || daysAgo % 19 === 0) continue;

    const mealCount = 2 + (daysAgo % 2);
    for (let i = 0; i < mealCount; i++) {
      const meal = MEAL_TEMPLATES[(daysAgo * 3 + i) % MEAL_TEMPLATES.length];
      db.insertMeal(dateString, meal.name, meal.calories, meal.protein, meal.carbs, meal.fat);
    }

    const weeksElapsed = (SEED_DAYS - 1 - daysAgo) / 7;

    // Runs land on their own cadence, so some days carry a run and a lift and
    // some carry only one - which is what an exercise measured by duration
    // rather than by sets looks like alongside a lifting split.
    if (daysAgo % 3 === 1) {
      const seconds = Math.round(RUN.startSeconds + weeksElapsed * RUN.gainPerWeek);
      db.insertExercise(dateString, RUN.name, 0, 0, 0, seconds);
    }

    // One lift per training day, four days on / one day off.
    if (daysAgo % 5 === 4) continue;
    const exercise = EXERCISE_TEMPLATES[daysAgo % EXERCISE_TEMPLATES.length];
    const weight = Math.round(exercise.startWeight + weeksElapsed * exercise.gainPerWeek);
    db.insertExercise(dateString, exercise.name, exercise.sets, exercise.reps, weight, 0);
  }

  // Saved libraries survive the clears above, so these are INSERT OR IGNORE no-ops
  // after the first run.
  EXERCISE_TEMPLATES.forEach((exercise) => db.insertSavedExercise(exercise.name));
  db.insertSavedExercise(RUN.name);
  MEAL_TEMPLATES.forEach((meal) =>
    db.insertSavedMeal(meal.name, meal.calories, meal.protein, meal.carbs, meal.fat)
  );
}

export default function App() {
  const db = useDatabase();

  if (!seeded) {
    seeded = true;
    seedDatabase(db);
    console.log(`Seeded ${SEED_DAYS} days of test meals and exercises.`);
  }

  // This route draws nothing of its own - it exists to run the seed above and
  // hand straight over to the calendar. The seed stays in the render body rather
  // than an effect: it writes synchronously, so running it here guarantees the
  // rows are in place before the calendar mounts and queries them.
  //
  // Redirect rather than a push, so the landing route is replaced instead of
  // being left on the stack for the back button to return to.
  return <Redirect href="/calendar" />;
}
