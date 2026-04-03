import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { MarketSnapshot } from './marketTypes';

type MarketState = {
    snapshot: MarketSnapshot | null;
    status: 'idle' | 'loading' | 'succeeded' | 'failed';
    connectionStatus: 'disconnected' | 'connecting' | 'connected';
    error: string | null;
};

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3001';

const initialState: MarketState = {
    snapshot: null,
    status: 'idle',
    connectionStatus: 'disconnected',
    error: null,
};

export const fetchMarketSnapshot = createAsyncThunk(
    'market/fetchSnapshot',
    async (): Promise<MarketSnapshot> => {
        const response = await fetch(`${API_BASE_URL}/market/snapshot`);

        if (!response.ok) {
            throw new Error('Unable to load the market snapshot.');
        }

        return await response.json() as MarketSnapshot;
    },
);

const marketSlice = createSlice({
    name: 'market',
    initialState,
    reducers: {
        snapshotReceived(state, action: PayloadAction<MarketSnapshot>) {
            state.snapshot = action.payload;
            state.status = 'succeeded';
            state.error = null;
        },
        connectionStatusChanged(state, action: PayloadAction<MarketState['connectionStatus']>) {
            state.connectionStatus = action.payload;
        },
        websocketErrorReceived(state, action: PayloadAction<string>) {
            state.error = action.payload;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchMarketSnapshot.pending, (state) => {
                state.status = 'loading';
                state.error = null;
            })
            .addCase(fetchMarketSnapshot.fulfilled, (state, action) => {
                state.snapshot = action.payload;
                state.status = 'succeeded';
                state.error = null;
            })
            .addCase(fetchMarketSnapshot.rejected, (state, action) => {
                state.status = 'failed';
                state.error = action.error.message ?? 'Unable to load market snapshot.';
            });
    },
});

export const {
    connectionStatusChanged,
    snapshotReceived,
    websocketErrorReceived,
} = marketSlice.actions;

export const marketReducer = marketSlice.reducer;
