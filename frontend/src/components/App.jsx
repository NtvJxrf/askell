import { useState, useEffect } from "react";
import MainLayout from '../layouts/MainLayout.jsx';
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import axios from 'axios'
import { useSelector, useDispatch } from 'react-redux';
import { setIsAuth } from "../slices/userSlice.js";
import LoginPage from '../pages/LoginPage.jsx'
function App() {
    const [loading, setLoading] = useState(true);
    const isAuth = useSelector((state) => state.user.isAuth)
    const dispatch = useDispatch();
    useEffect(() => {
        const checkAuth = async () => {
            try {
                const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/isAuthenticated`, {
                    withCredentials: true,
                })
                dispatch(setIsAuth(response.data.auth === true))
            }catch(error){
                console.error(error)
                dispatch(setIsAuth(false))
            }finally{
                setLoading(false);
            }
        };
        checkAuth();
        const intervalId = setInterval(checkAuth, 5 * 60 * 1000); // Каждые 5 минут

        return () => clearInterval(intervalId);
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
                path="/*"
                element={isAuth ? <MainLayout /> : <Navigate to="/login" replace />}
            />
            </Routes>
        </Router>
    );
}

export default App;
