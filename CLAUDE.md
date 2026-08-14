# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project layout

This repo has a single Expo app in the `fitness-tracker/` subdirectory — run all commands from there, not the repo root. There's also an `app-example/` directory holding the original `create-expo-app` starter/reference code (untouched boilerplate, not part of the running app).

## Commands

All run from `fitness-tracker/`:

```bash
npm install          # install dependencies
npm run start         # expo start — dev server with QR code / Metro bundler options
npm run android        # expo start --android
npm run ios            # expo start --ios
npm run web             # expo start --web
npm run lint              # expo lint (ESLint via eslint-config-expo flat config)
```

There is no test suite configured in this project.

## Architecture

**Routing**: Expo Router (file-based). `app/_layout.tsx` is the root `Stack` with two screens: `index` (landing page) and `(tabs)` (the tab group). `app/(tabs)/_layout.tsx` defines the bottom tab bar with two tabs: `calendar` and `graphs`.

**Data layer**: `database.ts` at the project root owns two separate SQLite databases opened synchronously via `expo-sqlite` (`exercisesDB` from `exercises.db`, `mealsDB` from `meals.db`), each with its own table (`exercises`, `meals`) created on load. All access goes through the `useDatabase()` hook, which exposes CRUD-style functions (`insertExercise`, `getExercises`, `getExerciseDateInfo`, `insertMeal`, `getMeals`, `getMealDateInfo`, `clearExerciseDatabase`, `clearMealDatabase`). Despite the "use" naming, these are plain synchronous functions, not stateful React hooks — there's no `useState`/`useEffect` inside `useDatabase()`.

Dates are stored/queried as `YYYY-MM-DD` strings built manually (e.g. `` `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}` ``) — this exact construction is repeated at call sites in `calendar.tsx` rather than centralized, so match that format when adding new queries.

**Calendar screen** (`app/(tabs)/calendar.tsx`): the largest and most stateful file. It renders a month grid (via `useCalendarLogic()` from `app/hooks/calendar_logic.ts`, which computes `daysArray` including leading/trailing blanks for a 7-column grid) and drives a stack of modals from a single `activeModal` state machine (`"day" | "addEntry" | "workout" | "meal" | null`) rather than separate boolean flags per modal. Tapping a day opens the "day" modal showing a nutrition/fitness toggle (`activeSummary`) summarizing that date's meals/exercises; the "addEntry" modal branches into "workout" or "meal" entry forms, each with local form state (`workoutFormInfo`, `mealFormInfo`) that's saved directly via the `useDatabase()` insert functions.

**Graphs screen** (`app/(tabs)/graphs.tsx`): renders a line chart with `victory-native`'s `CartesianChart` + `@shopify/react-native-skia`. Metric/timeframe selection uses custom dropdown `View`s (not a native picker). The metric list is `Calories`/`Protein`/`Carbs`/`Fat` plus every distinct name in the `exercises` table (reloaded on `useFocusEffect`, since tab screens stay mounted and a mount-only effect would go stale). Queries go through `getNutritionSeries` / `getExerciseVolumeSeries`, which `GROUP BY date` so days with no entries are absent rather than zero — the chart draws those as gaps. The x axis is a **numeric day offset** from the range start with `formatXLabel` rendering it back to `M/D`; a string date `xKey` would space every point evenly and make gaps invisible.

Tapping a point pins a detail window (date, the labeled value, and for exercises a `sets × reps @ weight` line per logged row from `getExerciseEntriesForDate`). Three non-obvious pieces hold that together:
- `useChartPressState` does the hit-testing; `matchedIndex` and the point's pixel position are mirrored into React state via `useAnimatedReaction` + `runOnJS`, so the window stays pinned after the finger lifts and its text and coordinates can't desync.
- victory-native's built-in press handler is a **Pan**, which only commits a touch after the finger clears the activation slop — a still tap can end without ever registering. A `Gesture.Tap` is raced against it via `customGestures`, calling the same `handleTouch` worklet through `actionsRef` (a `useSharedValue`, not a plain ref, so it's callable from the UI thread).
- The reaction fires only on *change*, so dismissing the window also rewinds `matchedIndex` to `-1` — otherwise re-tapping the just-dismissed point would be a no-op.

The tooltip is a plain RN `View` overlay, not Skia text: Skia's `Text` needs `useFont` with a bundled `.ttf` and this project has no font asset.

**`app/_layout.tsx`** wraps the `Stack` in `GestureHandlerRootView`. It's load-bearing — without it react-native-gesture-handler receives no touches on Android and the graphs chart's selection silently does nothing.

**Styling**: no per-component stylesheets beyond one-offs. `styles/defaultStyle.ts` exports a shared `StyleSheet` (dark theme, `#25292e` background, `#42a6ce` accent) used across screens; `graphs.tsx` additionally defines a local `graphStyle` for its dropdown UI. When adding UI, prefer extending `defaultStyle.ts` over inlining styles, to stay consistent with the rest of the app.

**Path alias**: `@/*` maps to the `fitness-tracker/` root (see `tsconfig.json`), though existing code mostly uses relative imports (e.g. `../../styles/defaultStyle`).

## Known rough edges

- `AddWorkoutForm.tsx` fires `Alert.alert("form opened")` at module scope (runs on import, not on render) and is a mostly unimplemented placeholder still rendered inside the "workout" modal in `calendar.tsx` alongside the real form fields — treat it as a stub, not a component to build on top of without cleanup.
- `app/index.tsx` wipes the `exercises` and `meals` tables on every app start and re-seeds 120 days of fake meals/workouts via `seedDatabase()`, for manual testing. It's guarded by a module-level `seeded` flag so React re-renders don't re-run the inserts. Nothing you log by hand survives an app restart — remove this block before shipping. The `saved_exercises`/`saved_meals` libraries are *not* cleared and persist.
