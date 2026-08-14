import * as SQLite from 'expo-sqlite';

const exercisesDB = SQLite.openDatabaseSync('exercises.db');
const mealsDB = SQLite.openDatabaseSync('meals.db');

exercisesDB.execSync(`
  PRAGMA journal_mode = WAL;
  CREATE TABLE IF NOT EXISTS exercises (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT,
    name TEXT,
    sets INTEGER,
    reps INTEGER,
    weight REAL
  );
  CREATE TABLE IF NOT EXISTS saved_exercises (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE
  );
`);

mealsDB.execSync(`
  PRAGMA journal_mode = WAL;
  CREATE TABLE IF NOT EXISTS meals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT,
    name TEXT,
    calories INTEGER,
    protein REAL,
    carbs REAL,
    fat REAL
  );
  CREATE TABLE IF NOT EXISTS saved_meals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE,
    calories INTEGER,
    protein REAL,
    carbs REAL,
    fat REAL
  );
`);

function insertExercise(date: string, name: string, sets: number, reps: number, weight: number) {
  exercisesDB.runSync(
    'INSERT INTO exercises (date, name, sets, reps, weight) VALUES (?, ?, ?, ?, ?)',
    [date, name, sets, reps, weight]
  );
}

function getExercises(name: string) {
  return exercisesDB.getAllSync<{
    id: number; date: string; name: string; sets: number; reps: number; weight: number;
  }>('SELECT * FROM exercises WHERE name = ?', [name]);
}

function getExerciseDateInfo(date: string) {
  return exercisesDB.getAllSync<{
    id: number; date: string; name: string; sets: number; reps: number; weight: number;
  }>('SELECT * FROM exercises WHERE date = ?', [date]);
}

function insertMeal(date: string, name: string, calories: number, protein: number, carbs: number, fat: number) {
  mealsDB.runSync(
    'INSERT INTO meals (date, name, calories, protein, carbs, fat) VALUES (?, ?, ?, ?, ?, ?)',
    [date, name, calories, protein, carbs, fat]
  );
}

function getMeals(name: string) {
  return mealsDB.getAllSync<{
    id: number; date: string; name: string; calories: number; protein: number; carbs: number; fat: number;
  }>('SELECT * FROM meals WHERE name = ?', [name]);
}

function getMealDateInfo(date: string) {
  return mealsDB.getAllSync<{
    id: number; date: string; name: string; calories: number; protein: number; carbs: number; fat: number;
  }>('SELECT * FROM meals WHERE date = ?', [date]);
}

// Saved exercises/meals are reusable library entries, separate from the dated log
// entries in the `exercises` and `meals` tables. INSERT OR IGNORE relies on the
// UNIQUE name column so re-adding an existing entry is a no-op instead of a duplicate.
export type SavedExercise = { id: number; name: string };
export type SavedMeal = {
  id: number; name: string; calories: number; protein: number; carbs: number; fat: number;
};

function insertSavedExercise(name: string) {
  exercisesDB.runSync('INSERT OR IGNORE INTO saved_exercises (name) VALUES (?)', [name]);
}

function getSavedExercises() {
  return exercisesDB.getAllSync<SavedExercise>('SELECT * FROM saved_exercises ORDER BY name');
}

function insertSavedMeal(name: string, calories: number, protein: number, carbs: number, fat: number) {
  mealsDB.runSync(
    'INSERT OR IGNORE INTO saved_meals (name, calories, protein, carbs, fat) VALUES (?, ?, ?, ?, ?)',
    [name, calories, protein, carbs, fat]
  );
}

function getSavedMeals() {
  return mealsDB.getAllSync<SavedMeal>('SELECT * FROM saved_meals ORDER BY name');
}

// The name is deliberately not updatable: it's the UNIQUE column, so a rename
// could collide with another row and throw. Editing covers the macros only.
function updateSavedMeal(id: number, calories: number, protein: number, carbs: number, fat: number) {
  mealsDB.runSync(
    'UPDATE saved_meals SET calories = ?, protein = ?, carbs = ?, fat = ? WHERE id = ?',
    [calories, protein, carbs, fat, id]
  );
}

// Removes a library entry only. The dated rows in `meals` / `exercises` are a
// separate table (and a separate database file for exercises), so days that
// already logged this entry keep their data.
function deleteSavedMeal(id: number) {
  mealsDB.runSync('DELETE FROM saved_meals WHERE id = ?', [id]);
}

