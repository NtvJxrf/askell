import { Layout } from "antd";
import { Routes, Route, Navigate } from "react-router-dom";
import { useEffect } from "react";
import { useDispatch } from "react-redux";

import HeaderComponent from "../components/Header";
import CalcsLayout from "../layouts/CalcsLayout.jsx";
import PricesAndCoefsPage from "../pages/PricesAndCoefsPage.jsx";
import Init from "../init.js";
import Aovam from "../pages/Aovam.jsx"
import Settings from '../pages/Settings.jsx';
import ProtectedRoute from "../components/ProtectedRoute.jsx";
import AdminPage from "../pages/AdminPage.jsx";
import NotFoundPage from "../pages/NotFoundPage.jsx";
import ActivatePage from "../pages/ActivatePage.jsx";
import ReportsPage from '../pages/ReportsPage.jsx'
import ProductionPage from "../pages/ProductionPage.jsx";
import WebSocketHandler from "../ws.jsx";
const MainLayout = () => {
    const dispatch = useDispatch();

    useEffect(() => {
        Init.getSelfcost(dispatch);
    }, [dispatch]);

    return (
        <Layout>
            <HeaderComponent />
            <Routes>
                <Route path="/calculators">
                    <Route index element={<Navigate to="/calculators/smd" replace />} />
                    <Route path=":type" element={<CalcsLayout />} />
                </Route>
                <Route path="/admin" element={
                    <ProtectedRoute requiredRoles={['none']}>
                        <AdminPage />
                    </ProtectedRoute>
                }/>
                <Route path="/pricesandcoefs" element={<PricesAndCoefsPage />} />
                <Route path="/production" element={<ProductionPage />} />
                <Route path="/aovam" element={<Aovam />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/activate" element={<ActivatePage />} />
                <Route path="/reports" element={<ReportsPage />} />
                {/* fallback */}
                <Route path="*" element={<NotFoundPage />} />
            </Routes>
            <WebSocketHandler />
        </Layout>
    );
};

export default MainLayout;
