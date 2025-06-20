import { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import axios from "axios";

import MainLayout from "../layouts/MainLayout.jsx";
import LoginPage from "../pages/LoginPage.jsx";
import { setIsAuth } from "../slices/userSlice.js";

function App() {
    const [loading, setLoading] = useState(true);
    const isAuth = useSelector((state) => state.user.isAuth);
    const dispatch = useDispatch();

    useEffect(() => {
        let isMounted = true;

        const checkAuth = async () => {
            try {
                const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/isAuthenticated`, {
                    withCredentials: true,
                });
                if (isMounted) {
                    dispatch(setIsAuth(response.data.auth === true));
                }
            } catch (error) {
                console.error("Ошибка при проверке авторизации:", error);
                if (isMounted) {
                    dispatch(setIsAuth(false));
                }
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        checkAuth();
        const intervalId = setInterval(checkAuth, 5 * 60 * 1000); // каждые 5 минут

        return () => {
            clearInterval(intervalId);
            isMounted = false;
        };
    }, [dispatch]);

    if (loading) {
        return <div>Loading...</div>;
    }

    return (
        <Router>
            <Routes>
                <Route
                    path="/login"
                    element={!isAuth ? <LoginPage /> : <Navigate to="/" replace />}
                />
                <Route
                    path="/"
                    element={isAuth ? <Navigate to="/calculators" replace /> : <Navigate to="/login" replace />}
                />
                <Route
                    path="/*"
                    element={isAuth ? <MainLayout /> : <Navigate to="/login" replace />}
                />
            </Routes>
        </Router>
    );
}

export default App;
