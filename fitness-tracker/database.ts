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

// Schema changes to the exercises database, tracked with PRAGMA user_version.
// The CREATE TABLE above is deliberately left at its original shape: declaring
// `seconds` there as well would make the ALTER below throw "duplicate column" on
// a fresh install, so a new database and an existing one reach v1 the same way.
const EXERCISES_SCHEMA_VERSION = 1;

function migrateExercisesDB() {
  const row = exercisesDB.getFirstSync<{ user_version: number }>('PRAGMA user_version');
  const version = row?.user_version ?? 0;
  if (version >= EXERCISES_SCHEMA_VERSION) return;

  if (version < 1) {
    // Duration, for exercises that aren't measured in sets and reps - running and
    // the like. Whole seconds, so the minutes and seconds fields round-trip
    // exactly; 0 means the row simply isn't a timed one.
    exercisesDB.execSync('ALTER TABLE exercises ADD COLUMN seconds INTEGER NOT NULL DEFAULT 0');
  }

  // A pragma can't take a bound parameter, so the version is interpolated - it's
  // a module constant, never anything from outside.
  exercisesDB.execSync(`PRAGMA user_version = ${EXERCISES_SCHEMA_VERSION}`);
}

migrateExercisesDB();

// A row of the dated exercise log. `seconds` and the sets/reps/weight trio are
// alternatives rather than companions: a row usually carries one or the other,
// and which one it carries is what decides how it's shown and graphed.
export type ExerciseRow = {
  id: number; date: string; name: string;
  sets: number; reps: number; weight: number; seconds: number;
};

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

function insertExercise(
  date: string, name: string, sets: number, reps: number, weight: number, seconds: number
) {
  exercisesDB.runSync(
    'INSERT INTO exercises (date, name, sets, reps, weight, seconds) VALUES (?, ?, ?, ?, ?, ?)',
    [date, name, sets, reps, weight, seconds]
  );
}

function getExercises(name: string) {
  return exercisesDB.getAllSync<ExerciseRow>('SELECT * FROM exercises WHERE name = ?', [name]);
}

function getExerciseDateInfo(date: string) {
  return exercisesDB.getAllSync<ExerciseRow>('SELECT * FROM exercises WHERE date = ?', [date]);
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
// gaps, since a rest day isn't a zero-volume exercise.
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

// What each logged exercise can be plotted as. An exercise measured in sets and
// reps has volume, one measured in duration has time, and a few carry both - the
// graph offers those twice rather than guessing which one was meant.
export type ExerciseMetricInfo = { name: string; hasVolume: number; hasTime: number };

function getExerciseMetricInfo() {
  return exercisesDB.getAllSync<ExerciseMetricInfo>(
    `SELECT name,
       MAX(CASE WHEN sets > 0 OR reps > 0 OR weight > 0 THEN 1 ELSE 0 END) AS hasVolume,
       MAX(CASE WHEN seconds > 0 THEN 1 ELSE 0 END) AS hasTime
     FROM exercises GROUP BY name ORDER BY name`
  );
}

function getNutritionSeries(metric: NutritionMetric, startDate: string, endDate: string) {
  return mealsDB.getAllSync<SeriesPoint>(
    `SELECT date, SUM(${NUTRITION_COLUMNS[metric]}) AS value FROM meals
     WHERE date BETWEEN ? AND ? GROUP BY date ORDER BY date`,
    [startDate, endDate]
  );
}

// The weighted rows are filtered in rather than summed over everything: without
// it a day holding only a timed row of this exercise would sum to 0 and draw as
// a real zero, when it should be one of the gaps this query exists to leave.
function getExerciseVolumeSeries(name: string, startDate: string, endDate: string) {
  return exercisesDB.getAllSync<SeriesPoint>(
    `SELECT date, SUM(sets * reps * weight) AS value FROM exercises
     WHERE name = ? AND (sets > 0 OR reps > 0 OR weight > 0)
       AND date BETWEEN ? AND ? GROUP BY date ORDER BY date`,
    [name, startDate, endDate]
  );
}

// Minutes rather than raw seconds, so the axis lands on numbers a person reads -
// niceScale would otherwise be picking ticks out of five figures.
function getExerciseTimeSeries(name: string, startDate: string, endDate: string) {
  return exercisesDB.getAllSync<SeriesPoint>(
    `SELECT date, SUM(seconds) / 60.0 AS value FROM exercises
     WHERE name = ? AND seconds > 0
       AND date BETWEEN ? AND ? GROUP BY date ORDER BY date`,
    [name, startDate, endDate]
  );
}

// The rows behind one point of an exercise volume series. Queried only when a
// point is selected, so the series query itself stays a plain GROUP BY rollup.
export type ExerciseEntry = { sets: number; reps: number; weight: number; seconds: number };

// Filtered to the kind being plotted, so the breakdown lists the rows that
// actually add up to the point above it. The condition is picked from a closed
// union rather than built from anything passed in.
function getExerciseEntriesForDate(name: string, date: string, kind: 'volume' | 'time') {
  const condition = kind === 'time' ? 'seconds > 0' : '(sets > 0 OR reps > 0 OR weight > 0)';
  return exercisesDB.getAllSync<ExerciseEntry>(
    `SELECT sets, reps, weight, seconds FROM exercises
     WHERE name = ? AND date = ? AND ${condition} ORDER BY id`,
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
  return { insertExercise, getExercises, clearExerciseDatabase, getExerciseDateInfo, insertMeal, getMeals, getMealDateInfo, clearMealDatabase, insertSavedExercise, getSavedExercises, insertSavedMeal, getSavedMeals, updateSavedMeal, deleteSavedMeal, deleteSavedExercise, getExerciseMetricInfo, getNutritionSeries, getExerciseVolumeSeries, getExerciseTimeSeries, getExerciseEntriesForDate, getMealCountsInRange, getExerciseCountsInRange };
}
