import cors from 'cors';
import express, { type NextFunction, type Request, type Response } from 'express';
import { createServer } from 'node:http';
import { URL } from 'node:url';
import { WebSocket, WebSocketServer } from 'ws';
import { getMarketSnapshot } from './services/marketSnapshotService';

const PORT = Number(process.env.PORT ?? 3001);
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN ?? 'http://localhost:5173';
const STREAM_PATH = '/market/stream';
const POLL_INTERVAL_MS = Number(process.env.MARKET_POLL_INTERVAL_MS ?? 3000);

const app = express();
const server = createServer(app);
const websocketServer = new WebSocketServer({ server, path: STREAM_PATH });
const clientFilters = new Map<WebSocket, string | undefined>();

app.use(cors({
    origin: CLIENT_ORIGIN,
}));

app.get('/health', (_request, response) => {
    response.json({ ok: true });
});

app.get('/market/snapshot', async (_request, response, next) => {
    try {
        const snapshot = await getMarketSnapshot();
        response.json(snapshot);
    } catch (error) {
        next(error);
    }
});

app.get('/market/:resourceId/snapshot', async (request, response, next) => {
    try {
        const snapshot = await getMarketSnapshot(request.params.resourceId);
        response.json(snapshot);
    } catch (error) {
        next(error);
    }
});

websocketServer.on('connection', async (socket, request) => {
    try {
        const url = new URL(request.url ?? STREAM_PATH, `http://${request.headers.host ?? 'localhost'}`);
        const resourceId = url.searchParams.get('resourceId') ?? undefined;
        clientFilters.set(socket, resourceId);
        const snapshot = await getMarketSnapshot(resourceId);
        socket.send(JSON.stringify(snapshot));
    } catch (error) {
        socket.send(JSON.stringify({
            message: error instanceof Error ? error.message : 'Unable to load market snapshot.',
        }));
        socket.close();
    }

    socket.on('close', () => {
        clientFilters.delete(socket);
    });
});

setInterval(async () => {
    if (websocketServer.clients.size === 0) {
        return;
    }

    const snapshotsByResourceId = new Map<string, string>();

    for (const client of websocketServer.clients) {
        if (client.readyState !== WebSocket.OPEN) {
            continue;
        }

        try {
            const resourceId = clientFilters.get(client) ?? '__all__';

            if (!snapshotsByResourceId.has(resourceId)) {
                const snapshot = await getMarketSnapshot(resourceId === '__all__' ? undefined : resourceId);
                snapshotsByResourceId.set(resourceId, JSON.stringify(snapshot));
            }

            client.send(snapshotsByResourceId.get(resourceId)!);
        } catch (error) {
            client.send(JSON.stringify({
                message: error instanceof Error ? error.message : 'Unable to refresh market snapshot.',
            }));
        }
    }
}, POLL_INTERVAL_MS);

app.use((error: unknown, _request: Request, response: Response, _next: NextFunction) => {
    const message = error instanceof Error ? error.message : 'Unexpected error.';
    response.status(500).json({ message });
});

server.listen(PORT, () => {
    console.log(`Market API listening on http://localhost:${PORT}`);
    console.log(`WebSocket stream available at ws://localhost:${PORT}${STREAM_PATH}`);
});
