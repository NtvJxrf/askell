import { useParams } from 'react-router-dom';
import { Row, Col } from 'antd';
import CalcMenu from '../components/CalcComponents/CalcMenu';
import DynamicForm from '../components/CalcComponents/Forms/DynamicForm';
import Positions from '../components/PositionsComponents/Positions.jsx';
import PositionsHeader from '../components/PositionsComponents/PositionsHeader.jsx';
import { Form } from "antd";
const typeMap = {
    smd: 'SMDForm',
    glass: 'GlassForm',
    triplex: 'TriplexForm',
    ceraglass: 'CeraglassForm',
    glasspacket: 'GlassPacketForm',
};

const CalcsLayout = () => {
    const { type } = useParams();
    const selectedKey = typeMap[type] || 'SMDForm';
    const [form] = Form.useForm();
    return (
        <div style={{ overflowX: 'hidden', width: '100%' }}>
            <Row>
                <Col span={12}>
                    <CalcMenu />
                    <DynamicForm type={selectedKey} form={form}/>
                </Col>
                <Col span={12}>
                    <PositionsHeader />
                    <Positions form={form}/>
                </Col>
            </Row>
        </div>
    );
};

export default CalcsLayout;
