import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import {
    connectionStatusChanged,
    fetchMarketSnapshot,
    snapshotReceived,
    websocketErrorReceived,
} from './marketSlice';
import type { MarketSnapshot } from './marketTypes';

const WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL ?? 'ws://localhost:3001';

export function useMarketStream() {
    const dispatch = useAppDispatch();
    const isLive = useAppSelector((state) => state.market.isLive);

    useEffect(() => {
        void dispatch(fetchMarketSnapshot());
    }, [dispatch]);

    useEffect(() => {
        if (!isLive) {
            return;
        }

        let isCancelled = false;
        let reconnectTimer: number | undefined;
        let socket: WebSocket | undefined;

        const connect = () => {
            if (isCancelled) {
                return;
            }

            dispatch(connectionStatusChanged('connecting'));

            socket = new WebSocket(`${WS_BASE_URL}/market/stream`);

            socket.onopen = () => {
                dispatch(connectionStatusChanged('connected'));
            };

            socket.onmessage = (event) => {
                const payload = JSON.parse(event.data) as MarketSnapshot | { message: string };

                if ('message' in payload) {
                    dispatch(websocketErrorReceived(payload.message));
                    return;
                }

                dispatch(snapshotReceived(payload));
            };

            socket.onerror = () => {
                dispatch(websocketErrorReceived('Live market connection failed.'));
            };

            socket.onclose = () => {
                dispatch(connectionStatusChanged('disconnected'));

                if (!isCancelled) {
                    reconnectTimer = window.setTimeout(connect, 3000);
                }
            };
        };

        connect();

        return () => {
            isCancelled = true;
            window.clearTimeout(reconnectTimer);
            socket?.close();
        };
    }, [dispatch, isLive]);
}
