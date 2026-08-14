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

**Routing**: Expo Router (file-based). `app/_layout.tsx` is the root `Stack` with three screens: `index` (landing page), `(tabs)` (the tab group), and `day/[date]` (the day summary screen). `app/(tabs)/_layout.tsx` defines the bottom tab bar with three tabs: `calendar`, `graphs`, and `saved`. `day/[date]` sits on the root stack rather than inside `(tabs)`, so it pushes over the tab bar as a full screen and draws its own header.

**Data layer**: `database.ts` at the project root owns two separate SQLite databases opened synchronously via `expo-sqlite` (`exercisesDB` from `exercises.db`, `mealsDB` from `meals.db`), each with its own table (`exercises`, `meals`) created on load. All access goes through the `useDatabase()` hook, which exposes CRUD-style functions (`insertExercise`, `getExercises`, `getExerciseDateInfo`, `insertMeal`, `getMeals`, `getMealDateInfo`, `clearExerciseDatabase`, `clearMealDatabase`). Despite the "use" naming, these are plain synchronous functions, not stateful React hooks — there's no `useState`/`useEffect` inside `useDatabase()`.

Dates are stored/queried as `YYYY-MM-DD` strings. Build them with `toDateString(date)` from `database.ts` rather than re-typing the `padStart` construction, parse them back with `fromDateString` (a bare `new Date('2026-08-12')` reads as UTC and lands on the previous day in western timezones), and format them for display with `formatDateLong` from `utils/dates.ts`.

**Calendar screen** (`app/(tabs)/calendar.tsx`): renders a month grid (via `useCalendarLogic()` from `app/hooks/calendar_logic.ts`, which computes `daysArray` including leading/trailing blanks for a 7-column grid) and nothing else. Tapping a day pushes `/day/[date]` with the `YYYY-MM-DD` key as the param; the screen holds no per-day state or modals of its own.

**Day summary screen** (`app/day/[date].tsx`): owns everything for a single date. Its header is back / date / add, and the add button drives an `activeModal` state machine (`"addEntry" | "workout" | "meal" | null`) rather than separate boolean flags per modal; "addEntry" branches into the "workout" or "meal" entry forms, each with local form state (`workoutFormInfo`, `mealFormInfo`) saved via the `useDatabase()` insert functions. An `activeSummary` toggle switches between the nutrition and fitness views.

Unlike the modal this replaced, a screen doesn't remount on every open, so it can't query in render — `meals`/`exercises` live in state, loaded by `loadDay()` on mount and again after each insert. Day totals derive from `meals` by reduce rather than living in their own state.

The nutrition view's macro pie is `victory-native`'s `PolarChart` + `Pie`. Slices are sized by **calorie contribution** (protein×4, carbs×4, fat×9), not grams, so they sum to the day's calories; the gram values are listed beside the chart. Zero-value macros are filtered out of `pieData` (a zero-sweep slice draws nothing but still occupies a legend slot), and a day with no macros at all renders a message instead of the chart rather than a pie with no geometry. `explicitSize` is passed so the chart skips the `onLayout` measure pass and draws on the first frame. Slice colors are a three-hue categorical set validated for colorblind separation against the `#25292e` surface — the app accent `#42a6ce` is deliberately not one of them, as it sits too close to the aqua to distinguish.

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

- `app/index.tsx` wipes the `exercises` and `meals` tables on every app start and re-seeds 120 days of fake meals/workouts via `seedDatabase()`, for manual testing. It's guarded by a module-level `seeded` flag so React re-renders don't re-run the inserts. Nothing you log by hand survives an app restart — remove this block before shipping. The `saved_exercises`/`saved_meals` libraries are *not* cleared and persist.
