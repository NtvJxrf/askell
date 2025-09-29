import { Collapse, Typography, Layout, Row, Col } from "antd";
const { Title, Paragraph } = Typography;
const { Panel } = Collapse;
const { Content } = Layout;

export default function InstructionPage() {
  return (
    <Row justify="center" style={{background: 'white'}}>
      <Col xs={24} md={20} lg={18} xl={16}>
        <Title level={2}>Инструкция по работе с калькулятором и MoySklad</Title>

        <Collapse accordion>
          <Panel header="Создание контрагента" key="1">
            <Paragraph>
              
            </Paragraph>
          </Panel>
          <Panel header="Расчёт изделий" key="2">
            <Paragraph>
              - Выбираем вид и толщину стекла согласно заявке клиента.<br />
            </Paragraph>
          </Panel>
        </Collapse>
      </Col>
    </Row>
  );
}
