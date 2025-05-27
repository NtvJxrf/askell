import React, { useState } from 'react';
import { Button } from 'antd';

const SubmitButton = ({ form, onFinish }) => {
    const [isLoading, setIsLoading] = useState(false);
    
    const handleClick = async () => {
        setIsLoading(true);
        try {
            const values = await form.validateFields()
            await onFinish(values); 
        } catch (error) {
            console.error('Ошибка валидации или выполнения onFinish:', error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Button type="primary" size="medium" loading={isLoading} onClick={handleClick}>
            Рассчитать
        </Button>
    );
};

export default React.memo(SubmitButton);
