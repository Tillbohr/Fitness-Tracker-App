import { Text, View, FlatList, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useState } from "react";
import { router } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useCalendarLogic } from "../hooks/calendar_logic";
import { styles } from "../../styles/defaultStyle";
import { toDateString } from "../../database";

export default function Calendar() {
  const {month, year, daysArray, daysOfWeek, monthNames, getPreviousMonth, getNextMonth} = useCalendarLogic();

  const insets = useSafeAreaInsets();
  // The month header and the day-of-week strip are measured separately - both
  // sit above the grid, so writing them into one piece of state let whichever
  // onLayout fired last win and the rows were sized against a single band.
  const [headerHeight, setHeaderHeight] = useState(0);
  const [daysHeaderHeight, setDaysHeaderHeight] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);
  // Six rows share whatever is left of the container once the safe-area inset
  // and both headers are taken out. Clamped because the first render happens
  // before any of the three measurements land.
  const cellHeight = Math.max(
    0,
    (containerHeight - insets.top - headerHeight - daysHeaderHeight) / 6
  );

  return (
    <View style={[styles.container, {paddingTop: insets.top}]} onLayout={(e) => setContainerHeight(e.nativeEvent.layout.height)}>
      {/* Header with month and navigation - same three-slot layout as the day
          summary screen's header (prev / title / next). */}
      <View style={styles.pageHeader} onLayout={(e) => setHeaderHeight(e.nativeEvent.layout.height)}>

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

      <View style={styles.daysHeader} onLayout={(e) => setDaysHeaderHeight(e.nativeEvent.layout.height)}>
        {daysOfWeek.map((day) => (
          <Text key={day} style={styles.headerCell}>
            {day}
          </Text>
        ))}
      </View>

      {/* Render Calendar Grid. Tapping a day pushes the day summary screen, which
          owns the per-day totals and the add-entry forms. */}
      <FlatList
        style={styles.grid}
        data={daysArray}
        numColumns={7}
        keyExtractor={(_, index) => index.toString()}
        renderItem={({ item }) => item === "" ? (
          <View style={[styles.cell, { height: cellHeight }]} />
        ) : (
          <TouchableOpacity style={[styles.cell, { height: cellHeight }]} onPress={() => {
            router.push({
              pathname: '/day/[date]',
              params: { date: toDateString(new Date(year, month, Number(item))) },
            });
          }}>
            <Text style={[styles.text, { height: cellHeight }]}>{item}</Text>
          </TouchableOpacity>
        )}
      />

    </View>
  );
}
