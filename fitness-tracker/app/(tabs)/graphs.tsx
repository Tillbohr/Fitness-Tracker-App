import { Text, View, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useFocusEffect } from "expo-router";
import { useAnimatedReaction, runOnJS, useSharedValue } from "react-native-reanimated";
import { Gesture } from "react-native-gesture-handler";
import { styles } from "../../styles/defaultStyle";
import { CartesianChart, Line, useChartPressState, type CartesianActionsHandle } from "victory-native";
import { Circle } from "@shopify/react-native-skia";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useDatabase, isNutritionMetric, toDateString, fromDateString } from "../../database";

const nutritionMetrics = ['Calories', 'Protein', 'Carbs', 'Fat'];

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const TOOLTIP_WIDTH = 190;
const TOOLTIP_OFFSET = 14;
// Height is estimated rather than measured: reading it back via onLayout to clamp
// the position would re-render the thing being measured on every selection.
const TOOLTIP_BASE_HEIGHT = 74;
const TOOLTIP_ROW_HEIGHT = 17;

// Hermes ships without full Intl on some platforms, so toLocaleString can't be
// relied on for the thousands separators.
function formatNumber(value: number) {
  const [whole, fraction] = (Math.round(value * 10) / 10).toString().split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return fraction ? `${grouped}.${fraction}` : grouped;
}

