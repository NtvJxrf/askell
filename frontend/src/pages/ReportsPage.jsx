import React, { useState } from 'react';
import { Card, Form, DatePicker, Button, message, Row, Col } from 'antd';
import axios from 'axios';
import * as XLSX from 'xlsx';
import store from '../store'
import triplexCalc from '../components/CalcComponents/calculators/triplexCalc.js'
import ceraglassCalc from '../components/CalcComponents/calculators/ceraglassCalc.js'
import glassCalc from '../components/CalcComponents/calculators/glassCalc.js'
import SMDCalc from '../components/CalcComponents/calculators/SMDCalc.js'
import glasspacketCalc from '../components/CalcComponents/calculators/glasspacketCalc.js'
import { calc } from 'antd/es/theme/internal';
const { RangePicker } = DatePicker;

const calcMap = {
    TriplexForm: triplexCalc,
    CeraglassForm: ceraglassCalc,
    GlassForm: glassCalc,
    SMDForm: SMDCalc,
    GlassPacketForm: glasspacketCalc
}

const reportConfigs = [
  {
    title: 'Номенклатура',
    type: 'report4',
    fields: [
      {
        name: 'dateRange',
        label: 'Период',
        component: <RangePicker />,
        required: true,
      },
    ],
    description: `Формирует отчет по стеклу`
  }
];
const createPrice = () => {
  const selfcost = store.getState().selfcost.selfcost
  const materials = selfcost.materials
  const filterWrods = ['стекло', 'зеркало'];
  const materialsArray = Object.keys(materials).filter(el => filterWrods.some(word => el.toLowerCase().includes(word))).sort()
  const res = [['Материал', 'Толщина', 'Станок', 'Выше госта', 'Розница', 'Опт', 'Дилер', 'ВИП']];
  const calcs = {}
  const fmt = p => Math.ceil(p);
  for(const material of materialsArray){
    let tempered = true
    if(material.toLowerCase().includes('зеркало')) tempered = false
    const straight = glassCalc({material, height: 1000, width: 1000, tempered, shape: true}, selfcost)
    const curved = glassCalc({material, height: 1000, width: 1000, tempered}, selfcost)
    const parts = material.split(',')
    const materialName = parts[0]
    const thickness = parts[1].match(/(\d+(?:\.\d+)?)/)[1]
    calcs[materialName] || (calcs[materialName] = {})
    calcs[materialName][thickness] = {C: curved.prices, S: straight.prices}
  }
  for(const material in calcs){
    res.push([material])
    for(const thickness in calcs[material]){
      const Cprices = Object.values(calcs[material][thickness].C).map(p => fmt(p))
      const Sprices = Object.values(calcs[material][thickness].S).map(p => fmt(p))
      res.push(['', thickness])
      res.push(['', '', 'Прямолинейка', ...Sprices])
      res.push(['', '', 'Криволинейка', ...Cprices])
    }
  }
  const worksheet = XLSX.utils.aoa_to_sheet(res)
  const works = glassCalc({material: materialsArray[0], height: 1000, width: 1000, tempered: true, shape: true, drills: 1, zenk: 1, cutsv1: 1, cutsv2: 1, cutsv3: 1, print: true}, selfcost)
  worksheet['!merges'] = worksheet['!merges'] || [];
  worksheet['!merges'].push(XLSX.utils.decode_range('K2:P10'));
  
  worksheet['K2'] = { t: 's', s: { alignment: { wrapText: true, vertical: 'top', horizontal: 'left' } }, v: `Цены на доп услуги:
  Сверление: ${fmt(works.result.works.find(el => el.name == 'Сверление').finalValue)}
  Зенковка: ${fmt(works.result.works.find(el => el.name == 'Зенковка').finalValue)}
  Вырез в стекле 1 кат: ${fmt(works.result.works.find(el => el.name == 'Вырез в стекле 1 кат').finalValue)}
  Вырез в стекле 2 кат: ${fmt(works.result.works.find(el => el.name == 'Вырез в стекле 2 кат').finalValue)}
  Вырез в стекле 3 кат: ${fmt(works.result.works.find(el => el.name == 'Вырез в стекле 3 кат').finalValue)}` }
  
  // Создаём workbook и добавляем лист
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Лист1");
  const range = XLSX.utils.decode_range(worksheet['!ref']);
  range.e.c = Math.max(range.e.c, 10);
  range.e.r = Math.max(range.e.r, 1);
  worksheet['!ref'] = XLSX.utils.encode_range(range);
  // Сохраняем файл
  XLSX.writeFile(workbook, "Прайс.xlsx");
}
const Reports = () => {
  const [messageApi, contextHolder] = message.useMessage();
  const [loading, setLoading] = useState(false);

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

      const response = await axios.post( `${import.meta.env.VITE_API_URL}/api/reports/create`, { type, filters }, { withCredentials: true, responseType: 'blob'});

      const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

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
        <Col xs={24} md={8}>
          <Card title={'Прайс на стекло'} variant="outlined">
            <div style={{ display: 'flex', gap: 16 }}>
              <Button type="primary" onClick={createPrice} >
                Сформировать
              </Button>
              <div style={{ flex: 1 }}>
                <p>Формирует прайс на стекло и доп услуги</p>
              </div>
            </div>
          </Card>
        </Col>

        {reportConfigs.map((report, index) => {
          const [form] = formInstances[index];

          return (
            <Col xs={24} md={8} key={report.type}>
              <Card title={report.title} variant="outlined">
                <div style={{ display: 'flex', gap: 16 }}>
                  <Form layout="vertical" form={form} style={{ flex: 1 }}>
                    {report.fields.map((field) => (
                      <Form.Item
                        key={field.name}
                        name={field.name}
                        label={field.label}
                        rules={ field.required ? [{ required: true, message: `Поле "${field.label}" обязательно` }] : [] }
                      >
                        {field.component}
                      </Form.Item>
                    ))}
                    <Form.Item>
                      <Button type="primary" onClick={() => handleSubmit(report.type, form)} disabled={loading} >
                        Сформировать
                      </Button>
                    </Form.Item>
                  </Form>
                  <div style={{ flex: 1 }}>
                    <p>{report.description}</p>
                  </div>
                </div>
              </Card>
            </Col>
          );
        })}
      </Row>
    </div>
  );
};

export default Reports;
