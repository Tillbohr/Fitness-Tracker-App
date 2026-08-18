import { Text, View, StyleSheet, TouchableOpacity, ScrollView, Platform } from "react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useFocusEffect } from "expo-router";
import { useAnimatedReaction, runOnJS, useSharedValue } from "react-native-reanimated";
import { Gesture } from "react-native-gesture-handler";
import Ionicons from "@expo/vector-icons/Ionicons";
import { styles, activityColors } from "../../styles/defaultStyle";
import { CartesianChart, Line, Area, useChartPressState, type CartesianActionsHandle } from "victory-native";
import { Circle, LinearGradient, vec, matchFont } from "@shopify/react-native-skia";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  useDatabase, toDateString, fromDateString,
  type NutritionMetric, type ExerciseMetricInfo,
} from "../../database";
import { formatDuration } from "../../utils/duration";

const axisFontStyle = {
  fontFamily: Platform.select({ ios: 'Helvetica', android: 'sans-serif', default: 'sans-serif' }),
  fontSize: 12,
};

const nutritionMetrics = ['Calories', 'Protein', 'Carbs', 'Fat'] as const;

// What the chart is plotting. An exercise is no longer just a name: the same
// name can be measured as volume, as duration, or - for the odd loaded carry -
// both, and the two are different quantities on different axes.
type Metric =
  | { kind: 'nutrition'; name: NutritionMetric }
  | { kind: 'volume'; name: string }
  | { kind: 'time'; name: string };

// Identity for React keys and for comparing the selection against the list;
// name alone would collide for an exercise offered as both volume and time.
function metricKey(metric: Metric) {
  return `${metric.kind}:${metric.name}`;
}

// The kind is only spelled out when an exercise appears twice, so the common
// case - an exercise measured one way - keeps its plain name in the list.
function metricLabel(metric: Metric, ambiguous: boolean) {
  if (!ambiguous) return metric.name;
  return `${metric.name} (${metric.kind === 'time' ? 'time' : 'volume'})`;
}

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

function unitFor(metric: Metric) {
  if (metric.kind === 'time') return '';
  if (metric.kind === 'volume') return ' lbs';
  return metric.name === 'Calories' ? '' : ' g';
}

const timeframes = {
  '7 Days': 7,
  '30 Days': 30,
  '3 Months': 90,
  '6 Months': 180,
  '1 Year': 365,
} as const;

type Timeframe = keyof typeof timeframes;

// Abbreviations for the segmented row, where five options share one line. The
// full names stay the keys, since the empty-state message reads them out.
const timeframeLabels: Record<Timeframe, string> = {
  '7 Days': '7d',
  '30 Days': '30d',
  '3 Months': '3m',
  '6 Months': '6m',
  '1 Year': '1y',
};

// A chart here draws one metric at a time, so the line colour is that metric's
// identity rather than a slot in a categorical palette: nutrition takes the
// app's amber, an exercise the accent blue - the pairing the calendar badges and
// the day toggles already use. Both clear 3:1 against the #25292e surface.
function seriesColorFor(metric: Metric) {
  return metric.kind === 'nutrition' ? activityColors.nutrition : activityColors.fitness;
}

