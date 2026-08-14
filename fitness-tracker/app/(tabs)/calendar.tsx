import { Text, View, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCallback, useState } from "react";
import { router, useFocusEffect } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useCalendarLogic } from "../hooks/calendar_logic";
import { styles, activityColors } from "../../styles/defaultStyle";
import { toDateString, useDatabase, type DateCount } from "../../database";

export default function Calendar() {
  const {month, year, weeks, daysOfWeek, monthNames, getPreviousMonth, getNextMonth} = useCalendarLogic();
  const { getMealCountsInRange, getExerciseCountsInRange } = useDatabase();

  const insets = useSafeAreaInsets();

  // Only meaningful while the real current month is the one on screen - a 14th
  // is highlighted in August 2026, not in every August.
  const today = new Date();
  const showingCurrentMonth = today.getMonth() === month && today.getFullYear() === year;

  // How many entries each day of the visible month has. Held as Maps so each
  // cell is a lookup rather than a scan, and reloaded on focus because this tab
  // stays mounted - a mount-only effect would still show the old counts after
  // logging a meal on the day summary screen and coming back. Keying the
  // callback on the month also covers paging to a different one.
  const [mealCounts, setMealCounts] = useState<Map<string, number>>(new Map());
  const [exerciseCounts, setExerciseCounts] = useState<Map<string, number>>(new Map());

  useFocusEffect(
    useCallback(() => {
      // Day 0 of the next month is the last day of this one.
      const startDate = toDateString(new Date(year, month, 1));
      const endDate = toDateString(new Date(year, month + 1, 0));
      const toMap = (rows: DateCount[]) => new Map(rows.map((row) => [row.date, row.count]));
      setMealCounts(toMap(getMealCountsInRange(startDate, endDate)));
      setExerciseCounts(toMap(getExerciseCountsInRange(startDate, endDate)));
    }, [month, year, getMealCountsInRange, getExerciseCountsInRange])
  );

  return (
    <View style={[styles.container, {paddingTop: insets.top}]}>
      {/* Header with month and navigation - same three-slot layout as the day
          summary screen's header (prev / title / next). */}
      <View style={styles.pageHeader}>

        <TouchableOpacity style={styles.headerButton} onPress={() => getPreviousMonth(month, year)}>
          <Ionicons name="chevron-back" size={26} color="#ffffff" />
        </TouchableOpacity>

        <Text style={styles.pageTitle}>
          {monthNames[month]} {year}
        </Text>

        <TouchableOpacity style={styles.headerButton} onPress={() => getNextMonth(month, year)}>
          <Ionicons name="chevron-forward" size={26} color="#ffffff" />
        </TouchableOpacity>

      </View>

      <View style={styles.daysHeader}>
        {daysOfWeek.map((day) => (
          <Text key={day} style={styles.headerCell}>
            {day}
          </Text>
        ))}
      </View>

      {/* Calendar grid. The rows are flexed rather than given a measured height,
          so they always divide the space left below the headers exactly and the
          last row ends flush against the tab bar. Tapping a day pushes the day
          summary screen, which owns the per-day totals and the add-entry forms. */}
      <View style={styles.grid}>
        {weeks.map((week, weekIndex) => (
          <View key={weekIndex} style={styles.week}>
            {week.map((cell, dayIndex) => {
              if (!cell.inMonth) {
                // Shown for context only - dimmed, no dots, and inert like the
                // blanks they replaced. The today outline is skipped here too,
                // so viewing August on the 1st of September doesn't ring the
                // trailing 1.
                return (
                  <View key={dayIndex} style={styles.cell}>
                    <Text style={[styles.cellText, styles.cellTextAdjacent]}>{cell.day}</Text>
                  </View>
                );
              }

              const dateKey = toDateString(new Date(year, month, cell.day));
              const isToday = showingCurrentMonth && cell.day === today.getDate();
              const mealCount = mealCounts.get(dateKey);
              const exerciseCount = exerciseCounts.get(dateKey);

              return (
                <TouchableOpacity
                  key={dayIndex}
                  style={[styles.cell, isToday && styles.cellToday]}
                  onPress={() => {
                    router.push({ pathname: '/day/[date]', params: { date: dateKey } });
                  }}
                >
                  <Text style={styles.cellText}>{cell.day}</Text>
                  {/* Meals on top, matching the order of the day summary's
                      nutrition / fitness toggles and sharing their colours. */}
                  <View style={styles.badgeStack}>
                    {mealCount !== undefined && (
                      <View style={[styles.countBadge, { backgroundColor: activityColors.nutrition }]}>
                        <Text style={[styles.textOnLightFill, styles.countBadgeText]}>{mealCount}</Text>
                      </View>
                    )}
                    {exerciseCount !== undefined && (
                      <View style={[styles.countBadge, { backgroundColor: activityColors.fitness }]}>
                        <Text style={[styles.textOnLightFill, styles.countBadgeText]}>{exerciseCount}</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>

    </View>
  );
}
