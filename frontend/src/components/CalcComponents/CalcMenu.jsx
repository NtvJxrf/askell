import { Layout, Menu } from 'antd';
import { Link, useLocation } from 'react-router-dom';

const { Header } = Layout;

const CalcMenu = () => {
  const location = useLocation();

  const items = [
    { label: <Link to="/calculators/smd">СМД</Link>, key: 'smd' },
    { label: <Link to="/calculators/glass">Стекло</Link>, key: 'glass' },
    { label: <Link to="/calculators/triplex">Триплекс</Link>, key: 'triplex' },
    { label: <Link to="/calculators/ceraglass">Керагласс</Link>, key: 'ceraglass' },
    { label: <Link to="/calculators/glasspacket">Стеклопакет</Link>, key: 'glasspacket' },
    { label: <Link to="/calculators/ClientGlassTempering">Закалка</Link>, key: 'ClientGlassTempering' },
  ];

  // Выделение по текущему пути
  const selected = location.pathname.split('/')[2];

  return (
    <Header style={{ display: 'flex' }}>
      <Menu
        mode="horizontal"
        selectedKeys={[selected]}
        items={items}
        theme="dark"
        style={{ flex: 1, minWidth: 0 }}
      />
    </Header>
  );
};

export default CalcMenu;
