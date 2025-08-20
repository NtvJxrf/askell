import React, { useEffect } from 'react';
import { Modal, Button, Form } from 'antd';
import CeraglassForm from '../CalcComponents/Forms/CeraglassForm.jsx';
import GlassForm from '../CalcComponents/Forms/glassForm.jsx';
import GlasspacketForm from '../CalcComponents/Forms/GlasspacketForm.jsx';
import SMDForm from '../CalcComponents/Forms/SMDForm.jsx';
import TriplexForm from '../CalcComponents/Forms/TriplexForm.jsx';

import triplexCalc from '../CalcComponents/calculators/triplexCalc.js'
import ceraglassCalc from '../CalcComponents/calculators/ceraglassCalc.js'
import glassCalc from '../CalcComponents/calculators/glassCalc.js'
import SMDCalc from '../CalcComponents/calculators/SMDCalc.js'
import glasspacketCalc from '../CalcComponents/calculators/glasspacketCalc.js'
import store from '../../store.js'
const EditPositionModal = ({ open, onClose, record, onSubmit }) => {
    if(!record || !record.result) return null
    const [form] = Form.useForm();
    useEffect(() => {
        if (record) {
            form.setFieldsValue(record.initialData);
        }
    }, [record, form]);
    const map = {
        'СМД': SMDForm,
        'Стекло': GlassForm,
        'Триплекс': TriplexForm,
        'Керагласс': CeraglassForm,
        'Стеклопакет': GlasspacketForm,
    }
    const calcMap = {
        'СМД': SMDCalc,
        'Стекло': glassCalc,
        'Триплекс': triplexCalc,
        'Керагласс': ceraglassCalc,
        'Стеклопакет': glasspacketCalc,
    }
    const onFinish = (res) => {
        const selfcost = store.getState().selfcost.selfcost
        const calcRes = calcMap[record.result.other.type](res, selfcost)
        form.resetFields();
        onSubmit(calcRes)
    }
    const CurrentForm = map[record.result.other.type]
    return (
        <Modal
        open={open}
        onCancel={() => {
            form.resetFields();
            onClose()
        }}
        footer={null}
        preserve={false}
        style={{ minWidth: 1000 }}
        >
        <Form
            form={form}
            layout="horizontal"
            size='small'
            onFinish={onFinish}
            initialValues={record.initialData}
        >
            <CurrentForm />
            <Form.Item style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
            <Button type="primary" htmlType="submit" size="medium" shape='round'>
                Сохранить
            </Button>
            <Button style={{ marginLeft: 12 }} size="medium" shape='round' onClick={() => {
                form.resetFields();
                onClose()
            }}>
                Отмена
            </Button>
            </Form.Item>
        </Form>
        </Modal>
    );
};

export default React.memo(EditPositionModal);
