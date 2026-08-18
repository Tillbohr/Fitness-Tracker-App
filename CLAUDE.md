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

**Routing**: Expo Router (file-based). `app/_layout.tsx` is the root `Stack` with `index` (landing page), `(tabs)` (the tab group), `day/[date]` (the day summary screen) and the two saved libraries, `saved/meals` and `saved/exercises`. `app/(tabs)/_layout.tsx` defines the bottom tab bar with three tabs: `calendar`, `graphs`, and `profile`. Everything outside `(tabs)` sits on the root stack on purpose, so it pushes over the tab bar as a full screen and draws its own header.

**Data layer**: `database.ts` at the project root owns two separate SQLite databases opened synchronously via `expo-sqlite` (`exercisesDB` from `exercises.db`, `mealsDB` from `meals.db`), each with its own table (`exercises`, `meals`) created on load. All access goes through the `useDatabase()` hook, which exposes CRUD-style functions (`insertExercise`, `getExercises`, `getExerciseDateInfo`, `insertMeal`, `getMeals`, `getMealDateInfo`, `clearExerciseDatabase`, `clearMealDatabase`). Despite the "use" naming, these are plain synchronous functions, not stateful React hooks — there's no `useState`/`useEffect` inside `useDatabase()`.

Dates are stored/queried as `YYYY-MM-DD` strings. Build them with `toDateString(date)` from `database.ts` rather than re-typing the `padStart` construction, parse them back with `fromDateString` (a bare `new Date('2026-08-12')` reads as UTC and lands on the previous day in western timezones), and format them for display with `formatDateLong` from `utils/dates.ts`.

**Profile screen** (`app/(tabs)/profile.tsx`): a tab root in two `sectionLabel` groups. *Libraries* holds two rows that push the saved libraries; their fills come from `activityColors`, so Profile agrees with the calendar badges and the day summary about which colour is nutrition and which is fitness, and since both fills are light the labels and icons take the dark foreground. It has no back or add button, so its `pageHeader` carries two empty `headerButton` slots to keep the title centred.

*Manage Data* holds the two wipes, "Delete Nutrition Data" (`clearMealDatabase`) and "Delete Exercise Data" (`clearExerciseDatabase`). Both clear only the dated `meals`/`exercises` rows — the `saved_*` tables are separate and deliberately survive. They're outlined in `#d1453b` rather than filled: the solid fill stays reserved for `confirmButtonDanger`, the button that actually commits, so asking and committing don't wear the same treatment. Both route through `components/ConfirmDelete.tsx` — nothing clears on the first tap — and Profile holds `pendingWipe: "nutrition" | "fitness" | null`, one value rather than a boolean per button. Nothing is refreshed afterwards on purpose: Profile shows no counts, and the calendar and graphs reload on their own `useFocusEffect`.

`ConfirmDelete` takes an optional `message` to override its default question, which the wipes need because "Are you sure you want to delete this?" reads oddly for a whole table.

**Saved library screens** (`app/saved/meals.tsx`, `app/saved/exercises.tsx`): the reusable meal/exercise libraries, one screen each, reached only from Profile. They live on the root stack rather than in `(tabs)` and draw the day screen's back / title / add header. Each row carries a trash button, and meal rows also a pencil, both muted Ionicons pinned right by `listRowActions`/`listRowBody`. Delete always routes through `components/ConfirmDelete.tsx` — each screen holds a `pendingDelete` of `{ id, name }`, so the popup can't be open without knowing its target, and the kind is implied by which screen you're on. `confirmBox` sizes to its content rather than reusing `modalBox`'s fixed 80%×80% sheet.

Shared components live in `components/` at the project root next to `styles/` and `utils/`, **not** under `app/` — everything under `app/` is a route to Expo Router.

Editing covers the macros only: `name` is the `UNIQUE` column in both `saved_meals` and `saved_exercises`, and an `UPDATE` onto an existing name throws (inserts get away with it via `INSERT OR IGNORE`). So `updateSavedMeal` takes no name, the edit modal shows the name read-only, and renaming means delete and re-add. That's also why exercise rows have no pencil — an exercise is only a name.

