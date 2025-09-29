import { Layout, Menu, Button } from 'antd';
import { Link, useLocation  } from "react-router-dom";
import { useDispatch } from 'react-redux';
import { setIsAuth } from '../slices/userSlice.js';
import axios from 'axios';
const { Header } = Layout;
const items = [
    { label: <Link to="/calculators">Калькуляторы</Link>, key: '/calculators' },
    { label: <Link to="/production">Производство</Link>, key: '/production' },
    { label: <Link to="/materials">Материалы</Link>, key: '/materials' },
    { label: <Link to="/settings">Настройки</Link>, key: '/settings' },
    { label: <Link to="/admin">Админ</Link>, key: '/admin' },
    { label: <Link to="/reports">Отчеты</Link>, key: '/reports' },
    { label: <Link to="/manual">Инструкция</Link>, key: '/manual' },
];
const HeaderComponent = () => {
    const location = useLocation();
    const dispatch = useDispatch();
    const handleLogout = async () => {
        await axios.get(`${import.meta.env.VITE_API_URL}/api/logout`, { withCredentials: true })
        dispatch(setIsAuth(false));
    }

    return (
        <Header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            {/* Левая часть — меню */}
            <Menu
                theme="dark"
                mode="horizontal"
                selectedKeys={[location.pathname]}
                items={items}
                style={{ flex: 1, minWidth: 0 }}
            />
            
            {/* Правая часть — кнопка или любой другой элемент */}
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center' }}>
                <Link
                    to="/aovam"
                    style={{
                        marginRight: '72px',
                        opacity: 0.2,
                        textDecoration: 'none',
                        transition: 'opacity 0.3s ease',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.opacity = 0.4)}
                    onMouseLeave={e => (e.currentTarget.style.opacity = 0.2)}
                >
                    ƃuᴉuɐǝɯ puɐ ǝnlɐʌ ɟo ǝɔuǝsqɐ
                </Link>
                <Button onClick={handleLogout}>Выйти</Button>
            </div>
        </Header>
    );
};

export default HeaderComponent;
