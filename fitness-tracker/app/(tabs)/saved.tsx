import { Text, View, FlatList, TouchableOpacity, Modal, TextInput } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCallback, useEffect, useState } from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import { styles, activityColors } from "../../styles/defaultStyle";
import { useDatabase, SavedExercise, SavedMeal } from "../../database";
import { toInt, toNumber } from "../../utils/numbers";

// What the confirmation popup is currently asking about. Held as one object
// rather than a boolean plus an id, so the popup can never be open without
// knowing which row it would delete.
type PendingDelete = { kind: "meal" | "exercise"; id: number; name: string };

export default function Saved() {
  const {
    insertSavedExercise, getSavedExercises, insertSavedMeal, getSavedMeals,
    updateSavedMeal, deleteSavedMeal, deleteSavedExercise,
  } = useDatabase();

  const [activeLibrary, setActiveLibrary] = useState<"meals" | "exercises">("meals");
  const [addModalVisible, setAddModalVisible] = useState(false);
  // The row being edited, or null when the meal form is in "add" mode. Its name
  // is shown read-only, since name is the UNIQUE column and isn't updatable.
  const [editingMeal, setEditingMeal] = useState<SavedMeal | null>(null);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);
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
      toInt(mealFormInfo.calories),
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

  function openEditModal(meal: SavedMeal) {
    // Seeded from the stored values so the form opens showing what is currently
    // saved rather than empty boxes.
    setMealFormInfo({
      name: meal.name,
      calories: meal.calories.toString(),
      protein: meal.protein.toString(),
      carbs: meal.carbs.toString(),
      fat: meal.fat.toString(),
    });
    setEditingMeal(meal);
  }

  function saveMealEdit() {
    if (!editingMeal) return;
    updateSavedMeal(
      editingMeal.id,
      toInt(mealFormInfo.calories),
      toNumber(mealFormInfo.protein),
      toNumber(mealFormInfo.carbs),
      toNumber(mealFormInfo.fat)
    );
    setEditingMeal(null);
    refreshLibraries();
  }

  // Only reached from the confirmation popup - nothing deletes on the first tap.
  function confirmDelete() {
    if (!pendingDelete) return;
    if (pendingDelete.kind === "meal") deleteSavedMeal(pendingDelete.id);
    else deleteSavedExercise(pendingDelete.id);
    setPendingDelete(null);
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
            <View style={[styles.listRow, styles.listRowActions]}>
              <View style={styles.listRowBody}>
                <Text style={styles.listRowTitle}>{item.name}</Text>
                <Text style={styles.listRowDetail}>
                  {item.calories} cal · {item.protein}g protein · {item.carbs}g carbs · {item.fat}g fat
                </Text>
              </View>

              <TouchableOpacity style={styles.rowAction} hitSlop={10} onPress={() => openEditModal(item)}>
                <Ionicons name="pencil" size={20} color="#8a9199" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.rowAction}
                hitSlop={10}
                onPress={() => setPendingDelete({ kind: "meal", id: item.id, name: item.name })}
              >
                <Ionicons name="trash-outline" size={20} color="#8a9199" />
              </TouchableOpacity>
            </View>
          )}
        />
      ) : (
        <FlatList
          data={savedExercises}
          keyExtractor={(item) => item.id.toString()}
          ListEmptyComponent={<Text style={styles.emptyListText}>No saved exercises yet. Tap + to add one.</Text>}
          renderItem={({ item }) => (
            <View style={[styles.listRow, styles.listRowActions]}>
              <View style={styles.listRowBody}>
                <Text style={styles.listRowTitle}>{item.name}</Text>
              </View>

              {/* No edit here: an exercise is only a name, and the name is the
                  UNIQUE column, so changing it is a delete and re-add. */}
              <TouchableOpacity
                style={styles.rowAction}
                hitSlop={10}
                onPress={() => setPendingDelete({ kind: "exercise", id: item.id, name: item.name })}
              >
                <Ionicons name="trash-outline" size={20} color="#8a9199" />
              </TouchableOpacity>
            </View>
          )}
        />
      )}

      {/* Meal form, shared by add and edit - the fields are identical, so the
          two differ only in the title, the name field and the submit action. */}
      {((addModalVisible && activeLibrary === "meals") || editingMeal !== null) && (
      <Modal visible transparent animationType="none">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalBox}>

            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => { setAddModalVisible(false); setEditingMeal(null); }}>
                <Text style={styles.text}>✕</Text>
              </TouchableOpacity>
              <Text style={[styles.text, { fontSize: 16 }]}>
                {editingMeal ? 'Edit Saved Meal' : 'Add Saved Meal'}
              </Text>
              <View></View>{/* buffer to center the title */}
            </View>

            <Text style={[styles.fieldLabel]}>Meal Name</Text>
            {editingMeal ? (
              <Text style={styles.readOnlyTextBox}>{editingMeal.name}</Text>
            ) : (
              <TextInput
              placeholder="Meal Name"
              placeholderTextColor="#3a3f45"
              style={[styles.inputTextBox]}
              value={mealFormInfo.name}
              onChangeText={(text) => setMealFormInfo({...mealFormInfo, name: text})}
              />
            )}

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

            <TouchableOpacity style={styles.entryButton} onPress={editingMeal ? saveMealEdit : saveMeal}>
              <Text style={[styles.text, { textAlign: "center" }]}>
                {editingMeal ? 'Save Changes' : 'Save Meal'}
              </Text>
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

      {/* Delete confirmation. Cancel just closes it - nothing has touched the
          database at this point. */}
      {pendingDelete && (
      <Modal visible transparent animationType="none">
        <View style={styles.modalBackdrop}>
          <View style={styles.confirmBox}>

            <Text style={styles.confirmText}>Are you sure you want to delete this?</Text>
            <Text style={styles.confirmSubject}>{pendingDelete.name}</Text>

            <View style={styles.confirmButtonRow}>
              <TouchableOpacity style={styles.confirmButton} onPress={() => setPendingDelete(null)}>
                <Text style={styles.text}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.confirmButton, styles.confirmButtonDanger]}
                onPress={confirmDelete}
              >
                <Ionicons name="trash-outline" size={18} color="#ffffff" />
                <Text style={styles.text}>Delete</Text>
              </TouchableOpacity>
            </View>

          </View>
        </View>
      </Modal>
      )}

    </View>
  );
}
