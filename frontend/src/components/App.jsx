import { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import ActivatePage from "../pages/ActivatePage.jsx";
import MainLayout from "../layouts/MainLayout.jsx";
import LoginPage from "../pages/LoginPage.jsx";
import Init from "../init.js";

function App() {
    const [loading, setLoading] = useState(true);
    const isAuth = useSelector((state) => state.user.isAuth);
    const dispatch = useDispatch();

    useEffect(() => {
        Init.checkAuth(dispatch, setLoading);
        Init.getProductionLoad(dispatch, setLoading)
        const authId = setInterval(() => Init.checkAuth(dispatch, setLoading), 5 * 60 * 1000); // каждые 5 минут
        const loadId = setInterval(() => Init.getProductionLoad(dispatch, setLoading), 5 * 60 * 1000); // каждые 5 минут
        return () => {
            clearInterval(authId);
            clearInterval(loadId);
        };
    }, [dispatch]);

    if (loading) {
        return <div>Loading...</div>;
    }

    return (
        <Router>
            <Routes>
                <Route path="/login" element={!isAuth ? <LoginPage /> : <Navigate to="/" replace />} />
                <Route path="/activate" element={<ActivatePage />} />
                <Route path="/" element={isAuth ? <Navigate to="/calculators" replace /> : <Navigate to="/login" replace />} />
                <Route path="/*" element={isAuth ? <MainLayout /> : <Navigate to="/login" replace />} />
            </Routes>
        </Router>
    );
}

export default App;
