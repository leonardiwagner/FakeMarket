import { createBrowserRouter } from 'react-router-dom';
import { MarketPage } from '../features/market/MarketPage';

export const router = createBrowserRouter([
    {
        path: '/',
        element: <MarketPage />,
    },
]);
