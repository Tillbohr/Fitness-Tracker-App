import { Text, View, TouchableOpacity, Modal } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { styles } from "../styles/defaultStyle";

// The delete confirmation shared by the two saved library pages. Both delete a
// single named row, so the popup needs only the name and the two callbacks -
// which table the row lives in stays with the calling screen. Cancel just closes
// it; nothing has touched the database at this point.
export default function ConfirmDelete({ name, onCancel, onConfirm }: {
  name: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal visible transparent animationType="none">
      <View style={styles.modalBackdrop}>
        <View style={styles.confirmBox}>

          <Text style={styles.confirmText}>Are you sure you want to delete this?</Text>
          <Text style={styles.confirmSubject}>{name}</Text>

          <View style={styles.confirmButtonRow}>
            <TouchableOpacity style={styles.confirmButton} onPress={onCancel}>
              <Text style={styles.text}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.confirmButton, styles.confirmButtonDanger]}
              onPress={onConfirm}
            >
              <Ionicons name="trash-outline" size={18} color="#ffffff" />
              <Text style={styles.text}>Delete</Text>
            </TouchableOpacity>
          </View>

        </View>
      </View>
    </Modal>
  );
}
