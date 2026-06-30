import { configureStore } from "@reduxjs/toolkit";
import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    positions: [{name: 'test'}, {name: 'test2'}, {name: 'test3'}],
    planDate: {
      apiDate: null,
      strDate: null
    },
    currentOrder: null,
    forms: {},
    selfcost: {},
    schedule: null,
    heaps: [],
    user: {},
    settings: {},
    triplexArray: []
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
    setPositions(state, action) {
      state.positions = action.payload;
    },
    addPosition(state, action) {
      state.positions.push(action.payload);
    },
    removeTriplexPosition(state, action) {
      const index = action.payload;
      if (index >= 0 && index < state.triplexArray.length) {
        state.triplexArray.splice(index, 1);
      }
    },
    setTriplexPositions(state, action) {
      state.triplexArray = action.payload;
    },
    addTriplexPosition(state, action) {
      state.triplexArray.push(action.payload);
    },
    replaceTriplexPositions(state, action) {
      const { index, item } = action.payload;
      state.triplexArray[index] = item;
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
  setSettings,
  addPosition,
  removeTriplexPosition,
  setTriplexPositions,
  addTriplexPosition,
  replaceTriplexPositions
} = appSlice.actions;
const appReducer = appSlice.reducer;
export const store = configureStore({
  reducer: {
    app: appReducer,
  },
});