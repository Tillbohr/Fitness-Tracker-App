import { Text, View, FlatList, TouchableOpacity, Modal, TextInput } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCallback, useEffect, useState } from "react";
import { styles, activityColors } from "../../styles/defaultStyle";
import { useDatabase, SavedExercise, SavedMeal } from "../../database";

// Text inputs hand back strings; empty/garbage input should store 0 rather than NaN.
function toNumber(value: string) {
  const parsed = parseFloat(value);
  return isNaN(parsed) ? 0 : parsed;
}

export default function Saved() {
  const { insertSavedExercise, getSavedExercises, insertSavedMeal, getSavedMeals } = useDatabase();

  const [activeLibrary, setActiveLibrary] = useState<"meals" | "exercises">("meals");
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [savedMeals, setSavedMeals] = useState<SavedMeal[]>([]);
  const [savedExercises, setSavedExercises] = useState<SavedExercise[]>([]);

  const [mealFormInfo, setMealFormInfo] = useState({
    name: '',
    calories: '',
    protein: '',
    carbs: '',
    fat: ''
  });

  const [exerciseFormInfo, setExerciseFormInfo] = useState({
    name: ''
  });

  const insets = useSafeAreaInsets();

  // The database functions are plain synchronous calls, not reactive, so the lists
  // are reloaded on mount and again after every insert.
  const refreshLibraries = useCallback(() => {
    setSavedMeals(getSavedMeals());
    setSavedExercises(getSavedExercises());
  }, [getSavedMeals, getSavedExercises]);

  useEffect(() => {
    refreshLibraries();
  }, [refreshLibraries]);

  function openAddModal() {
    setMealFormInfo({ name: '', calories: '', protein: '', carbs: '', fat: '' });
    setExerciseFormInfo({ name: '' });
    setAddModalVisible(true);
  }

  function saveMeal() {
    if (mealFormInfo.name.trim() === '') return;
    insertSavedMeal(
      mealFormInfo.name.trim(),
      toNumber(mealFormInfo.calories),
      toNumber(mealFormInfo.protein),
      toNumber(mealFormInfo.carbs),
      toNumber(mealFormInfo.fat)
    );
    setAddModalVisible(false);
    refreshLibraries();
  }

  function saveExercise() {
    if (exerciseFormInfo.name.trim() === '') return;
    insertSavedExercise(exerciseFormInfo.name.trim());
    setAddModalVisible(false);
    refreshLibraries();
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>

      {/* Meals / Exercises toggle with the add button on the right */}
      <View style={styles.toggleHeader}>
        <TouchableOpacity
          style={[styles.toggleButton, activeLibrary === "meals" && { backgroundColor: activityColors.nutrition }]}
          onPress={() => setActiveLibrary("meals")}
        >
          <Text style={[styles.text, activeLibrary === "meals" && styles.textOnLightFill]}>Meals</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.toggleButton, activeLibrary === "exercises" && { backgroundColor: activityColors.fitness }]}
          onPress={() => setActiveLibrary("exercises")}
        >
          <Text style={styles.text}>Exercises</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={openAddModal} style={{ paddingHorizontal: 12 }}>
          <Text style={[styles.text, { fontSize: 24 }]}>+</Text>
        </TouchableOpacity>
      </View>

      {activeLibrary === "meals" ? (
        <FlatList
          data={savedMeals}
          keyExtractor={(item) => item.id.toString()}
          ListEmptyComponent={<Text style={styles.emptyListText}>No saved meals yet. Tap + to add one.</Text>}
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
          data={savedExercises}
          keyExtractor={(item) => item.id.toString()}
          ListEmptyComponent={<Text style={styles.emptyListText}>No saved exercises yet. Tap + to add one.</Text>}
          renderItem={({ item }) => (
            <View style={styles.listRow}>
              <Text style={styles.listRowTitle}>{item.name}</Text>
            </View>
          )}
        />
      )}

      {/* Add Saved Meal Modal */}
      {addModalVisible && activeLibrary === "meals" && (
      <Modal visible transparent animationType="none">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalBox}>

            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setAddModalVisible(false)}>
                <Text style={styles.text}>✕</Text>
              </TouchableOpacity>
              <Text style={[styles.text, { fontSize: 16 }]}>Add Saved Meal</Text>
              <View></View>{/* buffer to center Add Saved Meal text */}
            </View>

            <Text style={[styles.fieldLabel]}>Meal Name</Text>
            <TextInput
            placeholder="Meal Name"
            placeholderTextColor="#3a3f45"
            style={[styles.inputTextBox]}
            value={mealFormInfo.name}
            onChangeText={(text) => setMealFormInfo({...mealFormInfo, name: text})}
            />

            <Text style={[styles.fieldLabel]}>Calories</Text>
            <TextInput
            placeholder="Calories"
            placeholderTextColor="#3a3f45"
            keyboardType="numeric"
            style={[styles.inputTextBox]}
            value={mealFormInfo.calories}
            onChangeText={(text) => setMealFormInfo({...mealFormInfo, calories: text})}
            />

            <Text style={[styles.fieldLabel]}>Protein</Text>
            <TextInput
            placeholder="Protein"
            placeholderTextColor="#3a3f45"
            keyboardType="numeric"
            style={[styles.inputTextBox]}
            value={mealFormInfo.protein}
            onChangeText={(text) => setMealFormInfo({...mealFormInfo, protein: text})}
            />

            <Text style={[styles.fieldLabel]}>Carbs</Text>
            <TextInput
            placeholder="Carbs"
            placeholderTextColor="#3a3f45"
            keyboardType="numeric"
            style={[styles.inputTextBox]}
            value={mealFormInfo.carbs}
            onChangeText={(text) => setMealFormInfo({...mealFormInfo, carbs: text})}
            />

            <Text style={[styles.fieldLabel]}>Fats</Text>
            <TextInput
            placeholder="Fats"
            placeholderTextColor="#3a3f45"
            keyboardType="numeric"
            style={[styles.inputTextBox]}
            value={mealFormInfo.fat}
            onChangeText={(text) => setMealFormInfo({...mealFormInfo, fat: text})}
            />

            <TouchableOpacity style={styles.entryButton} onPress={saveMeal}>
              <Text style={[styles.text, { textAlign: "center" }]}>Save Meal</Text>
            </TouchableOpacity>

          </View>
        </View>
      </Modal>
      )}

      {/* Add Saved Exercise Modal */}
      {addModalVisible && activeLibrary === "exercises" && (
      <Modal visible transparent animationType="none">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalBox}>

            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setAddModalVisible(false)}>
                <Text style={styles.text}>✕</Text>
              </TouchableOpacity>
              <Text style={[styles.text, { fontSize: 16 }]}>Add Saved Exercise</Text>
              <View></View>{/* buffer to center Add Saved Exercise text */}
            </View>

            <Text style={[styles.fieldLabel]}>Exercise Name</Text>
            <TextInput
            placeholder="Exercise Name"
            placeholderTextColor="#3a3f45"
            style={[styles.inputTextBox]}
            value={exerciseFormInfo.name}
            onChangeText={(text) => setExerciseFormInfo({ name: text })}
            />

            <TouchableOpacity style={styles.entryButton} onPress={saveExercise}>
              <Text style={[styles.text, { textAlign: "center" }]}>Save Exercise</Text>
            </TouchableOpacity>

          </View>
        </View>
      </Modal>
      )}

    </View>
  );
}
