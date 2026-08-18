import { Text, View, TouchableOpacity, Modal } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { styles } from "../styles/defaultStyle";

// The delete confirmation shared by the saved library pages and Profile's two
// data wipes. `name` is what would be deleted; `message` overrides the question
// above it, which the wipes need since "this" reads oddly for a whole table.
// Which table the deletion lands in stays with the calling screen. Cancel just
// closes the popup; nothing has touched the database at this point.
export default function ConfirmDelete({ name, message, onCancel, onConfirm }: {
  name: string;
  message?: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal visible transparent animationType="none">
      <View style={styles.modalBackdrop}>
        <View style={styles.confirmBox}>

          <Text style={styles.confirmText}>{message ?? "Are you sure you want to delete this?"}</Text>
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
