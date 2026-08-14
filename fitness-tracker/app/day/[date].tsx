import { Text, View, FlatList, ScrollView, TouchableOpacity, Modal, TextInput } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { PolarChart, Pie } from "victory-native";
import { styles, activityColors } from "../../styles/defaultStyle";
import { useDatabase, ExerciseRow, SavedExercise, SavedMeal } from "../../database";
import { formatDateLong } from "../../utils/dates";
import { toInt, toNumber } from "../../utils/numbers";

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

// Icon colour for glyphs sitting on an activityColors fill. The same value as
// styles.textOnLightFill, repeated because Ionicons takes a colour prop rather
// than a style.
const ON_LIGHT_FILL = "#25292e";

type Kind = "exercise" | "meal";

// The add flow as one value rather than a flag per modal, so a step can never be
// open without the kind it belongs to - the same reason the Saved tab holds its
// pending delete as an object. Steps run:
//   chooseKind -> chooseSource -> newEntry
//                              -> savedPicker -> savedExerciseMetrics
//                                 (exercises only; a saved meal already carries
//                                  its macros, so tapping it logs)
type Step =
  | { name: "chooseKind" }
  | { name: "chooseSource"; kind: Kind }
  | { name: "newEntry"; kind: Kind }
  | { name: "savedPicker"; kind: Kind }
  | { name: "savedExerciseMetrics"; exercise: SavedExercise };

// Sets/reps/weight and minutes/seconds are alternatives: an exercise is measured
// one way or the other, so the form offers both and stores whatever was filled.
const EMPTY_EXERCISE_FORM = { name: '', weight: '', sets: '', reps: '', minutes: '', seconds: '' };
const EMPTY_MEAL_FORM = { name: '', calories: '', protein: '', carbs: '', fat: '' };

function kindColor(kind: Kind) {
  return kind === "exercise" ? activityColors.fitness : activityColors.nutrition;
}

// "1 sets" reads as a typo, so the count carries its own plural.
function plural(value: number, unit: string) {
  return `${value} ${unit}${value === 1 ? '' : 's'}`;
}

// Every measurement is named - "4 sets × 8 reps @ 155 lbs", "32 min 45 sec" -
// rather than leaving the reader to infer what "4 × 8 @ 155" or "32:45" counts.
// Only what the row carries is printed: a bodyweight exercise doesn't claim
// "@ 0 lbs", a round half-hour run doesn't trail "0 sec", and a row holding both
// kinds of measurement - a loaded carry, say - lists both.
function exerciseDetail(row: ExerciseRow) {
  const parts: string[] = [];

  if (row.sets > 0 || row.reps > 0 || row.weight > 0) {
    const effort: string[] = [];
    if (row.sets > 0) effort.push(plural(row.sets, 'set'));
    if (row.reps > 0) effort.push(plural(row.reps, 'rep'));

    const counts = effort.join(' × ');
    // The weight hangs off the counts, but stands alone if there are none.
    if (row.weight > 0) {
      parts.push(counts ? `${counts} @ ${row.weight} lbs` : `${row.weight} lbs`);
    } else {
      parts.push(counts);
    }
  }

  if (row.seconds > 0) {
    const minutes = Math.floor(row.seconds / 60);
    const seconds = row.seconds % 60;
    const duration: string[] = [];
    // "min" and "sec" are abbreviations, so they don't take a plural.
    if (minutes > 0) duration.push(`${minutes} min`);
    if (seconds > 0) duration.push(`${seconds} sec`);
    parts.push(duration.join(' '));
  }

  return parts.join(' · ');
}

// Every step of the add flow is the same box: the three-slot back / title /
// close header the day screen itself uses, over the step's content. The first
// step has nothing to go back to, so its left slot renders empty - but still at
// the same fixed width, which is what keeps the title centred.
function ModalStep({ title, onBack, onClose, box = styles.modalSheet, children }: {
  title: string;
  onBack?: () => void;
  onClose: () => void;
  box?: object;
  children: ReactNode;
}) {
  return (
    <Modal visible transparent animationType="none">
      <View style={styles.modalBackdrop}>
        <View style={box}>

          <View style={styles.modalHeader}>
            <View style={styles.headerButton}>
              {onBack && (
                <TouchableOpacity onPress={onBack} hitSlop={10}>
                  <Ionicons name="chevron-back" size={22} color="#ffffff" />
                </TouchableOpacity>
              )}
            </View>

            <Text style={[styles.text, { fontSize: 16 }]}>{title}</Text>

            <View style={styles.headerButton}>
              <TouchableOpacity onPress={onClose} hitSlop={10}>
                <Ionicons name="close" size={22} color="#ffffff" />
              </TouchableOpacity>
            </View>
          </View>

          {children}

        </View>
      </View>
    </Modal>
  );
}

