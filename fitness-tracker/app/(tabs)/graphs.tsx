import { Text, View, StyleSheet, TouchableOpacity } from "react-native";
import { useState } from "react";
import { styles } from "../../styles/defaultStyle";
import { CartesianChart, Line } from "victory-native";
import { Circle } from "@shopify/react-native-skia";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const metrics = ['Calories', 'Bench Press', 'Squat', 'Deadlift'];
const timeframes = ['7 Days', '30 Days', '3 Months', '6 Months', '1 Year'];

export default function Graphs() {
  const insets = useSafeAreaInsets();
  const [metricOpen, setMetricOpen] = useState(false);
  const [timeframeOpen, setTimeframeOpen] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState('Calories');
  const [selectedTimeframe, setSelectedTimeframe] = useState('30 Days');

  const DATA = Array.from({ length: 30 }, (_, i) => ({
    date: new Date(2024, 5, i + 1).toISOString().split('T')[0],
    calories: Math.floor(Math.random() * 1000) + 1500,
  }));

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>

      {/* Dropdown row */}
      <View style={graphStyle.dropdownRow}>

        {/* Metric dropdown */}
        <View style={graphStyle.dropdownWrapper}>
          <TouchableOpacity
            style={graphStyle.dropdownButton}
            onPress={() => { setMetricOpen(!metricOpen); setTimeframeOpen(false); }}
          >
            <Text style={styles.text}>{selectedMetric} ▾</Text>
          </TouchableOpacity>
          {metricOpen && (
            <View style={graphStyle.dropdownList}>
              {metrics.map(m => (
                <TouchableOpacity
                  key={m}
                  style={graphStyle.dropdownItem}
                  onPress={() => { setSelectedMetric(m); setMetricOpen(false); }}
                >
                  <Text style={styles.text}>{m}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Timeframe dropdown */}
        <View style={graphStyle.dropdownWrapper}>
          <TouchableOpacity
            style={graphStyle.dropdownButton}
            onPress={() => { setTimeframeOpen(!timeframeOpen); setMetricOpen(false); }}
          >
            <Text style={styles.text}>{selectedTimeframe} ▾</Text>
          </TouchableOpacity>
          {timeframeOpen && (
            <View style={graphStyle.dropdownList}>
              {timeframes.map(t => (
                <TouchableOpacity
                  key={t}
                  style={graphStyle.dropdownItem}
                  onPress={() => { setSelectedTimeframe(t); setTimeframeOpen(false); }}
                >
                  <Text style={styles.text}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

      </View>

      {/* Chart */}
      <View style={graphStyle.graph}>
        <CartesianChart
          data={DATA}
          xKey="date"
          yKeys={["calories"]}
          axisOptions={{ lineColor: "#3a3f45", labelColor: "#ffffff", lineWidth: 2 }}
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
  dropdownRow: {
    flexDirection: 'row',
    gap: 8,
    padding: 12,
    zIndex: 10,
  },
  dropdownWrapper: {
    flex: 1,
    position: 'relative',
    zIndex: 10,
  },
  dropdownButton: {
    borderWidth: 1,
    borderColor: '#3a3f45',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
  },
  dropdownList: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#25292e',
    borderWidth: 1,
    borderColor: '#3a3f45',
    borderRadius: 8,
    zIndex: 20,
    marginTop: 4,
  },
  dropdownItem: {
    padding: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: '#3a3f45',
  },
  graph: {
    flex: 1,
    width: '100%',
  },
});
