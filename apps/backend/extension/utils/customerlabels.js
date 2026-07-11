import PDFDocument from 'pdfkit'
import QRCode from 'qrcode'
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
        margin: 0
    })

    const fontSize = 14
    doc.fontSize(fontSize).font('Regular')
    const lineH = doc.currentLineHeight(true)

    /* --- Вычисляем позиции снизу вверх --- */
    const sizeY = LABEL_SIZE - MARGIN - lineH
    const qrSize = 25 * MM
    const qrX = LABEL_SIZE - MARGIN - qrSize
    const qrY = LABEL_SIZE - MARGIN - qrSize

    /* --- Рисуем сверху вниз --- */

    // Название
    let y = MARGIN
    const titleHeight = drawFittedText({
        doc,
        text: item.productName,
        x: MARGIN,
        y,
        width: CONTENT_WIDTH,
        maxLines: 3,
        maxFontSize: 12,
        minFontSize: 9
    })
    y += titleHeight + 4

    // Строки информации
    const infoLines = [
        `№ заказа: ${item.orderName}`,
        `Позиция: ${item.positionNumber}`,
        `Особые отметки: ${item.specialMark}`,
        `Производитель: ${item.manufacturer}`,
        `Дата производства: ${item.productionMoment}`,
    ]

    // Ширина для инфо-строк: от левого края до QR с минимальным зазором
    const infoWidth = qrX - MARGIN - 4

    // Каждая строка: рисуем с базовым шрифтом и переносом.
    // Если не влезает в одну строку — уменьшаем шрифт только для этой строки.
    for (const line of infoLines) {
        doc.font('Regular')
        let lineFontSize = fontSize
        while (lineFontSize >= 7) {
            doc.fontSize(lineFontSize)
            const h = doc.heightOfString(line, { width: infoWidth })
            const lh = doc.currentLineHeight(true)
            if (Math.ceil(h / lh) <= 1) break
            lineFontSize -= 0.5
        }
        const lineHeight = doc.heightOfString(line, { width: infoWidth })
        doc.text(line, MARGIN, y, { width: infoWidth })
        y += lineHeight + 2
    }

    // QR код
    const qrPng = await QRCode.toBuffer(item.qrPayload, {
        type: 'png',
        errorCorrectionLevel: 'L',
        margin: 1
    })
    doc.image(qrPng, qrX, qrY, { width: qrSize, height: qrSize })

    // Размер — прижат к низу, уменьшаем шрифт пока не влезет в одну строку
    const sizeWidth = qrX - MARGIN - 4
    const sizeText = `Размер: ${item.size}`
    let sizeFontSize = 12
    while (sizeFontSize >= 6) {
        doc.fontSize(sizeFontSize).font('Regular')
        const h = doc.heightOfString(sizeText, { width: sizeWidth })
        const lh = doc.currentLineHeight(true)
        if (Math.ceil(h / lh) <= 1) break
        sizeFontSize -= 0.5
    }
    const actualSizeY = LABEL_SIZE - MARGIN - doc.currentLineHeight(true)
    doc.text(sizeText, MARGIN, actualSizeY, { width: sizeWidth, lineBreak: false })
}

/* ===== ГЛАВНАЯ ФУНКЦИЯ ===== */

async function generateLabelsPdf({ user, dataFromForm}, ctx) {
    const order = await ctx.call('proxy.sklad', { url: `https://api.moysklad.ru/api/remap/1.2/entity/customerorder/${dataFromForm.id}` })
    const products = await ctx.call('proxy.sklad', { url: `https://api.moysklad.ru/api/remap/1.2/entity/customerorder/${dataFromForm.id}/positions?expand=assortment` })
    const now = new Date();
    const date = String(now.getMonth() + 1).padStart(2, '0') + '-' + now.getFullYear();
    const items = products.rows.map( (el, index) => {
            const attrs = (el.assortment.attributes || []).reduce((a, x) => {
                a[x.name] = x.value;
                return a;
            }, {});
            if(!attrs['Тип изделия']) return null; // Пропускаем позиции без нужного атрибута
            const initialData = JSON.parse(attrs['Детали']).initialData
            const materials = [initialData.material1, initialData.material2, initialData.material3].filter(Boolean)
            const planes = [initialData.plane1, initialData.plane2].filter(Boolean)
            const formula = materials.reduce((acc, material, index) => {
                acc.push(Number(material.match(/(\d+(?:[.,]\d+)?)\s*мм/i)[1]))

                if (planes[index]) {
                    acc.push(Number(planes[index].match(/(\d+(?:[.,]\d+)?)\s*мм/i)[1]))
                }

                return acc
            }, []).join('-')
            const stats = {
                orderName: order.name,
                productName: el.assortment.name,
                positionNumber: index + 1,
                qrPayload: order.meta.uuidHref,
                productionMoment: date,
                specialMark: attrs['Специальная отметка'] || 'Нет',
                manufacturer: 'ASKELL',
                size: `${attrs['Ширина в мм'] || ''} x ${attrs['Длина в мм'] || ''}${formula && `, ${formula}`}`,
                quantity: el.quantity || 1
            }
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
                if (!item) continue;
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