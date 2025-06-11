import { Layout } from "antd"
const { Content } = Layout;
import HeaderComponent from "../components/Header"
import { Routes, Route, Outlet,  } from "react-router-dom";
import CalcsLayout from '../layouts/CalcsLayout.jsx'
import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { setSelfcost, setPricesAndCoefs } from "../slices/selfcostSlice.js";
import PricesAndCoefsLayout from '../layouts/PricesAndCoefsLayout.jsx'
import axios from "axios";
const MainLayout = () => {
    const dispatch = useDispatch()
    useEffect(() => {
        const initData = async () => {
            try{
                const selfcostResponse = await axios.get(`${import.meta.env.VITE_API_URL}/api/sklad/getSelfcost`, { withCredentials: true })
                dispatch(setSelfcost(selfcostResponse.data))
            }catch (err) {
                console.error('Ошибка при получении себестоимости:', err);
            }
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
                    <Route path="/calculators" element={<CalcsLayout />} />
                    <Route path="/pricesandcoefs" element={<PricesAndCoefsLayout />} />
                </Routes>
                <Outlet />
            </Content>
        </Layout>
    )
}

export default MainLayout