import { Layout } from "antd"
const { Content } = Layout;
import HeaderComponent from "../components/Header"
import { Routes, Route, Outlet,  } from "react-router-dom";
import CalcsLayout from '../layouts/CalcsLayout.jsx'
import { useEffect } from "react";
import { useDispatch } from "react-redux";
import PricesAndCoefsLayout from '../layouts/PricesAndCoefsLayout.jsx'
import Init from "../init.js";
const MainLayout = () => {
    const dispatch = useDispatch()
    useEffect(() => {
        Init.getSelfcost(dispatch)
    }, [dispatch])

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