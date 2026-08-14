import { Text, View } from 'react-native';
import { Link } from 'expo-router';
import { styles } from '../styles/defaultStyle';
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

    // One lift per training day, four days on / one day off.
    if (daysAgo % 5 === 4) continue;
    const exercise = EXERCISE_TEMPLATES[daysAgo % EXERCISE_TEMPLATES.length];
    const weeksElapsed = (SEED_DAYS - 1 - daysAgo) / 7;
    const weight = Math.round(exercise.startWeight + weeksElapsed * exercise.gainPerWeek);
    db.insertExercise(dateString, exercise.name, exercise.sets, exercise.reps, weight);
  }

  // Saved libraries survive the clears above, so these are INSERT OR IGNORE no-ops
  // after the first run.
  EXERCISE_TEMPLATES.forEach((exercise) => db.insertSavedExercise(exercise.name));
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

  return (
    <View style={[styles.container, {alignItems: 'center', justifyContent: 'center'}]}>
        <Link href="/calendar">
          <Text style={styles.text}>Go to Calendar</Text>
        </Link>
      </View>
  );
}
