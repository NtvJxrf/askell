import { Layout } from "antd"
const { Content } = Layout;
import HeaderComponent from "../components/Header"
import { Routes, Route, Outlet,  } from "react-router-dom";
import CalcsLayout from '../layouts/CalcsLayout.jsx'
import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { setSelfcost } from "../slices/selfcostSlice.js";
import axios from "axios";
const MainLayout = () => {
    const dispatch = useDispatch()
    useEffect(() => {
        const initData = async () => {
            const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/sklad/getSelfcost`, { withCredentials: true })
            dispatch(setSelfcost(response.data))
        }
        initData()
        setInterval(() => {
            initData()
        }, 300_000);
    }, [])

    return (
        <Layout>
            <HeaderComponent />
            <Content>
                <Routes>
                    <Route path="/calculators" element={<CalcsLayout type={'fbort'}/>} />
                </Routes>
                <Outlet />
            </Content>
        </Layout>
    )
}

export default MainLayout