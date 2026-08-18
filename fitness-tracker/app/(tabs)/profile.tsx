import { Text, View, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useState } from "react";
import { router } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { styles, activityColors } from "../../styles/defaultStyle";
import { useDatabase } from "../../database";
import ConfirmDelete from "../../components/ConfirmDelete";

// Icon colour for glyphs sitting on an activityColors fill. The same value as
// styles.textOnLightFill, repeated because Ionicons takes a colour prop rather
// than a style.
const ON_LIGHT_FILL = "#25292e";

// Border and label colour of the two wipe buttons, matching
// styles.confirmButtonDanger's fill. Repeated for the same reason as above.
const DANGER = "#d1453b";

// Which wipe the confirmation is currently asking about. Held as one value
// rather than a boolean per button, so the popup can't be open without knowing
// which table it would clear - the same reason the library screens hold their
// pending delete as an object.
type PendingWipe = "nutrition" | "fitness";

// Both wipes clear only the dated logs. The saved libraries live in their own
// tables and are deliberately left alone, so the reusable meals and exercises
// you've built up survive a wipe.
const WIPE_COPY = {
  nutrition: {
    label: "Delete Nutrition Data",
    message: "Delete all nutrition data?",
    subject: "All logged meals - your saved meals are kept",
  },
  fitness: {
    label: "Delete Exercise Data",
    message: "Delete all exercise data?",
    subject: "All logged exercises - your saved exercises are kept",
  },
};

export default function Profile() {
  const { clearMealDatabase, clearExerciseDatabase } = useDatabase();

  const [pendingWipe, setPendingWipe] = useState<PendingWipe | null>(null);

  const insets = useSafeAreaInsets();

  // Only reached from the confirmation popup - nothing clears on the first tap.
  function confirmWipe() {
    if (!pendingWipe) return;
    if (pendingWipe === "nutrition") clearMealDatabase();
    else clearExerciseDatabase();
    setPendingWipe(null);
    // Nothing to refresh here: Profile shows no counts, and the calendar and
    // graphs both reload on useFocusEffect when you tab back to them.
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>

      {/* A tab root, so there's no back or add button - the two empty slots keep
          the title centred in pageHeader's three-slot layout. */}
      <View style={styles.pageHeader}>
        <View style={styles.headerButton} />
        <Text style={styles.pageTitle}>Profile</Text>
        <View style={styles.headerButton} />
      </View>

      <Text style={styles.sectionLabel}>Libraries</Text>

      {/* Fills match the calendar's count badges and the day summary's toggles -
          amber for nutrition, accent blue for fitness - so every screen agrees on
          which side of the app a colour stands for. Both are too light to carry
          white text, so the labels and icons use the dark foreground. */}
      <TouchableOpacity
        style={[styles.profileButton, { backgroundColor: activityColors.nutrition }]}
        onPress={() => router.push("/saved/meals")}
      >
        <Ionicons name="restaurant-outline" size={22} color={ON_LIGHT_FILL} />
        <Text style={[styles.profileButtonLabel, styles.textOnLightFill]}>Saved Meals</Text>
        <Ionicons name="chevron-forward" size={20} color={ON_LIGHT_FILL} />
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.profileButton, { backgroundColor: activityColors.fitness }]}
        onPress={() => router.push("/saved/exercises")}
      >
        <Ionicons name="barbell-outline" size={22} color={ON_LIGHT_FILL} />
        <Text style={[styles.profileButtonLabel, styles.textOnLightFill]}>Saved Exercises</Text>
        <Ionicons name="chevron-forward" size={20} color={ON_LIGHT_FILL} />
      </TouchableOpacity>

      <Text style={styles.sectionLabel}>Manage Data</Text>

      {/* No chevron on these two: they act in place rather than opening a screen. */}
      {(["nutrition", "fitness"] as const).map((kind) => (
        <TouchableOpacity
          key={kind}
          style={[styles.profileButton, styles.profileButtonDanger]}
          onPress={() => setPendingWipe(kind)}
        >
          <Ionicons name="trash-outline" size={22} color={DANGER} />
          <Text style={[styles.profileButtonLabel, styles.profileButtonDangerLabel]}>
            {WIPE_COPY[kind].label}
          </Text>
        </TouchableOpacity>
      ))}

      {pendingWipe && (
        <ConfirmDelete
          message={WIPE_COPY[pendingWipe].message}
          name={WIPE_COPY[pendingWipe].subject}
          onCancel={() => setPendingWipe(null)}
          onConfirm={confirmWipe}
        />
      )}

    </View>
  );
}
