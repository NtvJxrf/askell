import { Layout } from "antd"
const { Content } = Layout;
import HeaderComponent from "../components/Header"
import { Routes, Route, Outlet,  } from "react-router-dom";
import CalcsLayout from '../layouts/CalcsLayout.jsx'
const MainLayout = () => {
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