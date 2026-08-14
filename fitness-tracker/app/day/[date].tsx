import { Text, View, FlatList, TouchableOpacity, Modal, TextInput } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCallback, useEffect, useMemo, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { PolarChart, Pie } from "victory-native";
import { styles, activityColors } from "../../styles/defaultStyle";
import { useDatabase } from "../../database";
import { formatDateLong } from "../../utils/dates";

// Slices are sized by calorie contribution, not grams, so the three add up to the
// day's calories - a gram of fat carries more than twice the energy of a gram of
// protein or carbs, so a grams-based pie would understate fat.
const CALORIES_PER_GRAM = { protein: 4, carbs: 4, fat: 9 };

// Categorical slots 1-3 of the reference palette, stepped for a dark surface.
// Validated as a set against #25292e (all pairs): worst CVD dE 9.4, worst
// normal-vision dE 20.9, all >= 3:1 contrast. The app accent #42a6ce is
// deliberately not used here - it sits too close to the aqua to tell apart.
const MACRO_COLORS = {
  protein: "#3987e5",
  carbs: "#d95926",
  fat: "#199e70",
};

// Matches styles.pieWrap, which reserves the same box for the empty-day message.
const PIE_SIZE = 150;

type ModalType = "addEntry" | "workout" | "meal" | null;

const EMPTY_WORKOUT_FORM = { name: '', weight: '', sets: '', reps: '' };
const EMPTY_MEAL_FORM = { name: '', calories: '', protein: '', carbs: '', fat: '' };

