import { Text, View, FlatList, TouchableOpacity, Modal, TextInput, Switch } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useState } from "react";
import { useCalendarLogic } from "../hooks/calendar_logic";
import AddWorkoutForm from "../AddWorkoutForm";
import { styles } from "../../styles/defaultStyle";
import { useDatabase } from '../../database';

export default function Calendar() {
  const {month, year, daysArray, daysOfWeek, monthNames, getPreviousMonth, getNextMonth, getDaysInMonth, initDaysArray} = useCalendarLogic();
  const { insertExercise, getExercises, clearExerciseDatabase, getExerciseDateInfo, insertMeal, getMeals, getMealDateInfo, clearMealDatabase } = useDatabase();
  const [workoutFormInfo, setWorkoutFormInfo] = useState({
    name: '',
    weight: '',
    sets: '',
    reps: ''
  });

  const [mealFormInfo, setMealFormInfo] = useState({
    name: '',
    calories: '',
    protein: '',
    carbs: '',
    fat: ''
  });

  type ModalType = "day" | "addEntry" | "workout" | "meal" | null;
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  
  const [selectedDay, setSelectedDay] = useState<number | string>(new Date().getDate());

  const [dayMacros, setDayMacros] = useState({
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0
  });

  const insets = useSafeAreaInsets();
  const [headerHeight, setHeaderHeight] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);
  const [activeSummary, setActiveSummary] = useState<"workout" | "meal" | null>(null);
  const cellHeight = (containerHeight - headerHeight - insets.top) / 6;
  
  //const db = SQLite.openDatabaseAsync('fitness.db');
  return ( 
    <View style={[styles.container, {paddingTop: insets.top}]} onLayout={(e) => setContainerHeight(e.nativeEvent.layout.height)}>
      {/* Header with month and navigation */}
      <View style={styles.header}>

        <TouchableOpacity onPress={() => getPreviousMonth(month, year)}>
          <Text style={styles.text}>{"<"}</Text>
        </TouchableOpacity>

        <Text style={styles.header} onLayout={(e) => setHeaderHeight(e.nativeEvent.layout.height)}>
          {monthNames[month]} {year}
        </Text>

        <TouchableOpacity onPress={() => getNextMonth(month, year)}>
          <Text style={styles.text}>{">"}</Text>
        </TouchableOpacity>

      </View>
    
      <View style={[styles.daysHeader, ]} onLayout={(e) => setHeaderHeight(e.nativeEvent.layout.height)}>
        {daysOfWeek.map((day) => (
          <Text key={day} style={styles.headerCell}>
            {day}
          </Text>
        ))}
      </View>

      {/* Render Calendar Grid */}
      <FlatList
        style={styles.grid}
        data={daysArray}
        numColumns={7}
        keyExtractor={(_, index) => index.toString()}
        renderItem={({ item }) => item === "" ? (
          <View style={[styles.cell, { height: cellHeight }]} />
        ) : (
          <TouchableOpacity style={[styles.cell, { height: cellHeight }]} onPress={() => {
            setSelectedDay(item);
            const meals = getMealDateInfo(`${year}-${(month + 1).toString().padStart(2, '0')}-${item.toString().padStart(2, '0')}`);
            setDayMacros({
              calories: meals.reduce((sum, meal) => sum + meal.calories, 0),
              protein: meals.reduce((sum, meal) => sum + meal.protein, 0),
              carbs: meals.reduce((sum, meal) => sum + meal.carbs, 0),
              fat: meals.reduce((sum, meal) => sum + meal.fat, 0)
            });
            setActiveModal("day");
          }}>
            <Text style={[styles.text, { height: cellHeight }]}>{item}</Text>
          </TouchableOpacity>
        )}
      />

      {/* Day Summary Modal */}
      {activeModal === "day" && (
      <Modal visible={activeModal === "day"} transparent animationType="none">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalBox}>

            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setActiveModal(null)}>
                <Text style={styles.text}>✕</Text>
              </TouchableOpacity>

              <Text style={[styles.text, { fontSize: 16 }]}>{monthNames[month]} {selectedDay} {year}</Text>
              
              <TouchableOpacity onPress={() => {
                setActiveModal(null);
                setActiveModal("addEntry");
                setSelectedDay(selectedDay);
              }}>
                <Text style={[styles.text, {fontSize: 24}]}>+</Text>
              </TouchableOpacity>
            </View>

            <View style={{flexDirection: "row", marginBottom: 8, marginTop: 8}}>
              <TouchableOpacity style={[styles.toggleButton, { backgroundColor: activeSummary === "meal" ? "#42a6ce" : "transparent" }]} onPress={() => setActiveSummary("meal")}>
                <Text style={styles.text}>Nutrition</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={[styles.toggleButton, { backgroundColor: activeSummary === "workout" ? "#42a6ce" : "transparent" }]} onPress={() => setActiveSummary("workout")}>
                <Text style={styles.text}>Fitness</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalSmallHeader}>
              <Text style={styles.text}>Calories: {dayMacros.calories}</Text>
              <Text style={styles.text}>Protein: {dayMacros.protein}g</Text>
              <Text style={styles.text}>Carbs: {dayMacros.carbs}g</Text>
              <Text style={styles.text}>Fat: {dayMacros.fat}g</Text>
            </View>

            <Text style={styles.text}>Meals:</Text>
            <Text style={styles.text}></Text>
            <FlatList
              data={getMealDateInfo(`${year}-${(month + 1).toString().padStart(2, '0')}-${selectedDay.toString().padStart(2, '0')}`)}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <View>
                  <Text style={styles.text}>{item.name}</Text>
                  <Text style={styles.text}>Calories: {item.calories}</Text>
                  <Text style={styles.text}>Protein: {item.protein}g</Text>
                  <Text style={styles.text}>Carbs: {item.carbs}g</Text>
                  <Text style={styles.text}>Fat: {item.fat}g</Text>
                  <Text style={styles.text}></Text>
                </View>
              )}
            />

            <Text style={styles.text}>Exercises:</Text>
            <FlatList
              data={getExerciseDateInfo(`${year}-${(month + 1).toString().padStart(2, '0')}-${selectedDay.toString().padStart(2, '0')}`)}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <View>
                  <Text style={styles.text}>{item.name} Sets: {item.sets} Reps: {item.reps} Weight: {item.weight}</Text>
                  <Text style={styles.text}></Text>
                </View>
              )}
            />
          </View>
        </View>
      </Modal>
      )}

      {/* Add Entry Modal */}
      {activeModal === "addEntry" && (
      <Modal visible={activeModal === "addEntry"} transparent animationType="none">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalBox}>

              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setActiveModal(null)}>
                  <Text style={styles.text}>✕</Text>
                </TouchableOpacity>
                <Text style={[styles.text, { fontSize: 16 }]}>Add Entry</Text>
                <View></View>{/* buffer to center Add Entry text */}
              </View>

              <TouchableOpacity style={styles.entryButton} onPress={() => {
                setActiveModal(null);
                setActiveModal("workout");
              }}>
                <Text style={[styles.text, { textAlign: "center" }]}>Add New Workout</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.entryButton} onPress={() => {
                setActiveModal(null);
                setActiveModal("meal");
              }}>
                <Text style={[styles.text, { textAlign: "center" }]}>Add New Meal</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.entryButton} onPress={() => {
                setActiveModal(null);
                // setProgressModalVisible(true);
              }}>
                <Text style={[styles.text, { textAlign: "center" }]}>Add Existing Workout</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.entryButton} onPress={() => {
                setActiveModal(null);
                // setProgressModalVisible(true);
              }}>
                <Text style={[styles.text, { textAlign: "center" }]}>Add Existing Meal</Text>
              </TouchableOpacity>

            </View>
          </View>
      </Modal>
      )}


      {/* Add Workout Modal */}
      {activeModal === "workout" && (
      <Modal visible={activeModal === "workout"} transparent animationType="none">
        <View style={styles.modalBackdrop}>
          
          <View style={styles.modalBox}>

            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setActiveModal(null)}>
                <Text style={styles.text}>✕</Text>
              </TouchableOpacity>
              <Text style={[styles.text, { fontSize: 16 }]}>Add Workout</Text>
              <View></View>{/* buffer to center Add Workout text */}
            </View>

            <Text style={[styles.fieldLabel]}>Workout Name</Text>
            <TextInput 
            placeholder="Workout Name" 
            placeholderTextColor="#3a3f45" 
            style={[styles.inputTextBox]} 
            onChangeText={(text) => setWorkoutFormInfo({...workoutFormInfo, name: text})}
            />

            <Text style ={[styles.fieldLabel]}>Weight (lbs)</Text>
            <TextInput 
            placeholder="Weight" 
            placeholderTextColor="#3a3f45" 
            style={[styles.inputTextBox]} 
            onChangeText={(text) => setWorkoutFormInfo({...workoutFormInfo, weight: text})}
            />

            <Text style ={[styles.fieldLabel]}>Sets</Text>
            <TextInput 
            placeholder="Sets" 
            placeholderTextColor="#3a3f45" 
            style={[styles.inputTextBox]} 
            onChangeText={(text) => setWorkoutFormInfo({...workoutFormInfo, sets: text})}
            />

            <Text style ={[styles.fieldLabel]}>Reps</Text>
            <TextInput 
            placeholder="Reps" 
            placeholderTextColor="#3a3f45" 
            style={[styles.inputTextBox]} 
            onChangeText={(text) => setWorkoutFormInfo({...workoutFormInfo, reps: text})}
            />
            <TouchableOpacity style={styles.entryButton} onPress={() => {
              insertExercise(`${year}-${(month + 1).toString().padStart(2, '0')}-${selectedDay.toString().padStart(2, '0')}`, workoutFormInfo.name, parseInt(workoutFormInfo.sets), parseInt(workoutFormInfo.reps), parseFloat(workoutFormInfo.weight));
              setActiveModal(null);
              // update database with new workout entry
            }}>
              <Text style={[styles.text, { textAlign: "center" }]}>Save Workout</Text>
            </TouchableOpacity>
            <AddWorkoutForm />
          </View>
        </View>
      </Modal>
      )}


      {/* Add Meal Modal */}
      {activeModal === "meal" && (
      <Modal visible={activeModal === "meal"} transparent animationType="none">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalBox}>

            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setActiveModal(null)}>
                <Text style={styles.text}>✕</Text>
              </TouchableOpacity>
              <Text style={[styles.text, { fontSize: 16 }]}>Add Meal</Text>
              <View></View>{/* buffer to center Add Meal text */}
            </View>

            <Text style={[styles.fieldLabel]}>Meal Name</Text>
            <TextInput 
            placeholder="Meal Name" 
            placeholderTextColor="#3a3f45" 
            style={[styles.inputTextBox]} 
            onChangeText={(text) => setMealFormInfo({...mealFormInfo, name: text})}
            />

            <Text style ={[styles.fieldLabel]}>Calories</Text>
            <TextInput 
            placeholder="Calories" 
            placeholderTextColor="#3a3f45" 
            style={[styles.inputTextBox]} 
            onChangeText={(text) => setMealFormInfo({...mealFormInfo, calories: text})}
            />

            <Text style ={[styles.fieldLabel]}>Fats</Text>
            <TextInput 
            placeholder="Fats" 
            placeholderTextColor="#3a3f45" 
            style={[styles.inputTextBox]} 
            onChangeText={(text) => setMealFormInfo({...mealFormInfo, fat: text})}
            />

            <Text style ={[styles.fieldLabel]}>Carbs</Text>
            <TextInput 
            placeholder="Carbs" 
            placeholderTextColor="#3a3f45" 
            style={[styles.inputTextBox]} 
            onChangeText={(text) => setMealFormInfo({...mealFormInfo, carbs: text})}
            />

            <Text style ={[styles.fieldLabel]}>Protein</Text>
            <TextInput 
            placeholder="Protein" 
            placeholderTextColor="#3a3f45" 
            style={[styles.inputTextBox]} 
            onChangeText={(text) => setMealFormInfo({...mealFormInfo, protein: text})}
            />

            <TouchableOpacity style={styles.entryButton} onPress={() => {
              insertMeal(`${year}-${(month + 1).toString().padStart(2, '0')}-${selectedDay.toString().padStart(2, '0')}`, mealFormInfo.name, parseInt(mealFormInfo.calories), parseFloat(mealFormInfo.protein), parseFloat(mealFormInfo.carbs), parseFloat(mealFormInfo.fat));
              setActiveModal(null);
            }}>
              <Text style={[styles.text, { textAlign: "center" }]}>Save Meal</Text>
            </TouchableOpacity>

          </View>
        </View>
      </Modal>
      )}

    </View>
  );
}
