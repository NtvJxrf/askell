import { Layout } from "antd";
import { Routes, Route, Navigate } from "react-router-dom";
import { useEffect } from "react";
import { useDispatch } from "react-redux";

import HeaderComponent from "../components/Header";
import CalcsLayout from "../layouts/CalcsLayout.jsx";
import PricesAndCoefsPage from "../pages/PricesAndCoefsPage.jsx";
import Init from "../init.js";
import Aovam from "../pages/Aovam.jsx"
import Settings from '../components/CalcComponents/Settings.jsx';
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

                <Route path="/pricesandcoefs" element={<PricesAndCoefsPage />} />
                <Route path="/aovam" element={<Aovam />} />
                <Route path="/settings" element={<Settings />} />
                {/* fallback */}
                <Route path="*" element={<div>Empty</div>} />
            </Routes>
        </Layout>
    );
};

export default MainLayout;
