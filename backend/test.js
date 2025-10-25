import Client from './src/utils/got.js';
import dotenv from 'dotenv';
import Details from './src/databases/models/sklad/details.model.js';

dotenv.config();

const details = await Details.findAll();

// Разбиваем массив на чанки по 900 элементов
function chunkArray(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}
console.log('Всего записей: ', details.length)
const chunks = chunkArray(details, 900);
const promises = []
console.log('Всего будет запросов: ', promises.length)
for (const [index, chunk] of chunks.entries()) {
  console.log(`Отправляем партию ${index + 1} из ${chunks.length}...`);

  const payload = chunk.map(el => ({
    meta: {
      href: `https://api.moysklad.ru/api/remap/1.2/entity/product/${el.productId}`,
      metadataHref: "https://api.moysklad.ru/api/remap/1.2/entity/product/metadata",
      type: "product",
      mediaType: "application/json"
    },
    attributes: [
      {
        meta: {
          href: "https://api.moysklad.ru/api/remap/1.2/entity/product/metadata/attributes/97c9d19a-ae6f-11f0-0a80-082b000da4e9",
          type: "attributemetadata",
          mediaType: "application/json"
        },
        value: JSON.stringify({
          initialData: el.initialData,
          result: el.result
        })
      }
    ]
  }));

  try {
    promises.push(Client.sklad('https://api.moysklad.ru/api/remap/1.2/entity/product', 'post', payload ))
  } catch (err) {
    console.error(`❌ Ошибка при отправке партии ${index + 1}:`, err.message);
  }
}
const res = await Promise.allSettled(promises)
console.log(res.length);