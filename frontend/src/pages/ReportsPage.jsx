import React, { useState } from 'react';
import {
  Card,
  Form,
  DatePicker,
  Button,
  message,
  Row,
  Col,
  Input
} from 'antd';
import axios from 'axios';

const { RangePicker } = DatePicker;

const reportConfigs = [
  {
    title: 'Номенклатура',
    type: 'report4',
    fields: [
      {
        name: 'dateRange',
        label: 'Период (Для заказа покупателю(озон))',
        component: <RangePicker />,
        required: true,
      },
      {
        name: 'bindDate',
        label: 'Дата привязки платежа(Для счета покупателю)',
        component: <RangePicker />,
        required: true,
      },
    ]
  },
  {
    title: 'Поиск по техоперациям',
    type: 'report5',
    fields: [
      {
        name: 'dateRange',
        label: 'Период создания техоперации',
        component: <RangePicker />,
        required: true,
      },
      {
        name: 'string',
        label: 'Искомое слово',
        component: <Input />,
        required: true,
      },
    ]
  },
];

const Reports = () => {
  const [messageApi, contextHolder] = message.useMessage();
  const [loading, setLoading] = useState(false);

  // ✅ Хуки вызываются безопасно
  const formInstances = reportConfigs.map(() => Form.useForm());

  const handleSubmit = async (type, form) => {
    setLoading(true);

    try {
      const values = await form.validateFields();
      const filters = { ...values };

      // Обработка dateRange
      if (filters.dateRange) {
        filters.startDate = filters.dateRange[0].format('YYYY-MM-DD');
        filters.endDate = filters.dateRange[1].format('YYYY-MM-DD');
        delete filters.dateRange;
      }

      // Обработка bindDate
      if (filters.bindDate) {
        filters.bindStart = filters.bindDate[0].format('YYYY-MM-DD');
        filters.bindEnd = filters.bindDate[1].format('YYYY-MM-DD');
        delete filters.bindDate;
      }

      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/reports/create`,
        { type, filters },
        {
          withCredentials: true,
          responseType: 'blob',
        }
      );

      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'report.xlsx';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      messageApi.success(`Отчет "${type}" сгенерирован`);
    } catch (error) {
      messageApi.error(`Ошибка при генерации отчета "${type}"`);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 24 }}>
      {contextHolder}
      <h2>Отчеты</h2>
      <Row gutter={[16, 16]}>
        {reportConfigs.map((report, index) => {
          const [form] = formInstances[index];

          return (
            <Col xs={24} md={12} key={report.type}>
              <Card title={report.title} variant="outlined">
                <Form layout="vertical" form={form}>
                  {report.fields.map((field) => (
                    <Form.Item
                      key={field.name}
                      name={field.name}
                      label={field.label}
                      rules={
                        field.required
                          ? [{ required: true, message: `Поле "${field.label}" обязательно` }]
                          : []
                      }
                    >
                      {field.component}
                    </Form.Item>
                  ))}
                  <Form.Item>
                    <Button
                      type="primary"
                      onClick={() => handleSubmit(report.type, form)}
                      disabled={loading}
                    >
                      Сформировать
                    </Button>
                  </Form.Item>
                </Form>
              </Card>
            </Col>
          );
        })}
      </Row>
    </div>
  );
};

export default Reports;
