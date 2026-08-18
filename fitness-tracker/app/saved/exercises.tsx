import { Text, View, FlatList, TouchableOpacity, Modal, TextInput } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCallback, useEffect, useState } from "react";
import { router } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { styles } from "../../styles/defaultStyle";
import { useDatabase, SavedExercise } from "../../database";
import ConfirmDelete from "../../components/ConfirmDelete";

// The row the confirmation popup is currently asking about. Held as one object
// rather than a boolean plus an id, so the popup can never be open without
// knowing which row it would delete.
type PendingDelete = { id: number; name: string };

export default function SavedExercises() {
  const { insertSavedExercise, getSavedExercises, deleteSavedExercise } = useDatabase();

  const [addModalVisible, setAddModalVisible] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);
  const [savedExercises, setSavedExercises] = useState<SavedExercise[]>([]);

  const [exerciseFormInfo, setExerciseFormInfo] = useState({
    name: ''
  });

  const insets = useSafeAreaInsets();

  // The database functions are plain synchronous calls, not reactive, so the list
  // is reloaded on mount and again after every write.
  const refreshExercises = useCallback(() => {
    setSavedExercises(getSavedExercises());
  }, [getSavedExercises]);

  useEffect(() => {
    refreshExercises();
  }, [refreshExercises]);

  function openAddModal() {
    setExerciseFormInfo({ name: '' });
    setAddModalVisible(true);
  }

  function saveExercise() {
    if (exerciseFormInfo.name.trim() === '') return;
    insertSavedExercise(exerciseFormInfo.name.trim());
    setAddModalVisible(false);
    refreshExercises();
  }

  // Only reached from the confirmation popup - nothing deletes on the first tap.
  function confirmDelete() {
    if (!pendingDelete) return;
    deleteSavedExercise(pendingDelete.id);
    setPendingDelete(null);
    refreshExercises();
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>

      {/* Header: back, title, add - the same three-slot layout as the day
          summary, since this screen also pushes over the tab bar. */}
      <View style={styles.pageHeader}>
        <TouchableOpacity style={styles.headerButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={26} color="#ffffff" />
        </TouchableOpacity>

        <Text style={styles.pageTitle}>Saved Exercises</Text>

        <TouchableOpacity style={styles.headerButton} onPress={openAddModal}>
          <Ionicons name="add" size={26} color="#ffffff" />
        </TouchableOpacity>
      </View>

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
              onPress={() => setPendingDelete({ id: item.id, name: item.name })}
            >
              <Ionicons name="trash-outline" size={20} color="#8a9199" />
            </TouchableOpacity>
          </View>
        )}
      />

      {addModalVisible && (
      <Modal visible transparent animationType="none">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalBox}>

            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setAddModalVisible(false)}>
                <Text style={styles.text}>✕</Text>
              </TouchableOpacity>
              <Text style={[styles.text, { fontSize: 16 }]}>Add Saved Exercise</Text>
              <View></View>{/* buffer to center the title */}
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
