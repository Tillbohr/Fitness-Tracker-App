import { Text, View, FlatList, TouchableOpacity, Modal, TextInput } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCallback, useEffect, useState } from "react";
import { router } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { styles } from "../../styles/defaultStyle";
import { useDatabase, SavedMeal } from "../../database";
import { toInt, toNumber } from "../../utils/numbers";
import ConfirmDelete from "../../components/ConfirmDelete";

// The row the confirmation popup is currently asking about. Held as one object
// rather than a boolean plus an id, so the popup can never be open without
// knowing which row it would delete.
type PendingDelete = { id: number; name: string };

export default function SavedMeals() {
  const { insertSavedMeal, getSavedMeals, updateSavedMeal, deleteSavedMeal } = useDatabase();

  const [addModalVisible, setAddModalVisible] = useState(false);
  // The row being edited, or null when the form is in "add" mode. Its name is
  // shown read-only, since name is the UNIQUE column and isn't updatable.
  const [editingMeal, setEditingMeal] = useState<SavedMeal | null>(null);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);
  const [savedMeals, setSavedMeals] = useState<SavedMeal[]>([]);

  const [mealFormInfo, setMealFormInfo] = useState({
    name: '',
    calories: '',
    protein: '',
    carbs: '',
    fat: ''
  });

  const insets = useSafeAreaInsets();

  // The database functions are plain synchronous calls, not reactive, so the list
  // is reloaded on mount and again after every write.
  const refreshMeals = useCallback(() => {
    setSavedMeals(getSavedMeals());
  }, [getSavedMeals]);

  useEffect(() => {
    refreshMeals();
  }, [refreshMeals]);

  function openAddModal() {
    setMealFormInfo({ name: '', calories: '', protein: '', carbs: '', fat: '' });
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
    refreshMeals();
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
    refreshMeals();
  }

  // Only reached from the confirmation popup - nothing deletes on the first tap.
  function confirmDelete() {
    if (!pendingDelete) return;
    deleteSavedMeal(pendingDelete.id);
    setPendingDelete(null);
    refreshMeals();
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>

      {/* Header: back, title, add - the same three-slot layout as the day
          summary, since this screen also pushes over the tab bar. */}
      <View style={styles.pageHeader}>
        <TouchableOpacity style={styles.headerButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={26} color="#ffffff" />
        </TouchableOpacity>

        <Text style={styles.pageTitle}>Saved Meals</Text>

        <TouchableOpacity style={styles.headerButton} onPress={openAddModal}>
          <Ionicons name="add" size={26} color="#ffffff" />
        </TouchableOpacity>
      </View>

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
              onPress={() => setPendingDelete({ id: item.id, name: item.name })}
            >
              <Ionicons name="trash-outline" size={20} color="#8a9199" />
            </TouchableOpacity>
          </View>
        )}
      />

      {/* Meal form, shared by add and edit - the fields are identical, so the
          two differ only in the title, the name field and the submit action. */}
      {(addModalVisible || editingMeal !== null) && (
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

      {pendingDelete && (
        <ConfirmDelete
          name={pendingDelete.name}
          onCancel={() => setPendingDelete(null)}
          onConfirm={confirmDelete}
        />
      )}

    </View>
  );
}
