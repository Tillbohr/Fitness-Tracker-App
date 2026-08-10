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
`);

function insertExercise(date: string, name: string, sets: number, reps: number, weight: number) {
  exercisesDB.runSync(
    'INSERT INTO exercises (date, name, sets, reps, weight) VALUES (?, ?, ?, ?, ?)',
    [date, name, sets, reps, weight]
  );
  console.log(getExercises(name)); // Log the exercises after insertion for debugging
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

function clearExerciseDatabase() {
  exercisesDB.execSync('DELETE FROM exercises');
  exercisesDB.execSync('VACUUM');
}

function clearMealDatabase() {
  mealsDB.execSync('DELETE FROM meals');
  mealsDB.execSync('VACUUM');
}

export function useDatabase() {
  return { insertExercise, getExercises, clearExerciseDatabase, getExerciseDateInfo, insertMeal, getMeals, getMealDateInfo, clearMealDatabase };
}
