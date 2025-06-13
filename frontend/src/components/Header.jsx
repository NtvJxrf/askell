import { Layout, Menu, Button } from 'antd';
import { Link } from "react-router-dom";
const { Header } = Layout;
const items = [
    { label: <Link to="/calculators">Калькуляторы</Link>, key: 1 },
    { label: <Link to="/proccessing">Производство</Link>, key: 2 },
    { label: <Link to="/materials">Материалы</Link>, key: 3 },
    { label: <Link to="/settings">Настройки</Link>, key: 4 },
    { label: <Link to="/pricesandcoefs">Цены и коэфиценты</Link>, key: 5 },
];
const HeaderComponent = () => {
    return (
        <Header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            {/* Левая часть — меню */}
            <Menu
                theme="dark"
                mode="horizontal"
                defaultSelectedKeys={['1']}
                items={items}
                style={{ flex: 1, minWidth: 0 }}
            />
            
            {/* Правая часть — кнопка или любой другой элемент */}
            <div style={{ marginLeft: 'auto' }}>
                <Button >Выйти</Button>
            </div>
        </Header>
    );
};

export default HeaderComponent;
