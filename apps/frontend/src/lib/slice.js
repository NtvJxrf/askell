import { configureStore } from "@reduxjs/toolkit";
import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    positions: [{name: 'test'}, {name: 'test2'}, {name: 'test3'}],
    planDate: {
      apiDate: null,
      strDate: null
    },
    currentOrder: null,
    // Per-calculator form state, keyed by tab id (formId). Each entry looks like
    //   { values: { [fieldName]: any }, groups: { [groupName]: number } }
    // Entries are created lazily on first interaction. Because `store` is a
    // module singleton, this state survives client-side navigation between pages
    // — so each calculator keeps its own values independently and nothing leaks
    // between product types.
    forms: {},
    selfcost: null,
    schedule: null,
    heaps: [],
    user: {},
    settings: {}
};

// Make sure a form bucket exists before writing to it (Immer-friendly).
function ensureForm(state, formId) {
  if (!state.forms[formId]) {
    state.forms[formId] = { values: {}, groups: {} };
  }
  return state.forms[formId];
}

const appSlice = createSlice({
  name: "app",
  initialState,
  reducers: {
    // Set a single field's value for one form (formId = calculator tab id).
    setFormValue(state, action) {
      const { formId, name, value } = action.payload;
      ensureForm(state, formId).values[name] = value;
    },
    // Set the repeatable-group count (e.g. Триплекс «ПФ» stack) for one form.
    setGroupCount(state, action) {
      const { formId, name, count } = action.payload;
      ensureForm(state, formId).groups[name] = count;
    },
    // Reset one form back to empty; controlled fields then fall back to their
    // configured defaults.
    clearForm(state, action) {
      const { formId } = action.payload;
      state.forms[formId] = { values: {}, groups: {} };
    },
    setOrder(state, action) {
      state.currentOrder = action.payload;
    },
    // Remove one position from the table by its index in the array.
    removePosition(state, action) {
      const index = action.payload;
      if (index >= 0 && index < state.positions.length) {
        state.positions.splice(index, 1);
      }
    },
    // Move a position from one index to another (drag-and-drop reordering).
    reorderPositions(state, action) {
      const { from, to } = action.payload;
      const list = state.positions;
      if (
        from === to ||
        from < 0 || from >= list.length ||
        to < 0 || to >= list.length
      ) {
        return;
      }
      const [moved] = list.splice(from, 1);
      list.splice(to, 0, moved);
    },
    setPositions(state, action) {
      state.positions = action.payload;
    },
    // Toggle the `selected` flag of one position (kept on the position object
    // so selection travels with it through reordering / deletion).
    togglePositionSelected(state, action) {
      const position = state.positions[action.payload];
      if (position) {
        position.selected = !position.selected;
      }
    },
    // Set the quantity for one position by its index. `quantity` may be a number
    // or null (empty input).
    setPositionQuantity(state, action) {
      const { index, quantity } = action.payload;
      const position = state.positions[index];
      if (position) {
        position.quantity = quantity;
      }
    },
    // Select or deselect every position at once (header checkbox).
    setAllPositionsSelected(state, action) {
      const value = action.payload;
      for (const position of state.positions) {
        position.selected = value;
      }
    },
    setSelfcost(state, action) {
      state.selfcost = action.payload;
    },
    setSchedule(state, action) {
      state.schedule = action.payload;
    },
    setHeaps(state, action) {
      state.heaps = action.payload;
    },
    setUser(state, action) {
      state.user = action.payload;
    },
    setSettings(state, action) {
      state.settings = action.payload;
    }
  }
});

export const {
  setFormValue,
  setGroupCount,
  clearForm,
  setOrder,
  removePosition,
  reorderPositions,
  togglePositionSelected,
  setAllPositionsSelected,
  setPositions,
  setPositionQuantity,
  setSelfcost,
  setSchedule,
  setHeaps,
  setUser,
  setSettings
} = appSlice.actions;
const appReducer = appSlice.reducer;
export const store = configureStore({
  reducer: {
    app: appReducer,
  },
});