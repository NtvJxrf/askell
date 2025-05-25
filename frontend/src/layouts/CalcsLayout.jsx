import {useState} from 'react';
import { Row, Col, Button } from 'antd'
import CalcMenu from '../components/CalcComponents/CalcMenu';
import DynamicForm from '../components/CalcComponents/Forms/DynamicForm';
const CalcsLayout = () => {
    const [selectedKey, setSelectedKey] = useState('SMDForm')

    return (
        <>
            <Row align={'middle'} justify={'center'} gutter={20}>
                <Col span={16}>
                    <CalcMenu onChange={setSelectedKey} selectedKey={selectedKey} />
                    <DynamicForm type={selectedKey}/>
                </Col>
                <Col span={8}>Positions</Col>
            </Row>
        </>
    )
};

export default CalcsLayout