import { Text, View, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { styles, activityColors } from "../../styles/defaultStyle";

// Icon colour for glyphs sitting on an activityColors fill. The same value as
// styles.textOnLightFill, repeated because Ionicons takes a colour prop rather
// than a style.
const ON_LIGHT_FILL = "#25292e";

export default function Profile() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>

      {/* A tab root, so there's no back or add button - the two empty slots keep
          the title centred in pageHeader's three-slot layout. */}
      <View style={styles.pageHeader}>
        <View style={styles.headerButton} />
        <Text style={styles.pageTitle}>Profile</Text>
        <View style={styles.headerButton} />
      </View>

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

    </View>
  );
}
