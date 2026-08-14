import { StyleSheet } from "react-native";

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
  grid :{
    flex: 1,
    flexDirection: "column",
  },
  daysHeader :{
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderColor: "#3a3f45",
  },
  headerCell :{
    flex: 1,
    alignItems: "center",
    textAlign: "center",
    color: "#ffffff",
    height: 25,
  },
  cell :{
    flex: 1,
    alignItems: "center",
    textAlign: "center",
    justifyContent: "center",
    borderWidth: 0.5,
    borderColor: "#3a3f45",
    color: "#ffffff",
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