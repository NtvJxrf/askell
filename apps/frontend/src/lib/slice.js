import { configureStore } from "@reduxjs/toolkit";
import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    positions: [],
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
  },
});

export const { setFormValue, setGroupCount, clearForm } = appSlice.actions;
const appReducer = appSlice.reducer;
export const store = configureStore({
  reducer: {
    app: appReducer,
  },
});