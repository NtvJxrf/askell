import React from 'react';
import { Button } from 'antd';

const SubmitButton = React.memo(({ isDisabled }) => {
    return (
            <Button type="primary" htmlType="submit" size="medium" loading={isDisabled}>
                Рассчитать
            </Button>
    );
});

export default SubmitButton;