function deleteSavedExercise(id: number) {
  exercisesDB.runSync('DELETE FROM saved_exercises WHERE id = ?', [id]);
}

// Chart queries. Both roll rows up per date, so days with no entries are simply
// absent from the result rather than coming back as 0 - the graph draws those as
// gaps, since a rest day isn't a zero-volume workout.
export type SeriesPoint = { date: string; value: number };

export type NutritionMetric = 'Calories' | 'Protein' | 'Carbs' | 'Fat';

// A column name can't be a bound parameter, so the label maps to a fixed column
// through this table instead of being interpolated into the SQL.
const NUTRITION_COLUMNS: Record<NutritionMetric, string> = {
  Calories: 'calories',
  Protein: 'protein',
  Carbs: 'carbs',
  Fat: 'fat',
};

export function isNutritionMetric(metric: string): metric is NutritionMetric {
  return metric in NUTRITION_COLUMNS;
}

// Dates are stored as YYYY-MM-DD strings, so BETWEEN compares them lexicographically.
export function toDateString(date: Date) {
  return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
}

// Parsed field-by-field rather than with `new Date(value)`, which reads a bare
// YYYY-MM-DD as UTC and can land on the previous day in western timezones.
export function fromDateString(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

// How many entries each day in a range has, for the calendar's per-day badges.
// Meals and exercises live in separate database files so this can't be one
// query with a JOIN - the calendar runs both and keeps a Map per type, which is
// still two queries per month rather than one per day cell. Days with nothing
// logged are absent from the result rather than coming back as 0.
export type DateCount = { date: string; count: number };

function getMealCountsInRange(startDate: string, endDate: string) {
  return mealsDB.getAllSync<DateCount>(
    `SELECT date, COUNT(*) AS count FROM meals
     WHERE date BETWEEN ? AND ? GROUP BY date`,
    [startDate, endDate]
  );
}

function getExerciseCountsInRange(startDate: string, endDate: string) {
  return exercisesDB.getAllSync<DateCount>(
    `SELECT date, COUNT(*) AS count FROM exercises
     WHERE date BETWEEN ? AND ? GROUP BY date`,
    [startDate, endDate]
  );
}

function getLoggedExerciseNames() {
  return exercisesDB
    .getAllSync<{ name: string }>('SELECT DISTINCT name FROM exercises ORDER BY name')
    .map((row) => row.name);
}

function getNutritionSeries(metric: NutritionMetric, startDate: string, endDate: string) {
  return mealsDB.getAllSync<SeriesPoint>(
    `SELECT date, SUM(${NUTRITION_COLUMNS[metric]}) AS value FROM meals
     WHERE date BETWEEN ? AND ? GROUP BY date ORDER BY date`,
    [startDate, endDate]
  );
}

function getExerciseVolumeSeries(name: string, startDate: string, endDate: string) {
  return exercisesDB.getAllSync<SeriesPoint>(
    `SELECT date, SUM(sets * reps * weight) AS value FROM exercises
     WHERE name = ? AND date BETWEEN ? AND ? GROUP BY date ORDER BY date`,
    [name, startDate, endDate]
  );
}

// The rows behind one point of an exercise volume series. Queried only when a
// point is selected, so the series query itself stays a plain GROUP BY rollup.
export type ExerciseEntry = { sets: number; reps: number; weight: number };

function getExerciseEntriesForDate(name: string, date: string) {
  return exercisesDB.getAllSync<ExerciseEntry>(
    'SELECT sets, reps, weight FROM exercises WHERE name = ? AND date = ? ORDER BY id',
    [name, date]
  );
}

function clearExerciseDatabase() {
  exercisesDB.execSync('DELETE FROM exercises');
  exercisesDB.execSync('VACUUM');
}

function clearMealDatabase() {
  mealsDB.execSync('DELETE FROM meals');
  mealsDB.execSync('VACUUM');
}

export function useDatabase() {
  return { insertExercise, getExercises, clearExerciseDatabase, getExerciseDateInfo, insertMeal, getMeals, getMealDateInfo, clearMealDatabase, insertSavedExercise, getSavedExercises, insertSavedMeal, getSavedMeals, updateSavedMeal, deleteSavedMeal, deleteSavedExercise, getLoggedExerciseNames, getNutritionSeries, getExerciseVolumeSeries, getExerciseEntriesForDate, getMealCountsInRange, getExerciseCountsInRange };
}
