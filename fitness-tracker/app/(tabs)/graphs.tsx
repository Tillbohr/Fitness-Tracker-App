import { Text, View, StyleSheet, Platform } from "react-native";
import { styles } from "../../styles/defaultStyle";
import { CartesianChart, Line } from "victory-native"
import { Circle } from "@shopify/react-native-skia"


export default function Graphs() {
  const DATA = Array.from({ length: 30 }, (_, i) => ({
    date: new Date(2024, 5, i + 1).toISOString().split('T')[0], // Dates in June 2024
    calories: Math.floor(Math.random() * 1000) + 1500, // Random calories between 1500 and 2500
  }));
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.entryButton}>Graphs</Text>
        <Text style={styles.toggleButton}>Visualize your fitness and nutrition data over time.</Text>
      </View>
      <View style={graphStyle.graph}>
        <CartesianChart
        data={DATA}
        xKey="date"
        yKeys={["calories"]}
        axisOptions={{lineColor: "#3a3f45", labelColor: "#ffffff", lineWidth: 2}}
        xAxis={{}}
        >
          {({ points }) => (
            <>
              <Line points={points.calories} color="#42a6ce" strokeWidth={2} />
              {points.calories.map((point, index) =>
                point.y != null && (
                  <Circle
                    key={index}
                    cx={point.x}
                    cy={point.y}
                    r={4}
                    color="#42a6ce"
                  />
                )
              )}
            </>
          )}
        </CartesianChart>
      </View>
    </View>
  );
}

const graphStyle = StyleSheet.create({
  graph: {
    height: "100%",
    width: "100%",
    flex: 1,
    justifyContent: "center",
    backgroundColor: "#25292e",
  }
});