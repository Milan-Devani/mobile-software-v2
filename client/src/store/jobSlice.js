import { createSlice } from '@reduxjs/toolkit';

const jobSlice = createSlice({
  name: 'jobs',
  initialState: {
    activeStatusFilter: 'ALL',
    searchQuery: '',
    selectedTechnician: '',
    sortBy: 'created_at',
    sortDir: 'desc',
    refreshKey: 0,
  },
  reducers: {
    setStatusFilter: (state, action) => {
      state.activeStatusFilter = action.payload;
    },
    setSearchQuery: (state, action) => {
      state.searchQuery = action.payload;
    },
    setTechnicianFilter: (state, action) => {
      state.selectedTechnician = action.payload;
    },
    setSorting: (state, action) => {
      state.sortBy = action.payload.sortBy;
      state.sortDir = action.payload.sortDir || 'desc';
    },
    triggerRefresh: (state) => {
      state.refreshKey += 1;
    },
  },
});

export const {
  setStatusFilter,
  setSearchQuery,
  setTechnicianFilter,
  setSorting,
  triggerRefresh,
} = jobSlice.actions;

export default jobSlice.reducer;