// A filled chooser button. The fill is the activity colour the rest of the app
// uses for that side - blue for fitness, amber for nutrition - so both fills are
// light enough that the label and icon take the dark foreground.
function ChoiceButton({ label, icon, color, onPress }: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.entryButton, styles.entryButtonRow, { backgroundColor: color }]}
      onPress={onPress}
    >
      <Ionicons name={icon} size={20} color={ON_LIGHT_FILL} />
      <Text style={[styles.entryButtonLabel, styles.textOnLightFill]}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function DaySummary() {
  // The route param is already the YYYY-MM-DD key the database stores, so it is
  // passed straight to the queries with no re-derivation.
  const { date } = useLocalSearchParams<{ date: string }>();
  const insets = useSafeAreaInsets();
  const {
    insertExercise, getExerciseDateInfo, insertMeal, getMealDateInfo,
    getSavedExercises, getSavedMeals,
  } = useDatabase();

  const [step, setStep] = useState<Step | null>(null);
  const [activeSummary, setActiveSummary] = useState<"nutrition" | "fitness">("nutrition");
  const [exerciseFormInfo, setExerciseFormInfo] = useState(EMPTY_EXERCISE_FORM);
  const [mealFormInfo, setMealFormInfo] = useState(EMPTY_MEAL_FORM);

  // Read when a picker opens rather than on mount, so an entry added on the
  // Saved tab since this screen was pushed is in the list.
  const [savedExercises, setSavedExercises] = useState<SavedExercise[]>([]);
  const [savedMeals, setSavedMeals] = useState<SavedMeal[]>([]);

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

  // Steps forward. Each one seeds whatever the step it opens needs, so no step
  // ever renders against the previous step's leftovers.
  function openNewEntry(kind: Kind) {
    if (kind === "exercise") setExerciseFormInfo(EMPTY_EXERCISE_FORM);
    else setMealFormInfo(EMPTY_MEAL_FORM);
    setStep({ name: "newEntry", kind });
  }

  function openSavedPicker(kind: Kind) {
    if (kind === "exercise") setSavedExercises(getSavedExercises());
    else setSavedMeals(getSavedMeals());
    setStep({ name: "savedPicker", kind });
  }

  // A saved exercise is only a name, so it still needs its metrics. The name is
  // carried in the same form state the new-exercise step uses and shown
  // read-only, so the two steps share one set of fields.
  function openSavedExerciseMetrics(exercise: SavedExercise) {
    setExerciseFormInfo({ ...EMPTY_EXERCISE_FORM, name: exercise.name });
    setStep({ name: "savedExerciseMetrics", exercise });
  }

  // One step back, or out of the flow entirely from the first step.
  function stepBack() {
    if (!step) return;
    switch (step.name) {
      case "chooseKind":
        return setStep(null);
      case "chooseSource":
        return setStep({ name: "chooseKind" });
      case "newEntry":
      case "savedPicker":
        return setStep({ name: "chooseSource", kind: step.kind });
      case "savedExerciseMetrics":
        return setStep({ name: "savedPicker", kind: "exercise" });
    }
  }

  function saveExercise() {
    const name = exerciseFormInfo.name.trim();
    if (name === '') return;
    insertExercise(
      date, name,
      toInt(exerciseFormInfo.sets),
      toInt(exerciseFormInfo.reps),
      toNumber(exerciseFormInfo.weight),
      // The two duration fields are one value in the database; either alone is
      // valid, so "90" seconds with no minutes stores as 90 rather than nothing.
      toInt(exerciseFormInfo.minutes) * 60 + toInt(exerciseFormInfo.seconds)
    );
    setStep(null);
    loadDay();
  }

  function saveMeal() {
    const name = mealFormInfo.name.trim();
    if (name === '') return;
    insertMeal(
      date, name,
      toInt(mealFormInfo.calories),
      toNumber(mealFormInfo.protein),
      toNumber(mealFormInfo.carbs),
      toNumber(mealFormInfo.fat)
    );
    setStep(null);
    loadDay();
  }

  // A saved meal carries its own macros, so picking one is the whole entry.
  function logSavedMeal(meal: SavedMeal) {
    insertMeal(date, meal.name, meal.calories, meal.protein, meal.carbs, meal.fat);
    setStep(null);
    loadDay();
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

        <TouchableOpacity style={styles.headerButton} onPress={() => setStep({ name: "chooseKind" })}>
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
              <Text style={styles.listRowDetail}>{exerciseDetail(item)}</Text>
            </View>
          )}
        />
      )}

      {/* Step 1: which side of the app the entry belongs to. */}
      {step?.name === "chooseKind" && (
      <ModalStep title="Add Entry" onClose={() => setStep(null)}>
        <View style={styles.modalBody}>
          <ChoiceButton
            label="Add Exercise"
            icon="barbell"
            color={kindColor("exercise")}
            onPress={() => setStep({ name: "chooseSource", kind: "exercise" })}
          />
          <ChoiceButton
            label="Add Meal"
            icon="restaurant"
            color={kindColor("meal")}
            onPress={() => setStep({ name: "chooseSource", kind: "meal" })}
          />
        </View>
      </ModalStep>
      )}

      {/* Step 2: typed fresh, or pulled from the saved library. Both buttons keep
          the colour of the kind chosen in step 1, so the branch stays visible. */}
      {step?.name === "chooseSource" && (
      <ModalStep
        title={step.kind === "exercise" ? "Add Exercise" : "Add Meal"}
        onBack={stepBack}
        onClose={() => setStep(null)}
      >
        <View style={styles.modalBody}>
          <ChoiceButton
            label={step.kind === "exercise" ? "Add New Exercise" : "Add New Meal"}
            icon="create"
            color={kindColor(step.kind)}
            onPress={() => openNewEntry(step.kind)}
          />
          <ChoiceButton
            label={step.kind === "exercise" ? "Add Saved Exercise" : "Add Saved Meal"}
            icon="bookmark"
            color={kindColor(step.kind)}
            onPress={() => openSavedPicker(step.kind)}
          />
        </View>
      </ModalStep>
      )}

      {/* Step 3: the library. Rows reuse the list styling of the day and Saved
          screens. Tapping a meal logs it outright - it already carries its
          macros - while an exercise goes on to its metrics. */}
      {step?.name === "savedPicker" && (
      <ModalStep
        title={step.kind === "exercise" ? "Choose Saved Exercise" : "Choose Saved Meal"}
        onBack={stepBack}
        onClose={() => setStep(null)}
      >
        <ScrollView>
          {step.kind === "exercise" ? (
            savedExercises.length === 0 ? (
              <Text style={styles.emptyListText}>No saved exercises yet. Add one on the Saved tab.</Text>
            ) : (
              savedExercises.map((exercise) => (
                <TouchableOpacity
                  key={exercise.id}
                  style={styles.listRow}
                  onPress={() => openSavedExerciseMetrics(exercise)}
                >
                  <Text style={styles.listRowTitle}>{exercise.name}</Text>
                </TouchableOpacity>
              ))
            )
          ) : (
            savedMeals.length === 0 ? (
              <Text style={styles.emptyListText}>No saved meals yet. Add one on the Saved tab.</Text>
            ) : (
              savedMeals.map((meal) => (
                <TouchableOpacity
                  key={meal.id}
                  style={styles.listRow}
                  onPress={() => logSavedMeal(meal)}
                >
                  <Text style={styles.listRowTitle}>{meal.name}</Text>
                  <Text style={styles.listRowDetail}>
                    {meal.calories} cal · {meal.protein}g protein · {meal.carbs}g carbs · {meal.fat}g fat
                  </Text>
                </TouchableOpacity>
              ))
            )
          )}
        </ScrollView>
      </ModalStep>
      )}

      {/* Exercise form, shared by the new and saved paths. The fields are the
          same either way; the two differ only in the title and in whether the
          name is typed or fixed by the library entry - the pattern the Saved
          tab's add/edit meal form already uses. */}
      {(step?.name === "savedExerciseMetrics" || (step?.name === "newEntry" && step.kind === "exercise")) && (
      <ModalStep
        title={step.name === "savedExerciseMetrics" ? "Add Saved Exercise" : "Add New Exercise"}
        onBack={stepBack}
        onClose={() => setStep(null)}
        box={styles.modalBox}
      >
        {/* Scrolled so the fields aren't clipped by the box on a short screen,
            and so the save button can be reached with the keyboard up.
            persistTaps lets that button take the first tap rather than spending
            it on dismissing the keyboard. */}
        <ScrollView contentContainerStyle={styles.modalForm} keyboardShouldPersistTaps="handled">

          <Text style={styles.fieldLabel}>Exercise Name</Text>
          {step.name === "savedExerciseMetrics" ? (
            <Text style={styles.readOnlyTextBox}>{step.exercise.name}</Text>
          ) : (
            <TextInput
            placeholder="Exercise Name"
            placeholderTextColor="#3a3f45"
            style={styles.inputTextBox}
            value={exerciseFormInfo.name}
            onChangeText={(text) => setExerciseFormInfo({...exerciseFormInfo, name: text})}
            />
          )}

          <Text style={styles.fieldLabel}>Weight (lbs)</Text>
          <TextInput
          placeholder="Weight"
          placeholderTextColor="#3a3f45"
          keyboardType="numeric"
          style={styles.inputTextBox}
          value={exerciseFormInfo.weight}
          onChangeText={(text) => setExerciseFormInfo({...exerciseFormInfo, weight: text})}
          />

          <Text style={styles.fieldLabel}>Sets</Text>
          <TextInput
          placeholder="Sets"
          placeholderTextColor="#3a3f45"
          keyboardType="numeric"
          style={styles.inputTextBox}
          value={exerciseFormInfo.sets}
          onChangeText={(text) => setExerciseFormInfo({...exerciseFormInfo, sets: text})}
          />

          <Text style={styles.fieldLabel}>Reps</Text>
          <TextInput
          placeholder="Reps"
          placeholderTextColor="#3a3f45"
          keyboardType="numeric"
          style={styles.inputTextBox}
          value={exerciseFormInfo.reps}
          onChangeText={(text) => setExerciseFormInfo({...exerciseFormInfo, reps: text})}
          />

          {/* For exercises measured by duration rather than by sets - a run, a
              plank. Left blank for a lift; the hint says so, since an untouched
              pair of boxes otherwise looks like something was missed. */}
          <Text style={styles.fieldLabel}>Time</Text>
          <View style={styles.fieldRow}>
            <TextInput
            placeholder="Minutes"
            placeholderTextColor="#3a3f45"
            keyboardType="numeric"
            style={[styles.inputTextBox, styles.fieldHalf]}
            value={exerciseFormInfo.minutes}
            onChangeText={(text) => setExerciseFormInfo({...exerciseFormInfo, minutes: text})}
            />
            <TextInput
            placeholder="Seconds"
            placeholderTextColor="#3a3f45"
            keyboardType="numeric"
            style={[styles.inputTextBox, styles.fieldHalf]}
            value={exerciseFormInfo.seconds}
            onChangeText={(text) => setExerciseFormInfo({...exerciseFormInfo, seconds: text})}
            />
          </View>
          <Text style={styles.fieldHint}>Leave blank for exercises measured in sets and reps.</Text>

          <TouchableOpacity style={styles.entryButton} onPress={saveExercise}>
            <Text style={[styles.text, { textAlign: "center" }]}>Add Exercise</Text>
          </TouchableOpacity>

        </ScrollView>
      </ModalStep>
      )}

      {/* Meal form. Field order follows the Saved tab's meal form - calories,
          then protein, carbs, fats - so the two read the same way. */}
      {step?.name === "newEntry" && step.kind === "meal" && (
      <ModalStep
        title="Add New Meal"
        onBack={stepBack}
        onClose={() => setStep(null)}
        box={styles.modalBox}
      >
        <ScrollView contentContainerStyle={styles.modalForm} keyboardShouldPersistTaps="handled">

          <Text style={styles.fieldLabel}>Meal Name</Text>
          <TextInput
          placeholder="Meal Name"
          placeholderTextColor="#3a3f45"
          style={styles.inputTextBox}
          value={mealFormInfo.name}
          onChangeText={(text) => setMealFormInfo({...mealFormInfo, name: text})}
          />

          <Text style={styles.fieldLabel}>Calories</Text>
          <TextInput
          placeholder="Calories"
          placeholderTextColor="#3a3f45"
          keyboardType="numeric"
          style={styles.inputTextBox}
          value={mealFormInfo.calories}
          onChangeText={(text) => setMealFormInfo({...mealFormInfo, calories: text})}
          />

          <Text style={styles.fieldLabel}>Protein</Text>
          <TextInput
          placeholder="Protein"
          placeholderTextColor="#3a3f45"
          keyboardType="numeric"
          style={styles.inputTextBox}
          value={mealFormInfo.protein}
          onChangeText={(text) => setMealFormInfo({...mealFormInfo, protein: text})}
          />

          <Text style={styles.fieldLabel}>Carbs</Text>
          <TextInput
          placeholder="Carbs"
          placeholderTextColor="#3a3f45"
          keyboardType="numeric"
          style={styles.inputTextBox}
          value={mealFormInfo.carbs}
          onChangeText={(text) => setMealFormInfo({...mealFormInfo, carbs: text})}
          />

          <Text style={styles.fieldLabel}>Fats</Text>
          <TextInput
          placeholder="Fats"
          placeholderTextColor="#3a3f45"
          keyboardType="numeric"
          style={styles.inputTextBox}
          value={mealFormInfo.fat}
          onChangeText={(text) => setMealFormInfo({...mealFormInfo, fat: text})}
          />

          <TouchableOpacity style={styles.entryButton} onPress={saveMeal}>
            <Text style={[styles.text, { textAlign: "center" }]}>Add Meal</Text>
          </TouchableOpacity>

        </ScrollView>
      </ModalStep>
      )}

    </View>
  );
}
