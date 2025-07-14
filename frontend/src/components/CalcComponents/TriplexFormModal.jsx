import React, { useRef } from 'react';
import { Modal, Button, Typography, Form } from 'antd';
import TriplexForm from './Forms/TriplexForm.jsx'

const { Title } = Typography;

const TriplexFormModal = ({ open, onCancel, onSubmit }) => {
  const [form] = Form.useForm();

  const handleFinish = (values) => {
    const { height, width, polishing, drills, zenk, cutsv1, cutsv2, cutsv3, tempered, shape, addTape, print, customertype, rounding } = values
    const materials = Object.entries(values).filter(([key, value]) => key.startsWith('material') && value !== undefined).map(([_, value]) => value);
    let name = `Триплекс, ${materials.join(' + ')}, (${height}х${width}${polishing ? ', Полировка' : ''}${tempered ? ', Закаленное' : ''}${cutsv1 ? `, Вырезы 1 кат.: ${cutsv1}` : ''}${cutsv2 ? `, Вырезы 2 кат.: ${cutsv2}` : ''}${cutsv3 ? `, Вырезы 3 кат.: ${cutsv3}` : ''}${drills ? `, Сверление: ${drills}` : ''}${zenk ? `, Зенкование: ${zenk}` : ''})`
    const result = {name, values}
    console.log(result)
    onSubmit(result);
    form.resetFields();
  };

  return (
    <Modal
      open={open}
      onCancel={() => {
        form.resetFields();
        onCancel();
      }}
      footer={null}
      preserve={false}
      style={{ minWidth: 1000 }}
    >
      <Form
        form={form}
        layout="horizontal"
        size='small'
        onFinish={handleFinish}
        initialValues={{
          rounding: 'Округление до 0.5',
          customertype: 'Менее 200 тыс.'
        }}
      >
        <TriplexForm />
        <Form.Item style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
          <Button type="primary" htmlType="submit" size="medium" shape='round'>
            Добавить
          </Button>
          <Button style={{ marginLeft: 12 }} size="medium" shape='round' onClick={() => {
            form.resetFields();
            onCancel();
          }}>
            Отмена
          </Button>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default React.memo(TriplexFormModal);