// Skia's colour parser is happiest with rgba(), so the shared hex tokens are
// converted rather than being written out a second time as literals.
function withAlpha(hex: string, alpha: number) {
  const value = parseInt(hex.slice(1), 16);
  return `rgba(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}, ${alpha})`;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Fraction of the data span left as breathing room above and below the line.
const Y_PADDING = 0.12;
// Above this many points the per-day dots merge into a band and the line alone
// reads better. Hit testing is on the data, not the circles, so taps still work.
const MAX_DOTS = 60;

// The fill under the line is a wash rather than a block - the series hue at 16%
// against the plot's top edge, fading to nothing at the baseline.
const AREA_TOP_ALPHA = 0.16;

// Breathing room between the plot and the card's outline, and the offset the
// tooltip is clamped against - it's absolutely positioned from the padding edge,
// the same origin the chart itself starts from.
const CARD_PADDING = 12;
const CARD_BORDER = 1;

// The gap between the card and the screen edges, as padding on the area the card
// fills. The card stretches into whatever is left, so this is the only thing
// keeping the outline off the edges.
const AREA_PADDING = 12;

// Dots are drawn on a ring of the surface colour, so a point reads as a point
// instead of dissolving into the line beneath it, which is the same hue. A
// stroke around the mark would add ink that isn't data; the gap does the work.
const SURFACE = "#25292e";
const DOT_RING = 2;
const DOT_RADIUS = 4;
const DOT_RADIUS_SELECTED = 6;

// The axis splits the range into tickCount - 1 even intervals, and the x range
// is a whole number of days - so a count that doesn't divide it lands ticks
// mid-day and prints uneven gaps (a 7 day range at 5 ticks steps 1.5 days and
// reads Aug 8, 10, 11, 13, 14). Prefer a count that divides evenly.
export function xTickCount(days: number) {
  const span = days - 1;
  for (const count of [5, 4, 6, 3]) {
    if (span % (count - 1) === 0) return count;
  }
  return 5;
}

// Rounds up to 1, 2 or 5 x 10^n, so axis ticks land on numbers a person would
// choose rather than on whatever the data extent happened to be.
function niceStep(rough: number) {
  const magnitude = Math.pow(10, Math.floor(Math.log10(rough)));
  const normalized = rough / magnitude;
  if (normalized <= 1) return magnitude;
  if (normalized <= 2) return 2 * magnitude;
  if (normalized <= 5) return 5 * magnitude;
  return 10 * magnitude;
}

// Without an explicit y domain the chart fits the data exactly, which pins the
// highest point to the top edge and the lowest to the bottom. This pads the
// range, snaps the floor to zero when the padding reaches it, and rounds both
// ends outward to a nice step.
//
// The tick count comes back with the domain because the two have to agree: the
// axis divides the domain into tickCount - 1 even intervals, so a count that
// doesn't match the step lands the labels on values like 1,500 inside an
// otherwise clean 0-6,000 range.
export function niceScale(values: number[]): { domain: [number, number]; tickCount: number } {
  if (values.length === 0) return { domain: [0, 1], tickCount: 2 };

  const min = Math.min(...values);
  const max = Math.max(...values);

  // One point, or a series that never changes, has no span to take a percentage
  // of - build a band around the value instead of returning a zero-height
  // domain, which would leave the line with nowhere to sit.
  const span = max - min;
  const padding = span === 0 ? Math.max(Math.abs(max) * Y_PADDING, 1) : span * Y_PADDING;

  const paddedLow = min - padding;
  const paddedHigh = max + padding;

  // These metrics are never negative, so a floor that has been padded past zero
  // means the data sits near zero anyway - anchor there rather than showing
  // negative ticks that can't occur.
  const low = paddedLow <= 0 ? 0 : paddedLow;
  const step = niceStep((paddedHigh - low) / 4);

  const domainLow = Math.floor(low / step) * step;
  const domainHigh = Math.ceil(paddedHigh / step) * step;

  return {
    domain: [domainLow, domainHigh],
    tickCount: Math.round((domainHigh - domainLow) / step) + 1,
  };
}

// Nutrition rolls up as a per-day total of whatever the meal rows recorded, a
// weighted exercise as sets x reps x weight, a timed one as minutes - so the
// caption has to say which. It names the quantity and its unit, which is why
// neither axis carries a title: a label on the plot would only repeat it.
function captionFor(metric: Metric) {
  if (metric.kind === 'time') return 'Daily total time (minutes)';
  if (metric.kind === 'volume') return 'Daily total volume - sets x reps x weight (lbs)';
  if (metric.name === 'Calories') return 'Daily total calories';
  return `Daily total ${metric.name.toLowerCase()} (g)`;
}

export default function Graphs() {
  const insets = useSafeAreaInsets();
  const {
    getExerciseMetricInfo, getNutritionSeries, getExerciseVolumeSeries,
    getExerciseTimeSeries, getExerciseEntriesForDate,
  } = useDatabase();

  const [metricOpen, setMetricOpen] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState<Metric>({ kind: 'nutrition', name: 'Calories' });
  const [selectedTimeframe, setSelectedTimeframe] = useState<Timeframe>('30 Days');
  const [exerciseInfo, setExerciseInfo] = useState<ExerciseMetricInfo[]>([]);

  // Drives the line, the area wash, the active timeframe segment and the
  // tooltip's edge, so the whole screen shifts with the metric.
  const seriesColor = seriesColorFor(selectedMetric);

  // Tab screens stay mounted, so an exercise logged over on the calendar tab
  // would never reach a mount-only effect - reload every time this tab focuses.
  useFocusEffect(
    useCallback(() => {
      setExerciseInfo(getExerciseMetricInfo());
    }, [getExerciseMetricInfo])
  );

  // An exercise contributes one entry per way it was measured. Only the ones
  // measured both ways get their kind spelled out in the label.
  const metrics = useMemo(() => {
    const list: { metric: Metric; label: string }[] = nutritionMetrics.map((name) => ({
      metric: { kind: 'nutrition', name },
      label: name,
    }));

    for (const info of exerciseInfo) {
      const ambiguous = info.hasVolume === 1 && info.hasTime === 1;
      if (info.hasVolume === 1) {
        const metric: Metric = { kind: 'volume', name: info.name };
        list.push({ metric, label: metricLabel(metric, ambiguous) });
      }
      if (info.hasTime === 1) {
        const metric: Metric = { kind: 'time', name: info.name };
        list.push({ metric, label: metricLabel(metric, ambiguous) });
      }
    }
    return list;
  }, [exerciseInfo]);

  const selectedLabel = metrics.find((m) => metricKey(m.metric) === metricKey(selectedMetric))?.label
    ?? selectedMetric.name;

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

    const series =
      selectedMetric.kind === 'nutrition'
        ? getNutritionSeries(selectedMetric.name, toDateString(start), toDateString(end))
        : selectedMetric.kind === 'time'
          ? getExerciseTimeSeries(selectedMetric.name, toDateString(start), toDateString(end))
          : getExerciseVolumeSeries(selectedMetric.name, toDateString(start), toDateString(end));

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
  }, [selectedMetric, days, getNutritionSeries, getExerciseVolumeSeries, getExerciseTimeSeries]);

  const yScale = useMemo(() => niceScale(chartData.map((point) => point.value)), [chartData]);

  // The tick format follows the range: a day and month read well when five ticks
  // cover a week, but across a year only the month and year are worth the space.
  // The middle ranges stay numeric - at 3 months five ticks are about three
  // weeks apart, so a month-only label can print the same month twice.
  const formatDayLabel = (offset: number) => {
    const date = new Date(rangeStart);
    date.setDate(date.getDate() + Math.round(offset));

    if (days <= 30) return `${MONTH_NAMES[date.getMonth()]} ${date.getDate()}`;
    if (days <= 180) return `${date.getMonth() + 1}/${date.getDate()}`;
    return `${MONTH_NAMES[date.getMonth()]} '${date.getFullYear().toString().slice(-2)}`;
  };

  // The press state does the nearest-point hit testing and reports the matched
  // index plus that point's pixel position. Both get mirrored into React state so
  // the tooltip stays pinned after the finger lifts - and so its coordinates and
  // its text always come from the same index rather than updating on two threads.
  const { state: pressState } = useChartPressState({ x: 0, y: { value: 0 } });
  const [selection, setSelection] = useState<{ index: number; x: number; y: number } | null>(null);

  // What the tooltip is clamped inside, and the origin an absolutely positioned
  // child measures from. It measures the plot wrapper rather than the card
  // because the wrapper *is* that origin: it carries no border or padding, so
  // its layout box needs no arithmetic to become the coordinate space the
  // tooltip is placed in. Deriving it from the card means reconstructing the
  // same rectangle by subtraction, and desyncing the two the moment anything is
  // laid out between the card's edge and the chart.
  const [chartSize, setChartSize] = useState({ width: 0, height: 0 });

  // The tick labels are Skia text, and Skia draws no text without a font:
  // victory-native's label branch returns null rather than falling back, so
  // leaving this off costs every number on both axes, silently. matchFont takes
  // a system face, so this needs no bundled .ttf.
  //
  // It has to be built here rather than at module scope. matchFont reaches into
  // Skia, which isn't initialised during expo-router's server render of the web
  // route - at module scope that throws while the module body runs and takes the
  // whole route down with it. Building it in render keeps it off the server
  // pass, where `window` is undefined and the font comes back null; the client
  // re-runs this on hydration and the labels appear then.
  const axisFont = useMemo(
    () => (typeof window === 'undefined' ? null : matchFont(axisFontStyle)),
    []
  );

  // The chart's own press handler is a Pan, which only commits a touch once the
  // finger travels past the activation slop - a still tap can end without ever
  // reaching that point. Racing a Tap against it and driving the same
  // `handleTouch` worklet makes a plain tap select reliably; the Pan still wins
  // when the finger drags, so sliding along the line keeps working.
  const actionsRef = useSharedValue<CartesianActionsHandle<typeof pressState> | null>(null);

  // matchedIndex has to be rewound alongside the React state: the reaction below
  // only fires on a *change*, so re-tapping the point that was just dismissed
  // would otherwise be a no-op and the window would never come back. Defined
  // above the gesture because the gesture now calls it.
  const clearSelection = useCallback(() => {
    setSelection(null);
    pressState.matchedIndex.value = -1;
  }, [pressState]);

  // The tap runs as a worklet on the UI thread and can't read `selection`, so
  // whether anything is pinned is mirrored into a shared value it can read.
  const hasSelection = useSharedValue(false);
  useEffect(() => {
    hasSelection.value = selection !== null;
  }, [selection, hasSelection]);

  // With a point pinned, a tap anywhere in the plot dismisses it rather than
  // selecting. Every tap lands *somewhere* - handleTouch matches the nearest
  // point and never misses - so "tap outside to close" has to mean the tap does
  // nothing else. Only the still tap is redirected; the Pan is left alone, so
  // dragging along the line still moves the pinned point.
  const tapGesture = useMemo(
    () => Gesture.Race(
      Gesture.Tap().onEnd((event) => {
        'worklet';
        if (hasSelection.value) {
          runOnJS(clearSelection)();
          return;
        }
        actionsRef.value?.handleTouch(pressState, event.x, event.y);
      })
    ),
    [actionsRef, pressState, hasSelection, clearSelection]
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

  // A pinned index points at a different day once the query behind it changes.
  useEffect(() => {
    clearSelection();
  }, [selectedMetric, selectedTimeframe, clearSelection]);

  const selectedPoint = selection ? series[selection.index] : undefined;

  const selectedEntries = useMemo(() => {
    if (!selectedPoint || selectedMetric.kind === 'nutrition') return [];
    return getExerciseEntriesForDate(selectedMetric.name, selectedPoint.date, selectedMetric.kind);
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

      {/* One control row scoping the whole screen: the metric, then the range.
          The metric list is open-ended so it stays a dropdown, but five fixed
          timeframes fit on one line as segments and save a tap each. */}
      <View style={graphStyle.controls}>

        <Text style={styles.fieldLabel}>Metric</Text>
        <View style={graphStyle.dropdownWrapper}>
          <TouchableOpacity
            style={graphStyle.dropdownButton}
            onPress={() => setMetricOpen(!metricOpen)}
          >
            <Text style={styles.text}>{selectedLabel}</Text>
            <Ionicons
              name={metricOpen ? "chevron-up" : "chevron-down"}
              size={16}
              color="#8a9199"
            />
          </TouchableOpacity>
          {metricOpen && (
            <View style={graphStyle.dropdownList}>
              {/* The exercise half of this list grows with whatever has been logged */}
              <ScrollView style={graphStyle.dropdownScroll} nestedScrollEnabled>
                {metrics.map(({ metric, label }) => (
                  <TouchableOpacity
                    key={metricKey(metric)}
                    style={graphStyle.dropdownItem}
                    onPress={() => { setSelectedMetric(metric); setMetricOpen(false); }}
                  >
                    <Text style={styles.text}>{label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        {/* The active segment takes the metric's own colour, so the controls and
            the line agree on which side of the app is being looked at. */}
        <View style={graphStyle.segmentRow}>
          {(Object.keys(timeframes) as Timeframe[]).map(t => (
            <TouchableOpacity
              key={t}
              style={[
                graphStyle.segment,
                selectedTimeframe === t && { backgroundColor: seriesColor, borderColor: seriesColor },
              ]}
              onPress={() => setSelectedTimeframe(t)}
            >
              <Text style={[
                graphStyle.segmentText,
                selectedTimeframe === t && styles.textOnLightFill,
              ]}>
                {timeframeLabels[t]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

      </View>

      <Text style={graphStyle.caption}>{captionFor(selectedMetric)}</Text>

      {/* The card fills everything below the controls, inset from the screen
          edges. The x axis carries no title - its ticks already read as dates -
          and the y axis carries the bare unit above its tick column. */}
      <View style={graphStyle.chartArea}>
      <View style={graphStyle.chartCard}>
        {chartData.length === 0 ? (
          <Text style={[styles.emptyListText, { marginTop: 0 }]}>
            No {selectedLabel} entries in the last {selectedTimeframe.toLowerCase()}.
          </Text>
        ) : (
          // The chart and the tooltip share this box on purpose: the tooltip
          // is absolutely positioned, so its origin is whatever it sits
          // inside, and it is the box a tap dismisses inside.
          <View
            style={graphStyle.plot}
            onLayout={(e) => setChartSize({
              width: e.nativeEvent.layout.width,
              height: e.nativeEvent.layout.height,
            })}
          >
            <CartesianChart
              data={chartData}
              xKey="day"
              yKeys={["value"]}
              domain={{ x: [0, days - 1], y: yScale.domain }}
              chartPressState={pressState}
              actionsRef={actionsRef}
              customGestures={tapGesture}
              axisOptions={{
                font: axisFont,
                lineColor: "#3a3f45",
                // The muted text token, not white: tick labels annotate the data,
                // so they must not carry the same weight as the line they label.
                labelColor: "#8a9199",
                // A hairline, so the grid stays recessive against the 2px data line.
                lineWidth: 1,
                // Both counts are chosen to match their range: x so ticks land on
                // whole days, y so they land on the domain's step.
                tickCount: { x: xTickCount(days), y: yScale.tickCount },
                formatXLabel: formatDayLabel,
                formatYLabel: formatNumber,
              }}
            >
              {({ points, chartBounds }) => (
                <>
                  {/* A wash under the line rather than a filled block: the hue at
                      16% against the top of the plot, gone by the baseline. */}
                  <Area points={points.value} y0={chartBounds.bottom}>
                    <LinearGradient
                      start={vec(0, chartBounds.top)}
                      end={vec(0, chartBounds.bottom)}
                      colors={[withAlpha(seriesColor, AREA_TOP_ALPHA), withAlpha(seriesColor, 0)]}
                    />
                  </Area>

                  <Line
                    points={points.value}
                    color={seriesColor}
                    strokeWidth={2}
                    strokeCap="round"
                    strokeJoin="round"
                  />

                  {/* Dropped on long timeframes, where a dot per day merges into a
                      band; the selected point still gets its marker below. Each dot
                      is drawn over a surface-coloured disc, so it separates from
                      the same-coloured line without a stroke around the mark. The
                      ring and fill interleave per point rather than running as two
                      passes, so overlapping dots stack like coins. */}
                  {points.value.length <= MAX_DOTS && points.value.flatMap((point, index) =>
                    point.y == null ? [] : [
                      <Circle
                        key={`ring-${index}`}
                        cx={point.x}
                        cy={point.y}
                        r={(selection?.index === index ? DOT_RADIUS_SELECTED : DOT_RADIUS) + DOT_RING}
                        color={SURFACE}
                      />,
                      <Circle
                        key={`dot-${index}`}
                        cx={point.x}
                        cy={point.y}
                        r={selection?.index === index ? DOT_RADIUS_SELECTED : DOT_RADIUS}
                        color={seriesColor}
                      />,
                    ]
                  )}

                  {/* On a dense chart the pinned point needs its own dot, since the
                      per-point circles above aren't drawn. */}
                  {points.value.length > MAX_DOTS && selection && points.value[selection.index]?.y != null && (
                    <>
                      <Circle
                        cx={points.value[selection.index].x}
                        cy={points.value[selection.index].y!}
                        r={DOT_RADIUS_SELECTED + DOT_RING}
                        color={SURFACE}
                      />
                      <Circle
                        cx={points.value[selection.index].x}
                        cy={points.value[selection.index].y!}
                        r={DOT_RADIUS_SELECTED}
                        color={seriesColor}
                      />
                    </>
                  )}

                  {/* Ring marking the pinned point. White rather than the series
                      colour, so the selection affordance stays distinct from the
                      surface ring every dot already carries. */}
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

          {/* Detail window for the pinned point */}
          {selectedPoint && (
            <View
              style={[graphStyle.tooltip, tooltipPosition, { borderColor: seriesColor }]}
              // Claims its own touches, so a tap on the box doesn't reach the
              // gesture detector beneath and dismiss it. Children are offered
              // the touch first, so the close button still works.
              onStartShouldSetResponder={() => true}
            >
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
                {selectedMetric.kind === 'nutrition' ? selectedMetric.name
                  : selectedMetric.kind === 'time' ? 'Total time' : 'Total volume'}
              </Text>
              {/* The series carries minutes so the axis reads well, but a headline
                  duration is clearer as mm:ss than as "32.8 min" - and the value
                  is exact, since the minutes came from whole seconds. */}
              <Text style={graphStyle.tooltipValue}>
                {selectedMetric.kind === 'time'
                  ? formatDuration(selectedPoint.value * 60)
                  : `${formatNumber(selectedPoint.value)}${unitFor(selectedMetric)}`}
              </Text>

              {selectedEntries.length > 0 && (
                <View style={graphStyle.tooltipBreakdown}>
                  {selectedEntries.map((entry, index) => (
                    <Text key={index} style={graphStyle.tooltipEntry}>
                      {selectedMetric.kind === 'time'
                        ? formatDuration(entry.seconds)
                        : `${entry.sets} × ${entry.reps} @ ${formatNumber(entry.weight)} lbs`}
                    </Text>
                  ))}
                </View>
              )}
            </View>
          )}
          </View>
        )}
      </View>
      </View>

    </View>
  );
}

const graphStyle = StyleSheet.create({
  controls: {
    padding: 12,
    zIndex: 10,
  },
  // The open list is absolutely positioned out of this wrapper and has to paint
  // over the segment row below it, so the wrapper outranks that row explicitly
  // rather than relying on sibling order.
  dropdownWrapper: {
    position: 'relative',
    zIndex: 20,
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#3a3f45',
    borderRadius: 8,
    padding: 10,
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
  // Five segments on one line, so the labels are abbreviated and the row splits
  // the width evenly rather than sizing to its text.
  segmentRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 10,
    zIndex: 1,
  },
  segment: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3a3f45',
    alignItems: 'center',
  },
  segmentText: {
    color: '#ffffff',
    fontSize: 13,
  },
  // Doubles as the y axis title, so it names the quantity and its unit. Indented
  // to AREA_PADDING so it starts level with the card's left edge below it.
  caption: {
    color: '#8a9199',
    fontSize: 12,
    paddingHorizontal: AREA_PADDING,
    paddingBottom: 8,
  },
  // Fills the card. This is the box measured into chartSize, the one the tooltip
  // positions against, and the region a tap dismisses inside - so it deliberately
  // carries no padding or border of its own.
  plot: {
    flex: 1,
  },
  // Holds the card off the screen edges. Everything else about the card's size
  // comes from filling this.
  chartArea: {
    flex: 1,
    padding: AREA_PADDING,
  },
  // The same hairline border and 12px radius the modals and buttons carry.
  // justifyContent centres the empty-state message; the chart itself is flex, so
  // it still fills the box. alignItems is deliberately left alone - centring it
  // would stop the chart stretching across the card.
  chartCard: {
    flex: 1,
    justifyContent: 'center',
    borderWidth: CARD_BORDER,
    borderColor: '#3a3f45',
    borderRadius: 12,
    padding: CARD_PADDING,
    overflow: 'hidden',
  },
  // The edge is tinted with the metric's colour at render time; the text inside
  // stays on the plain text tokens.
  tooltip: {
    position: 'absolute',
    width: TOOLTIP_WIDTH,
    backgroundColor: '#2f353b',
    borderWidth: 1,
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