`deleteSavedMeal`/`deleteSavedExercise` remove library entries alone; the dated `meals`/`exercises` rows are separate tables, so logged days keep their data.

**Calendar screen** (`app/(tabs)/calendar.tsx`): renders a month grid and nothing else. Tapping a day pushes `/day/[date]` with the `YYYY-MM-DD` key as the param; the screen holds no per-day state or modals of its own.

`useCalendarLogic()` (`app/hooks/calendar_logic.ts`) returns `weeks`, a 6×7 array of `{ day, inMonth }`. Every month is padded to all six rows — including the 4- and 5-week ones — so row height doesn't change as you page between months. The padding cells aren't blank: they carry the previous month's tail and the next month's head, which `initDaysArray` gets for free by building each cell as `new Date(year, month, offset)` and letting out-of-range day numbers roll over. `inMonth: false` cells render dimmed (`cellTextAdjacent`) and are deliberately inert — no `TouchableOpacity`, no dots, and no today outline.

Each in-month cell stacks a count badge per kind of entry logged that day — amber meals on top, accent-blue exercises below, with the count inside. The counts come from `getMealCountsInRange` / `getExerciseCountsInRange` — two queries, not one, because meals and exercises are separate database files — and are held as `Map<string, number>` so a cell is a lookup rather than a scan. Both `GROUP BY date`, so a day with nothing logged is absent from the map and renders no badge rather than a zero. They reload in a `useFocusEffect` keyed on `[month, year]`, which covers both returning from the day summary after logging and paging to another month; a mount-only effect would go stale, since tab screens stay mounted. The grid is sized by flex, not by measurement: `styles.grid` is `flex: 1` and each `styles.week` row is `flex: 1`, so the six rows divide whatever is left below the two headers and the last row ends flush against the tab bar on any device. An earlier version measured the headers via `onLayout` and divided by a hard-coded 6, which left a blank row on any month shorter than six weeks; don't reintroduce a measured `cellHeight`.

**Day summary screen** (`app/day/[date].tsx`): owns everything for a single date. Its header is back / date / add, and the add button drives an `activeModal` state machine (`"addEntry" | "workout" | "meal" | null`) rather than separate boolean flags per modal; "addEntry" branches into the "workout" or "meal" entry forms, each with local form state (`workoutFormInfo`, `mealFormInfo`) saved via the `useDatabase()` insert functions. An `activeSummary` toggle switches between the nutrition and fitness views.

Unlike the modal this replaced, a screen doesn't remount on every open, so it can't query in render — `meals`/`exercises` live in state, loaded by `loadDay()` on mount and again after each insert. Day totals derive from `meals` by reduce rather than living in their own state.

The nutrition view's macro pie is `victory-native`'s `PolarChart` + `Pie`. Slices are sized by **calorie contribution** (protein×4, carbs×4, fat×9), not grams, so they sum to the day's calories; the gram values are listed beside the chart. Zero-value macros are filtered out of `pieData` (a zero-sweep slice draws nothing but still occupies a legend slot), and a day with no macros at all renders a message instead of the chart rather than a pie with no geometry. `explicitSize` is passed so the chart skips the `onLayout` measure pass and draws on the first frame. Slice colors are a three-hue categorical set validated for colorblind separation against the `#25292e` surface — the app accent `#42a6ce` is deliberately not one of them, as it sits too close to the aqua to distinguish.

