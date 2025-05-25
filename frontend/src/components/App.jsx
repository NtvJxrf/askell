import { useState, useEffect } from "react";
import MainLayout from '../layouts/MainLayout.jsx';
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
// import axios from 'axios'
import { useSelector, useDispatch } from 'react-redux';
import { setIsAuth } from "../slices/userSlice.js";
import LoginPage from '../pages/LoginPage.jsx'
function App() {
    const [loading, setLoading] = useState(true);
    const isAuth = useSelector((state) => state.user.isAuth)
    const dispatch = useDispatch();
    useEffect(() => {
        const checkAuth = () => {
        try {
            const response = { data: { isAuth: true } }
            dispatch(setIsAuth(response.data.isAuth === true))
        }catch{
            dispatch(setIsAuth(false))
        }finally{
            setLoading(false);
        }
        };
        checkAuth();
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
