import { Row, Col } from 'antd';

const Aovam = () => {
    return (
        <Row
            justify="center"
            align="middle"
            style={{ height: '100vh', backgroundColor: '#f9f9f9' }}
        >
            <Col>
                <img
                    src="/assets/aovam.jpg"
                    alt="AOVAM Visual"
                    style={{ maxWidth: '800px', maxHeight: '700px' }}
                />
            </Col>
        </Row>
    );
};

export default Aovam;
