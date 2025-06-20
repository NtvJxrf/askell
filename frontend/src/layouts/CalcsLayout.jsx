import { useParams } from 'react-router-dom';
import { Row, Col } from 'antd';
import CalcMenu from '../components/CalcComponents/CalcMenu';
import DynamicForm from '../components/CalcComponents/Forms/DynamicForm';
import Positions from '../components/PositionsComponents/Positions.jsx';
import AdditionalForm from '../components/CalcComponents/AdditionalForm.jsx';
import PositionsHeader from '../components/PositionsComponents/PositionsHeader.jsx';

const typeMap = {
    smd: 'SMDForm',
    glass: 'GlassForm',
    triplex: 'TriplexForm',
    ceraglass: 'CeraglassForm',
    glasspacket: 'GlassPacket',
};

const CalcsLayout = () => {
    const { type } = useParams();
    const selectedKey = typeMap[type] || 'SMDForm';

    return (
        <div style={{ overflowX: 'hidden', width: '100%' }}>
            <Row>
                <Col span={12}>
                    <CalcMenu />
                    <DynamicForm type={selectedKey} />
                    <AdditionalForm />
                </Col>
                <Col span={12}>
                    <PositionsHeader />
                    <Positions />
                </Col>
            </Row>
        </div>
    );
};

export default CalcsLayout;