function formatFullDate(date: Date) {
  return `${MONTH_NAMES[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

function unitFor(metric: string) {
  if (metric === 'Calories') return '';
  return isNutritionMetric(metric) ? ' g' : ' lbs';
}

const timeframes = {
  '7 Days': 7,
  '30 Days': 30,
  '3 Months': 90,
  '6 Months': 180,
  '1 Year': 365,
} as const;

type Timeframe = keyof typeof timeframes;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Nutrition rolls up as a per-day total of whatever the meal rows recorded; an
// exercise rolls up as sets x reps x weight, so the caption has to say which.
function captionFor(metric: string) {
  if (metric === 'Calories') return 'Daily total calories';
  if (isNutritionMetric(metric)) return `Daily total ${metric.toLowerCase()} (g)`;
  return 'Daily total volume - sets x reps x weight (lbs)';
}

export default function Graphs() {
  const insets = useSafeAreaInsets();
  const {
    getLoggedExerciseNames, getNutritionSeries, getExerciseVolumeSeries, getExerciseEntriesForDate,
  } = useDatabase();

  const [metricOpen, setMetricOpen] = useState(false);
  const [timeframeOpen, setTimeframeOpen] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState('Calories');
  const [selectedTimeframe, setSelectedTimeframe] = useState<Timeframe>('30 Days');
  const [exerciseNames, setExerciseNames] = useState<string[]>([]);

  // Tab screens stay mounted, so a workout logged over on the calendar tab would
  // never reach a mount-only effect - reload the list every time this tab focuses.
  useFocusEffect(
    useCallback(() => {
      setExerciseNames(getLoggedExerciseNames());
    }, [getLoggedExerciseNames])
  );

  const metrics = [...nutritionMetrics, ...exerciseNames];

  const days = timeframes[selectedTimeframe];

  // The x axis is a day offset from the start of the range rather than the date
  // string: string categories space every point evenly, which would make a
  // two-week gap look identical to a one-day gap.
  const { chartData, rangeStart, series } = useMemo(() => {
    const end = new Date();
    end.setHours(0, 0, 0, 0);
    // Stepped by calendar day rather than by milliseconds: subtracting a fixed
    // day count across a DST boundary lands an hour off and shifts the date.
    const start = new Date(end);
    start.setDate(start.getDate() - (days - 1));

    const series = isNutritionMetric(selectedMetric)
      ? getNutritionSeries(selectedMetric, toDateString(start), toDateString(end))
      : getExerciseVolumeSeries(selectedMetric, toDateString(start), toDateString(end));

    return {
      rangeStart: start,
      // Kept alongside chartData and in the same order, so the press state's
      // matchedIndex indexes into both - the chart itself only needs day/value.
      series,
      chartData: series.map((point) => ({
        day: Math.round((fromDateString(point.date).getTime() - start.getTime()) / MS_PER_DAY),
        value: point.value,
      })),
    };
  }, [selectedMetric, days, getNutritionSeries, getExerciseVolumeSeries]);

  const formatDayLabel = (offset: number) => {
    const date = new Date(rangeStart);
    date.setDate(date.getDate() + Math.round(offset));
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  // The press state does the nearest-point hit testing and reports the matched
  // index plus that point's pixel position. Both get mirrored into React state so
  // the tooltip stays pinned after the finger lifts - and so its coordinates and
  // its text always come from the same index rather than updating on two threads.
  const { state: pressState } = useChartPressState({ x: 0, y: { value: 0 } });
  const [selection, setSelection] = useState<{ index: number; x: number; y: number } | null>(null);
  const [chartSize, setChartSize] = useState({ width: 0, height: 0 });

  // The chart's own press handler is a Pan, which only commits a touch once the
  // finger travels past the activation slop - a still tap can end without ever
  // reaching that point. Racing a Tap against it and driving the same
  // `handleTouch` worklet makes a plain tap select reliably; the Pan still wins
  // when the finger drags, so sliding along the line keeps working.
  const actionsRef = useSharedValue<CartesianActionsHandle<typeof pressState> | null>(null);

  const tapGesture = useMemo(
    () => Gesture.Race(
      Gesture.Tap().onEnd((event) => {
        'worklet';
        actionsRef.value?.handleTouch(pressState, event.x, event.y);
      })
    ),
    [actionsRef, pressState]
  );

  // Deliberately not gated on `isActive`: the tap path above sets the matched
  // index without ever flipping it. matchedIndex starts at -1, so the guard also
  // covers the reaction's initial run.
  useAnimatedReaction(
    () => ({
      index: pressState.matchedIndex.value,
      x: pressState.x.position.value,
      y: pressState.y.value.position.value,
    }),
    (current, previous) => {
      if (current.index < 0) return;
      if (previous && current.index === previous.index && current.x === previous.x) return;
      runOnJS(setSelection)({ index: current.index, x: current.x, y: current.y });
    }
  );

  // matchedIndex has to be rewound alongside the React state: the reaction above
  // only fires on a *change*, so re-tapping the point that was just dismissed
  // would otherwise be a no-op and the window would never come back.
  const clearSelection = useCallback(() => {
    setSelection(null);
    pressState.matchedIndex.value = -1;
  }, [pressState]);

  // A pinned index points at a different day once the query behind it changes.
  useEffect(() => {
    clearSelection();
  }, [selectedMetric, selectedTimeframe, clearSelection]);

  const selectedPoint = selection ? series[selection.index] : undefined;

  const selectedEntries = useMemo(() => {
    if (!selectedPoint || isNutritionMetric(selectedMetric)) return [];
    return getExerciseEntriesForDate(selectedMetric, selectedPoint.date);
  }, [selectedPoint, selectedMetric, getExerciseEntriesForDate]);

  // Flip to the point's left near the right edge, and above it near the bottom,
  // so the window stays inside the chart box instead of clipping off it.
  const tooltipPosition = useMemo(() => {
    if (!selection) return { left: 0, top: 0 };
    const height = TOOLTIP_BASE_HEIGHT + selectedEntries.length * TOOLTIP_ROW_HEIGHT;

    let left = selection.x + TOOLTIP_OFFSET;
    if (left + TOOLTIP_WIDTH > chartSize.width) left = selection.x - TOOLTIP_WIDTH - TOOLTIP_OFFSET;

    let top = selection.y + TOOLTIP_OFFSET;
    if (top + height > chartSize.height) top = selection.y - height - TOOLTIP_OFFSET;

    return {
      left: Math.max(0, Math.min(left, Math.max(0, chartSize.width - TOOLTIP_WIDTH))),
      top: Math.max(0, Math.min(top, Math.max(0, chartSize.height - height))),
    };
  }, [selection, selectedEntries.length, chartSize]);

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
              {/* The exercise half of this list grows with whatever has been logged */}
              <ScrollView style={graphStyle.dropdownScroll} nestedScrollEnabled>
                {metrics.map(m => (
                  <TouchableOpacity
                    key={m}
                    style={graphStyle.dropdownItem}
                    onPress={() => { setSelectedMetric(m); setMetricOpen(false); }}
                  >
                    <Text style={styles.text}>{m}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
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
              {(Object.keys(timeframes) as Timeframe[]).map(t => (
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

      <Text style={graphStyle.caption}>{captionFor(selectedMetric)}</Text>

      {/* Chart */}
      <View
        style={graphStyle.graph}
        onLayout={(e) => setChartSize({
          width: e.nativeEvent.layout.width,
          height: e.nativeEvent.layout.height,
        })}
      >
        {chartData.length === 0 ? (
          <Text style={styles.emptyListText}>
            No {selectedMetric} entries in the last {selectedTimeframe.toLowerCase()}.
          </Text>
        ) : (
          <CartesianChart
            data={chartData}
            xKey="day"
            yKeys={["value"]}
            domain={{ x: [0, days - 1] }}
            chartPressState={pressState}
            actionsRef={actionsRef}
            customGestures={tapGesture}
            axisOptions={{
              lineColor: "#3a3f45",
              labelColor: "#ffffff",
              lineWidth: 2,
              formatXLabel: formatDayLabel,
            }}
          >
            {({ points }) => (
              <>
                <Line points={points.value} color="#42a6ce" strokeWidth={2} />
                {points.value.map((point, index) =>
                  point.y != null && (
                    <Circle
                      key={index}
                      cx={point.x}
                      cy={point.y}
                      r={selection?.index === index ? 6 : 4}
                      color="#42a6ce"
                    />
                  )
                )}
                {/* Ring marking the pinned point */}
                {selection && points.value[selection.index]?.y != null && (
                  <Circle
                    cx={points.value[selection.index].x}
                    cy={points.value[selection.index].y!}
                    r={11}
                    color="#ffffff"
                    style="stroke"
                    strokeWidth={2}
                  />
                )}
              </>
            )}
          </CartesianChart>
        )}

        {/* Detail window for the pinned point */}
        {selectedPoint && (
          <View style={[graphStyle.tooltip, tooltipPosition]}>
            <View style={graphStyle.tooltipHeader}>
              <Text style={graphStyle.tooltipLabel}>Date</Text>
              <TouchableOpacity onPress={clearSelection} hitSlop={8}>
                <Text style={graphStyle.tooltipClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={graphStyle.tooltipValue}>
              {formatFullDate(fromDateString(selectedPoint.date))}
            </Text>

            <Text style={graphStyle.tooltipLabel}>
              {isNutritionMetric(selectedMetric) ? selectedMetric : 'Total volume'}
            </Text>
            <Text style={graphStyle.tooltipValue}>
              {formatNumber(selectedPoint.value)}{unitFor(selectedMetric)}
            </Text>

            {selectedEntries.length > 0 && (
              <View style={graphStyle.tooltipBreakdown}>
                {selectedEntries.map((entry, index) => (
                  <Text key={index} style={graphStyle.tooltipEntry}>
                    {entry.sets} × {entry.reps} @ {formatNumber(entry.weight)} lbs
                  </Text>
                ))}
              </View>
            )}
          </View>
        )}
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
  dropdownScroll: {
    maxHeight: 220,
  },
  dropdownItem: {
    padding: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: '#3a3f45',
  },
  caption: {
    color: '#8a9199',
    fontSize: 12,
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  graph: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
  },
  tooltip: {
    position: 'absolute',
    width: TOOLTIP_WIDTH,
    backgroundColor: '#2f353b',
    borderWidth: 1,
    borderColor: '#42a6ce',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingTop: 6,
    paddingBottom: 8,
  },
  tooltipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tooltipLabel: {
    color: '#8a9199',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 4,
  },
  tooltipValue: {
    color: '#ffffff',
    fontSize: 14,
  },
  tooltipClose: {
    color: '#8a9199',
    fontSize: 12,
  },
  tooltipBreakdown: {
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 0.5,
    borderTopColor: '#3a3f45',
  },
  tooltipEntry: {
    color: '#ffffff',
    fontSize: 12,
    lineHeight: 17,
  },
});
