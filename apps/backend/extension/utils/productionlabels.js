import PDFDocument from 'pdfkit'
import QRCode from 'qrcode'
import SVGtoPDF from 'svg-to-pdfkit'
import path from 'path'
import { fileURLToPath } from 'url'

/* ===== Пути ===== */

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const fontPath = path.resolve(__dirname, '../../../../fonts/DejaVuSans.ttf')
const fontBoldPath = path.resolve(__dirname, '../../../../fonts/DejaVuSans-Bold.ttf')
/* ===== Размеры ===== */

const MM = 2.83465
const LABEL_MM = 100
const LABEL_SIZE = LABEL_MM * MM

const MARGIN = 8
const CONTENT_WIDTH = LABEL_SIZE - MARGIN * 2

/* ===== Автоподгонка текста ===== */

function drawFittedText({
  doc,
  text,
  x,
  y,
  width,
  maxLines,
  maxFontSize,
  minFontSize,
  lineGap = 1
}) {
  let fontSize = maxFontSize

  while (fontSize >= minFontSize) {
    doc.fontSize(fontSize)

    const height = doc.heightOfString(text, { width, lineGap })
    const lineHeight = doc.currentLineHeight(true)
    const lines = Math.ceil(height / lineHeight)

    if (lines <= maxLines) {
      doc.text(text, x, y, {
        width,
        align: 'center',
        lineGap
      })
      return height
    }

    fontSize -= 0.5
  }

  doc.fontSize(minFontSize).text(text, x, y, {
    width,
    align: 'center',
    lineGap,
    ellipsis: true
  })

  return doc.heightOfString(text, { width })
}

/* ===== Одна этикетка (одна страница) ===== */

async function drawLabelPage(doc, item) {
    doc.addPage({
        size: [LABEL_SIZE, LABEL_SIZE],
        margin: MARGIN
    })

    let y = MARGIN

    const titleHeight = drawFittedText({
        doc,
        text: item.productName,
        x: MARGIN,
        y,
        width: CONTENT_WIDTH,
        maxLines: 3,
        maxFontSize: 12,
        minFontSize: 10
    })

    y += titleHeight + 4

    doc.fontSize(12)

    doc.font('Regular').text(`Получатель: ${item.agent}`, MARGIN, y, {
        width: CONTENT_WIDTH
    })

    y += doc.currentLineHeight(true)
    
    doc.font('Regular').text('№ заказа покупателя: ', MARGIN, y, {
        continued: true
    })

    doc.fontSize(17).font('Bold').text(item.orderName, {
        width: CONTENT_WIDTH
    })

    doc.fontSize(12).font('Regular')

    y += doc.currentLineHeight(true)

    doc.fontSize(12).text(`№ производственного задания: ${item.taskName}`, MARGIN, y, {
        width: CONTENT_WIDTH
    })

    y += doc.currentLineHeight(true)

    doc.fontSize(12).text(`№ позиции в заказе: ${item.positionNumber}`, MARGIN, y, {
        width: CONTENT_WIDTH
    })

    y += doc.currentLineHeight(true)

    doc.fontSize(12).text(`Марк.: ${item.mark}`, MARGIN, y, {
        width: CONTENT_WIDTH
    })

    y += doc.currentLineHeight(true)

    doc.fontSize(12).text(`Количество: ${item.quantity}`, MARGIN, y, {
        width: CONTENT_WIDTH
    })

    y += doc.currentLineHeight(true)

    doc.fontSize(12).text(`Дата готовности: ${item.deliveryPlannedMoment?.split(' ')?.[0] || null}`, MARGIN, y, {
        width: CONTENT_WIDTH
    })

    y += doc.currentLineHeight(true) + 6

    const qrSize = 35 * MM
    const qrX = (LABEL_SIZE - qrSize) / 2

    const qrSvg = await QRCode.toString(item.qrPayload, {
        type: 'svg',
        errorCorrectionLevel: 'M'
    })

    SVGtoPDF(doc, qrSvg, qrX, y, {
        width: qrSize,
        height: qrSize
    })

    const stampSize = 20
    const stampX = LABEL_SIZE - MARGIN - stampSize
    const stampY = LABEL_SIZE - MARGIN - stampSize

    doc
        .dash(3, { space: 2 })
        .lineWidth(0.8)
        .rect(stampX, stampY, stampSize, stampSize)
        .stroke()
        .undash()
}

/* ===== ГЛАВНАЯ ФУНКЦИЯ ===== */

async function generateLabelsPdf({ user, dataFromForm}, ctx) {
    const task = await ctx.call('proxy.sklad', { url: `https://api.moysklad.ru/api/remap/1.2/entity/productiontask/${dataFromForm.id}` })
    const products = await ctx.call('proxy.sklad', { url: `https://api.moysklad.ru/api/remap/1.2/entity/productiontask/${dataFromForm.id}/products?expand=assortment` })
    const orders = await ctx.call('proxy.sklad', { url: `https://api.moysklad.ru/api/remap/1.2/entity/customerorder?filter=name=${task.attributes.find( att => att.name == '№ заказа покупателя')?.value}&expand=positions.assortment&limit=100` })
    const order = [...(orders.rows || [])].sort((left, right) => {
        const leftTime = new Date(left?.moment || 0).getTime()
        const rightTime = new Date(right?.moment || 0).getTime()
        return rightTime - leftTime
    })[0]
    const items = products.rows.map( (el, index) => { 
            const url = new URL(el.productionRow.meta.uuidHref);
            const params = new URLSearchParams(url.hash.split('?')[1]);
            const id = params.get("id");
            const stats = {
                orderName: task.attributes.find( att => att.name == '№ заказа покупателя')?.value || '',
                taskName: task.name,
                productName: el.assortment.name,
                code: el.assortment.code,
                qrPayload: `https://mskld.ru/ent/productionrow/${id}`,
                quantity: el.planQuantity,
                deliveryPlannedMoment: task.deliveryPlannedMoment,
                agent: task.attributes.find( att => att.name == 'Получатель')?.value?.name || ''
            }
            const attrs = (el.assortment.attributes || []).reduce((a, x) => {
                a[x.name] = x.value;
                return a;
            }, {});
            const positionNumber = order.positions.rows.findIndex(as => as.assortment.id == (attrs['Принадлежит позиции'] || el.assortment.id)) + 1
            stats.mark = attrs['Маркировка'] || 'Нет'
            stats.positionNumber = positionNumber || 'Не обнаружено совпадений'
            return stats
        })
    return new Promise(async (resolve, reject) => {
        try {
            const doc = new PDFDocument({ autoFirstPage: false })

            const chunks = []
            doc.on('data', chunk => chunks.push(chunk))
            doc.on('end', () => {
                resolve(Buffer.concat(chunks))
            })

            doc.registerFont('Regular', fontPath)
            doc.registerFont('Bold', fontBoldPath)
            doc.font('Regular')

            for (const item of items) {
                for (let i = 0; i < item.quantity; i++) {
                    await drawLabelPage(doc, item)
                }
            }
            doc.end()
        } catch (err) {
            reject(err)
        }
    })
}
export default generateLabelsPdf