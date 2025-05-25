import React from 'react';
import { Form, Button } from 'antd';

const ResetButton = React.memo(({ handleClearForm }) => {
    return (
            <Button type="primary" size="medium" onClick={handleClearForm}>
                Очистить форму
            </Button>
    );
});

export default ResetButton;