**Graphs screen** (`app/(tabs)/graphs.tsx`): renders a line chart with `victory-native`'s `CartesianChart` + `@shopify/react-native-skia`. Metric/timeframe selection uses custom dropdown `View`s (not a native picker). The metric list is `Calories`/`Protein`/`Carbs`/`Fat` plus every distinct name in the `exercises` table (reloaded on `useFocusEffect`, since tab screens stay mounted and a mount-only effect would go stale). Queries go through `getNutritionSeries` / `getExerciseVolumeSeries`, which `GROUP BY date` so days with no entries are absent rather than zero — the chart draws those as gaps. The x axis is a **numeric day offset** from the range start with `formatXLabel` rendering it back to a date; a string date `xKey` would space every point evenly and make gaps invisible. The label format follows the range — `Aug 8` up to 30 days, `M/D` to 180, `Aug '25` beyond. The middle ranges stay numeric on purpose: at 3 months five ticks are ~3 weeks apart, so a month-only label can print the same month twice. `xTickCount()` picks a count that divides the day span evenly where one exists (a 7-day range at 5 ticks would step 1.5 days and read `Aug 8, 10, 11, 13, 14`); spans like 29 or 89 are prime, so those fall back to 5 and the rounded gaps differ by at most a day.

Both axes are titled with plain RN `Text` laid out around the chart — `yAxisTitleFor()` down the left, "Date" beneath — since Skia text would need a bundled font this project doesn't carry. The caption above the chart is still the place for how a value is derived (`sets × reps × weight`), which is too long for an axis title.

The y axis comes from `niceScale()`, not from the data extent — left to fit, victory-native pins the highest point to the top edge and the lowest to the bottom. It pads the range by 12%, snaps the floor to 0 when the padding reaches it (these metrics are never negative), and rounds both ends outward to a 1/2/5 × 10ⁿ step. It returns the tick count with the domain because the two must agree: the axis divides the domain into `tickCount - 1` even intervals, so a mismatched count puts labels on values like 1,500 inside an otherwise clean 0–6,000 range. A single point or a flat series has no span to take a percentage of and gets a band built around its value instead. Per-point dots are dropped above `MAX_DOTS` points, where they merge into a band; the pinned point still draws its own.

Tapping a point pins a detail window (date, the labeled value, and for exercises a `sets × reps @ weight` line per logged row from `getExerciseEntriesForDate`). Three non-obvious pieces hold that together:
- `useChartPressState` does the hit-testing; `matchedIndex` and the point's pixel position are mirrored into React state via `useAnimatedReaction` + `runOnJS`, so the window stays pinned after the finger lifts and its text and coordinates can't desync.
- victory-native's built-in press handler is a **Pan**, which only commits a touch after the finger clears the activation slop — a still tap can end without ever registering. A `Gesture.Tap` is raced against it via `customGestures`, calling the same `handleTouch` worklet through `actionsRef` (a `useSharedValue`, not a plain ref, so it's callable from the UI thread).
- The reaction fires only on *change*, so dismissing the window also rewinds `matchedIndex` to `-1` — otherwise re-tapping the just-dismissed point would be a no-op.

The tooltip is a plain RN `View` overlay, not Skia text: Skia's `Text` needs `useFont` with a bundled `.ttf` and this project has no font asset.

**`app/_layout.tsx`** wraps the `Stack` in `GestureHandlerRootView`. It's load-bearing — without it react-native-gesture-handler receives no touches on Android and the graphs chart's selection silently does nothing.

**Styling**: no per-component stylesheets beyond one-offs. `styles/defaultStyle.ts` exports a shared `StyleSheet` (dark theme, `#25292e` background, `#42a6ce` accent) used across screens.

It also exports `activityColors` — `nutrition: "#d9a441"` (amber), `fitness: "#42a6ce"` (the accent) — the app's one definition of which colour stands for which side. It drives the day summary's nutrition/fitness toggles, the Profile tab's two library buttons, and the calendar's count badges, so those three agree. Both fills are light, so text on them uses `styles.textOnLightFill` (`#25292e`) rather than white; white on amber is only ~1.9:1. Use `activityColors` for any new nutrition-vs-fitness distinction instead of a fresh hex.

`graphs.tsx` additionally defines a local `graphStyle` for its dropdown UI. When adding UI, prefer extending `defaultStyle.ts` over inlining styles, to stay consistent with the rest of the app.

**Path alias**: `@/*` maps to the `fitness-tracker/` root (see `tsconfig.json`), though existing code mostly uses relative imports (e.g. `../../styles/defaultStyle`).

## Known rough edges

- `app/index.tsx` wipes the `exercises` and `meals` tables on every app start and re-seeds 120 days of fake meals/workouts via `seedDatabase()`, for manual testing. It's guarded by a module-level `seeded` flag so React re-renders don't re-run the inserts. Nothing you log by hand survives an app restart — remove this block before shipping. The `saved_exercises`/`saved_meals` libraries are *not* cleared and persist.
