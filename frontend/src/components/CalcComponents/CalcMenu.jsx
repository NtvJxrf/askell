import { Layout, Menu } from 'antd';
const { Header } = Layout;

const CalcMenu = ({ onChange, selectedKey }) => {
  const items = [
    { label: 'СМД', key: 'SMDForm' },
    { label: 'Стекло', key: 'GlassForm' },
    { label: 'Триплекс', key: 'TriplexForm' },
    { label: 'Керагласс', key: 'CeraglassForm' },
    { label: 'Стеклопакет', key: 'GlassPacket' },
  ];

  return (
    <Header style={{ display: 'flex'}}>
      <Menu
        mode="horizontal"
        selectedKeys={[selectedKey]}
        defaultSelectedKeys={['SMDForm']}
        onClick={(e) => onChange(e.key)}
        items={items}
        theme="dark"
        style={{ flex: 1, minWidth: 0 }}
      />
    </Header>
  );
};

export default CalcMenu;
