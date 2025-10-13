import { google } from "googleapis";
import { dictionary } from "../services/sklad.service.js";
import Client from "../utils/got.js";
import ApiError from "../utils/apiError.js";

const reclamationRequest = async (dataFromForm) => {
  const order = await Client.sklad(`https://api.moysklad.ru/api/remap/1.2/entity/customerorder/56508553-4474-11f0-0a80-1b74001fc4eb?expand=positions`)
  
  let filter = null;
  if (dataFromForm.positions?.trim()) {
    filter = dataFromForm.positions.split(',').map(item => {
      const [idx, qty] = item.split('-').map(s => parseInt(s, 10));
      return { index: idx - 1, quantity: qty || null };
    });
  }
  const allPositions = order.positions.rows
  const selectedPositions = filter
    ? filter.map(f => {
        const pos = allPositions[f.index];
        if (!pos) return null;
        return {
          quantity: f.quantity ?? pos.quantity,
          price: pos.price,
          discount: pos.discount,
          vat: pos.vat,
          assortment: pos.assortment,
        };
      }).filter(Boolean)
    : allPositions.map(pos => ({
        quantity: pos.quantity,
        price: pos.price,
        discount: pos.discount,
        vat: pos.vat,
        assortment: pos.assortment,
      }));
  const params = {
    name: order.name + '-рекламация',
    positions: selectedPositions,
    organization: order.organization,
    agent: order.agent,
    description: `Рекламация к заказу покупателя № ${order.name}`,
    owner: order.owner,
    attributes: []
  }
  dataFromForm.copyAttrs && (params.attributes = order.attributes)
  dataFromForm.copyDescription && (params.description += `\n${order?.description}` || '')
  params.attributes.push({
    meta: {
      "href" : "https://api.moysklad.ru/api/remap/1.2/entity/customerorder/metadata/attributes/7eaf36bf-a80f-11f0-0a80-163f002be9f9",
      "type" : "attributemetadata",
      "mediaType" : "application/json"
    },
    value: true
  })
  const reclamationOrder = await Client.sklad(`https://api.moysklad.ru/api/remap/1.2/entity/customerorder`, 'post', params)

  return {
    message: `Для заказа ${order.name} создана рекламация`,
    url: reclamationOrder.meta.uuidHref
  };
}

export default reclamationRequest;
