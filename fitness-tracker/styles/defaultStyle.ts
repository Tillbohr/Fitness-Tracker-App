import { StyleSheet } from "react-native";

// The two sides of the app, colour-coded consistently wherever they're shown
// side by side: the day summary's nutrition/fitness toggles and the calendar's
// meal/exercise count badges. Both fills are light enough that text sitting on
// them uses textOnLightFill rather than white.
export const activityColors = {
  nutrition: "#d9a441",
  fitness: "#42a6ce",
};

export const styles = StyleSheet.create({
    container: {
    flex: 1,
    backgroundColor: "#25292e",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    textAlign: "center",
    color: "#ffffff",
    justifyContent: "space-between",
    paddingTop: 20,
    paddingBottom: 40,
    paddingHorizontal: 8,
  },
  text: {
    color: "#ffffff",
  },
  // For text sitting on one of the activityColors fills - roughly twice the
  // contrast white manages against amber.
  textOnLightFill: {
    color: "#25292e",
  },
  // Six week rows share the height left over below the two headers, so the grid
  // ends flush against the tab bar without measuring anything.
  grid :{
    flex: 1,
    flexDirection: "column",
  },
  week: {
    flex: 1,
    flexDirection: "row",
  },
  daysHeader :{
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderColor: "#3a3f45",
  },
  // Same muted uppercase treatment as sectionLabel. Height comes from the
  // padding so the label can't be clipped at a larger font scale.
  headerCell :{
    flex: 1,
    textAlign: "center",
    color: "#8a9199",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
    paddingVertical: 8,
  },
  // Top-aligned rather than centred, so the day number keeps a fixed position
  // and the activity dots have room beneath it.
  cell :{
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-start",
    paddingTop: 6,
    borderWidth: 0.5,
    borderColor: "#3a3f45",
  },
  cellText: {
    color: "#ffffff",
    fontSize: 14,
  },
  // Days spilling in from the previous or next month, dimmed well below the
  // muted grey used for secondary text so they read as context, not content.
  cellTextAdjacent: {
    color: "#6b7280",
  },
  // One badge per kind of entry logged that day, stacked under the day number
  // with meals on top.
  badgeStack: {
    alignItems: "center",
    marginTop: 3,
  },
  // minWidth rather than a fixed width so a two-digit count widens the circle
  // into a pill instead of overflowing it.
  countBadge: {
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 3,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  // Pairs with textOnLightFill for the colour; only the sizing lives here.
  countBadgeText: {
    fontSize: 10,
    fontWeight: "700",
  },
  // Today keeps the plain cell layout and only swaps its border to the accent.
  // Slightly thicker than the 0.5 grid hairline so the outline reads as
  // deliberate rather than as an artifact of the neighbouring borders.
  cellToday: {
    borderWidth: 1.5,
    borderColor: "#42a6ce",
  },
  modalBox: {
    width: "80%",
    height: "80%",
    backgroundColor: "#25292e",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#3a3f45",
    overflow: "hidden",
  },
  // Between modalBox and confirmBox: sizes to its content like a confirmation,
  // but stops growing at 80% so a long saved-entry list scrolls instead of
  // running off the screen. Used by the steps of the day screen's add flow,
  // where a two-button chooser inside modalBox's fixed sheet is mostly dead
  // space.
  modalSheet: {
    width: "80%",
    maxHeight: "80%",
    backgroundColor: "#25292e",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#3a3f45",
    overflow: "hidden",
  },
  // Unlike modalBox, which is a fixed 80% x 80% sheet, a confirmation sizes to
  // its own content - a fixed-height box around two lines of text reads as a
  // mistake.
  confirmBox: {
    width: "80%",
    backgroundColor: "#25292e",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#3a3f45",
    padding: 20,
  },
  confirmText: {
    color: "#ffffff",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 6,
  },
  confirmSubject: {
    color: "#8a9199",
    fontSize: 13,
    textAlign: "center",
    marginBottom: 18,
  },
  confirmButtonRow: {
    flexDirection: "row",
    gap: 10,
  },
  confirmButton: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#3a3f45",
    alignItems: "center",
  },
  // Read-only field in the edit form: same box as inputTextBox, but muted so it
  // doesn't look like something you can type into.
  readOnlyTextBox: {
    borderWidth: 1,
    borderColor: "#3a3f45",
    borderRadius: 8,
    marginBottom: 16,
    fontSize: 14,
    color: "#8a9199",
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#2f353b",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#3a3f45",
  },
  modalSmallHeader: {
    padding: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: "#3a3f45",
  },
  entryButton: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#3a3f45",
    width: "80%",
    alignSelf: "center",
    marginVertical: 8,
  },
  // An entryButton carrying a leading icon. The icon and label are centred as a
  // pair rather than the icon being pinned left, so the two read as one label.
  entryButtonRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  // Sizing only - the colour comes from text or textOnLightFill depending on
  // whether the button is filled, the same split as countBadgeText.
  entryButtonLabel: {
    fontSize: 16,
    fontWeight: "600",
  },
  // Padding around a sheet's stack of buttons. modalBox's fixed height used to
  // supply this by accident; a content-sized sheet has to ask for it.
  modalBody: {
    paddingVertical: 12,
  },
  // Padding around a sheet's form fields, which otherwise sit flush against the
  // box border.
  modalForm: {
    padding: 16,
  },
  toggleButton: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#3a3f45",
    flex: 1,
    alignItems: "center",
    marginHorizontal: 4,
  },
  // Header for a full screen (day summary), as opposed to modalHeader which sits
  // inside a modalBox. Same three-slot back / title / action layout.
  pageHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#3a3f45",
  },
  pageTitle: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "600",
  },
  // Fixed width so the title stays centred between the two icon buttons even
  // though only one of them renders an icon of a given size.
  headerButton: {
    width: 32,
    alignItems: "center",
  },
  toggleRow: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  // Macro figures on the left, pie on the right.
  macroRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  macroList: {
    flex: 1,
    paddingRight: 12,
  },
  heroNumber: {
    color: "#ffffff",
    fontSize: 32,
    fontWeight: "700",
  },
  heroLabel: {
    color: "#8a9199",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 12,
  },
  macroItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  // Doubles as the pie's legend swatch - identity is never carried by the slice
  // colour alone, since the name and gram value sit right beside it.
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  macroName: {
    color: "#ffffff",
    fontSize: 14,
    flex: 1,
  },
  macroValue: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
  macroPercent: {
    color: "#8a9199",
    fontSize: 12,
    width: 44,
    textAlign: "right",
  },
  pieWrap: {
    width: 150,
    height: 150,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionLabel: {
    color: "#8a9199",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  toggleHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#3a3f45",
  },
  listRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: "#3a3f45",
  },
  // A listRow that carries edit/delete buttons: the text block takes the space
  // left over so the icons stay pinned to the right edge.
  listRowActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  listRowBody: {
    flex: 1,
  },
  // Padding plus hitSlop on the touchable brings a 20px icon up to a comfortable
  // tap target without making the row taller.
  rowAction: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  listRowTitle: {
    color: "#ffffff",
    fontSize: 16,
    marginBottom: 4,
  },
  listRowDetail: {
    color: "#8a9199",
    fontSize: 12,
  },
  emptyListText: {
    color: "#8a9199",
    textAlign: "center",
    marginTop: 32,
  },
  fieldLabel: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  inputTextBox: {
    borderWidth: 1,
    borderColor: "#3a3f45",
    borderRadius: 8,
    padding: 8,
    marginBottom: 16,
    fontSize: 14,
    color: "#ffffff",
    paddingHorizontal: 12,
    paddingVertical: 10,
  }
});