import {useState} from 'react';
import { Row, Col, Button } from 'antd'
import CalcMenu from '../components/CalcComponents/CalcMenu';
import DynamicForm from '../components/CalcComponents/Forms/DynamicForm';
import Positions from '../components/Positions.jsx'
const CalcsLayout = () => {
    const [selectedKey, setSelectedKey] = useState('SMDForm')

    return (
        <>
            <Row gutter={24}>
                <Col span={12}>
                    <CalcMenu onChange={setSelectedKey} selectedKey={selectedKey} />
                    <DynamicForm type={selectedKey}/>
                </Col>
                <Col span={12}><Positions /></Col>
            </Row>
        </>
    )
};

export default CalcsLayout