export default function DaySummary() {
  // The route param is already the YYYY-MM-DD key the database stores, so it is
  // passed straight to the queries with no re-derivation.
  const { date } = useLocalSearchParams<{ date: string }>();
  const insets = useSafeAreaInsets();
  const {
    insertExercise, getExerciseDateInfo, insertMeal, getMealDateInfo,
  } = useDatabase();

  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [activeSummary, setActiveSummary] = useState<"nutrition" | "fitness">("nutrition");
  const [workoutFormInfo, setWorkoutFormInfo] = useState(EMPTY_WORKOUT_FORM);
  const [mealFormInfo, setMealFormInfo] = useState(EMPTY_MEAL_FORM);

  // A screen doesn't remount the way the old modal did, so the rows are held in
  // state and reloaded after each insert rather than queried inline during render.
  const [meals, setMeals] = useState<ReturnType<typeof getMealDateInfo>>([]);
  const [exercises, setExercises] = useState<ReturnType<typeof getExerciseDateInfo>>([]);

  const loadDay = useCallback(() => {
    setMeals(getMealDateInfo(date));
    setExercises(getExerciseDateInfo(date));
  }, [date, getMealDateInfo, getExerciseDateInfo]);

  useEffect(() => {
    loadDay();
  }, [loadDay]);

  const macros = useMemo(
    () => meals.reduce(
      (totals, meal) => ({
        calories: totals.calories + meal.calories,
        protein: totals.protein + meal.protein,
        carbs: totals.carbs + meal.carbs,
        fat: totals.fat + meal.fat,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    ),
    [meals]
  );

  // A macro logged as 0 would be a zero-sweep slice, so it is dropped from the
  // pie but still listed with its value beside the chart.
  const slices = useMemo(
    () => [
      { label: 'Protein', grams: macros.protein, value: macros.protein * CALORIES_PER_GRAM.protein, color: MACRO_COLORS.protein },
      { label: 'Carbs', grams: macros.carbs, value: macros.carbs * CALORIES_PER_GRAM.carbs, color: MACRO_COLORS.carbs },
      { label: 'Fat', grams: macros.fat, value: macros.fat * CALORIES_PER_GRAM.fat, color: MACRO_COLORS.fat },
    ],
    [macros]
  );
  const macroCalories = slices.reduce((sum, slice) => sum + slice.value, 0);
  const pieData = slices.filter((slice) => slice.value > 0);

  function goBack() {
    // Reached directly by deep link there is nothing to pop back to, so fall
    // back to the calendar rather than leaving the back button inert.
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/calendar');
    }
  }

  const macroSummary = (
    <View>
      <View style={styles.macroRow}>
        <View style={styles.macroList}>
          <Text style={styles.heroNumber}>{Math.round(macros.calories)}</Text>
          <Text style={styles.heroLabel}>Calories</Text>

          {slices.map((slice) => (
            <View key={slice.label} style={styles.macroItem}>
              <View style={[styles.legendDot, { backgroundColor: slice.color }]} />
              <Text style={styles.macroName}>{slice.label}</Text>
              <Text style={styles.macroValue}>{Math.round(slice.grams)}g</Text>
              <Text style={styles.macroPercent}>
                {macroCalories > 0 ? `${Math.round((slice.value / macroCalories) * 100)}%` : '-'}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.pieWrap}>
          {macroCalories > 0 ? (
            // explicitSize skips the onLayout measure pass, so the pie draws on
            // the first frame instead of after a blank one.
            <PolarChart
              data={pieData}
              labelKey="label"
              valueKey="value"
              colorKey="color"
              explicitSize={{ width: PIE_SIZE, height: PIE_SIZE }}
            >
              <Pie.Chart>
                {() => (
                  <>
                    <Pie.Slice />
                    {/* Surface-coloured inset separates adjacent slices without a stroke colour of its own. */}
                    <Pie.SliceAngularInset
                      angularInset={{ angularStrokeWidth: 2, angularStrokeColor: "#25292e" }}
                    />
                  </>
                )}
              </Pie.Chart>
            </PolarChart>
          ) : (
            <Text style={styles.listRowDetail}>No macros logged</Text>
          )}
        </View>
      </View>

      <Text style={styles.sectionLabel}>Meals</Text>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header: back, date, add */}
      <View style={styles.pageHeader}>
        <TouchableOpacity style={styles.headerButton} onPress={goBack}>
          <Ionicons name="chevron-back" size={26} color="#ffffff" />
        </TouchableOpacity>

        <Text style={styles.pageTitle}>{formatDateLong(date)}</Text>

        <TouchableOpacity style={styles.headerButton} onPress={() => setActiveModal("addEntry")}>
          <Ionicons name="add" size={26} color="#ffffff" />
        </TouchableOpacity>
      </View>

      {/* Active fill colours match the calendar's count badges - amber for
          nutrition, accent blue for fitness - so the two screens agree on which
          side of the app a colour stands for. Amber is too light to carry white
          text, so the active label switches to the dark foreground. */}
      <View style={styles.toggleRow}>
        <TouchableOpacity
          style={[styles.toggleButton, activeSummary === "nutrition" && { backgroundColor: activityColors.nutrition }]}
          onPress={() => setActiveSummary("nutrition")}
        >
          <Text style={[styles.text, activeSummary === "nutrition" && styles.textOnLightFill]}>Nutrition</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.toggleButton, activeSummary === "fitness" && { backgroundColor: activityColors.fitness }]}
          onPress={() => setActiveSummary("fitness")}
        >
          <Text style={styles.text}>Fitness</Text>
        </TouchableOpacity>
      </View>

      {activeSummary === "nutrition" ? (
        <FlatList
          data={meals}
          keyExtractor={(item) => item.id.toString()}
          ListHeaderComponent={macroSummary}
          ListEmptyComponent={<Text style={styles.emptyListText}>No meals logged for this day</Text>}
          renderItem={({ item }) => (
            <View style={styles.listRow}>
              <Text style={styles.listRowTitle}>{item.name}</Text>
              <Text style={styles.listRowDetail}>
                {item.calories} cal · {item.protein}g protein · {item.carbs}g carbs · {item.fat}g fat
              </Text>
            </View>
          )}
        />
      ) : (
        <FlatList
          data={exercises}
          keyExtractor={(item) => item.id.toString()}
          ListHeaderComponent={<Text style={styles.sectionLabel}>Exercises</Text>}
          ListEmptyComponent={<Text style={styles.emptyListText}>No exercises logged for this day</Text>}
          renderItem={({ item }) => (
            <View style={styles.listRow}>
              <Text style={styles.listRowTitle}>{item.name}</Text>
              <Text style={styles.listRowDetail}>
                {item.sets} × {item.reps} @ {item.weight} lbs
              </Text>
            </View>
          )}
        />
      )}

      {/* Add Entry Modal */}
      {activeModal === "addEntry" && (
      <Modal visible transparent animationType="none">
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
              setWorkoutFormInfo(EMPTY_WORKOUT_FORM);
              setActiveModal("workout");
            }}>
              <Text style={[styles.text, { textAlign: "center" }]}>Add New Workout</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.entryButton} onPress={() => {
              setMealFormInfo(EMPTY_MEAL_FORM);
              setActiveModal("meal");
            }}>
              <Text style={[styles.text, { textAlign: "center" }]}>Add New Meal</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.entryButton} onPress={() => {
              setActiveModal(null);
            }}>
              <Text style={[styles.text, { textAlign: "center" }]}>Add Existing Workout</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.entryButton} onPress={() => {
              setActiveModal(null);
            }}>
              <Text style={[styles.text, { textAlign: "center" }]}>Add Existing Meal</Text>
            </TouchableOpacity>

          </View>
        </View>
      </Modal>
      )}

      {/* Add Workout Modal */}
      {activeModal === "workout" && (
      <Modal visible transparent animationType="none">
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
              insertExercise(date, workoutFormInfo.name, parseInt(workoutFormInfo.sets), parseInt(workoutFormInfo.reps), parseFloat(workoutFormInfo.weight));
              setActiveModal(null);
              loadDay();
            }}>
              <Text style={[styles.text, { textAlign: "center" }]}>Save Workout</Text>
            </TouchableOpacity>

          </View>
        </View>
      </Modal>
      )}

      {/* Add Meal Modal */}
      {activeModal === "meal" && (
      <Modal visible transparent animationType="none">
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
              insertMeal(date, mealFormInfo.name, parseInt(mealFormInfo.calories), parseFloat(mealFormInfo.protein), parseFloat(mealFormInfo.carbs), parseFloat(mealFormInfo.fat));
              setActiveModal(null);
              loadDay();
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
