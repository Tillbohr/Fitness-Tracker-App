import { Text, View, StyleSheet, TextInput } from 'react-native';
import { Link } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { styles } from '../styles/defaultStyle';
import { useDatabase } from '../database';

export default function App() {
  const { insertExercise, getExercises, clearExerciseDatabase, clearMealDatabase } = useDatabase(); // Initialize the database when the app starts
  clearExerciseDatabase(); // Clear the exercise database for testing purposes
  clearMealDatabase(); // Clear the meal database for testing purposes
  //insertExercise(Date.now(), 'Bench Press', 3, 10, 135); // Example of inserting an exercise
  
  console.log('Database initialized and example exercise inserted.');
  console.log(getExercises('Bench Press')); // Example of retrieving exercises

  return (
    <View style={[styles.container, {alignItems: 'center', justifyContent: 'center'}]}>
        <Link href="/calendar">
          <Text style={styles.text}>Go to Calendar</Text>
        </Link>
      </View>
  );
}