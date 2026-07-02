import QRCode from "qrcode";

const LABEL_SIZE_MM = 100;

const formatDate = (moment) => {
  if (!moment) return "";

  const date = new Date(moment);

  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleDateString("ru-RU");
};

const escapeHtml = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[char]));

// Один физический экземпляр детали (piece) -> одна этикетка
const buildLabelItems = (groups = []) => {
  const items = [];

  groups.forEach((group, groupIndex) => {
    const source = group.source || {};
    const positionNumber = groupIndex + 1;

    (group.pieces || []).forEach(() => {
      items.push({
        productName: source.name || "Без названия",
        agent: source.taskAttrs?.["Получатель"] || "",
        orderName: source.orderNumber || "",
        taskName: source.docName || "",
        positionNumber,
        mark: source.mark || "Нет",
        quantity: group.count,
        deliveryPlannedMoment: formatDate(source.deliveryPlannedMoment),
        qrPayload: source.productionRowId
          ? `https://mskld.ru/ent/productionrow/${source.productionRowId}`
          : "",
      });
    });
  });

  return items;
};

const renderLabelHtml = (item, qrDataUrl) => `
  <div class="label">
    <div class="title">${escapeHtml(item.productName)}</div>
    <div class="line">Получатель: ${escapeHtml(item.agent)}</div>
    <div class="line">№ заказа покупателя: <span class="order">${escapeHtml(item.orderName)}</span></div>
    <div class="line">№ производственного задания: ${escapeHtml(item.taskName)}</div>
    <div class="line">Марк.: ${escapeHtml(item.mark)}</div>
    <div class="line">Дата готовности: ${escapeHtml(item.deliveryPlannedMoment)}</div>
    ${qrDataUrl ? `<img class="qr" src="${qrDataUrl}" alt="qr" />` : ""}
  </div>
`;

const waitForImages = (printWindow) =>
  new Promise((resolve) => {
    const imgs = printWindow.document.images;

    if (imgs.length === 0) {
      resolve();
      return;
    }

    let loaded = 0;

    for (const img of imgs) {
      if (img.complete) {
        loaded++;
        if (loaded === imgs.length) resolve();
      } else {
        img.onload = img.onerror = () => {
          loaded++;
          if (loaded === imgs.length) resolve();
        };
      }
    }
  });

// Печать этикеток по деталям раскроя (одна физическая деталь = одна этикетка)
export async function printLabels(groups = []) {
  const items = buildLabelItems(groups);

  if (items.length === 0) {
    throw new Error("Нет деталей для печати этикеток");
  }

  const printWindow = window.open("", "_blank");

  if (!printWindow) {
    throw new Error("Браузер заблокировал окно печати");
  }

  const qrDataUrls = await Promise.all(
    items.map((item) =>
      item.qrPayload
        ? QRCode.toDataURL(item.qrPayload, { errorCorrectionLevel: "M", margin: 0 })
        : Promise.resolve(null)
    )
  );

  const labelsHtml = items.map((item, index) => renderLabelHtml(item, qrDataUrls[index])).join("");

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Печать этикеток</title>
        <meta charset="utf-8" />
        <style>
          @page {
            size: ${LABEL_SIZE_MM}mm ${LABEL_SIZE_MM}mm;
            margin: 0;
          }

          html, body {
            margin: 0;
            padding: 0;
          }

          * {
            box-sizing: border-box;
            font-family: Arial, sans-serif;
          }

          .label {
            position: relative;
            width: ${LABEL_SIZE_MM}mm;
            height: ${LABEL_SIZE_MM}mm;
            padding: 6mm;
            page-break-after: always;
            overflow: hidden;
          }

          .label:last-child {
            page-break-after: auto;
          }

          .title {
            font-size: 11pt;
            line-height: 1.15;
            font-weight: bold;
            text-align: center;
            margin-bottom: 2mm;
          }

          .line {
            font-size: 9pt;
            line-height: 1.15;
            margin-bottom: 1mm;
          }

          .order {
            font-size: 12pt;
            font-weight: bold;
          }

          .qr {
            display: block;
            width: 30mm;
            height: 30mm;
            margin: 2mm auto 0;
          }
        </style>
      </head>
      <body>
        ${labelsHtml}
      </body>
    </html>
  `);

  printWindow.document.close();

  await waitForImages(printWindow);

  printWindow.focus();
  printWindow.print();

  printWindow.onafterprint = () => {
    printWindow.close();
  };
}
