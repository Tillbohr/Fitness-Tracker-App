import { View, StyleSheet } from "react-native";
import { Link, Stack } from "expo-router";

export default function NotFound() {
  return (
    <>
        <Stack.Screen options={{ title: "Not Found" }} />
        <View style={styles.container}>
        <Link href="/calendar" style={styles.link}>
            Go back to Home
        </Link>
        </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#353535",
    alignItems: "center",
    justifyContent: "center",
  },
  link: {
    fontSize: 20,
    textDecorationLine: "underline",
    color: "#fff",
  }
});