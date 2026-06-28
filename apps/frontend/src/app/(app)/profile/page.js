'use client'
import { useState } from "react";
import { Button } from "@/components/ui/button";
export default function PrintOrders() {
  const [ordersFolder, setOrdersFolder] = useState(null);

  const selectFolder = async () => {
    try {
      const handle = await window.showDirectoryPicker();
      setOrdersFolder(handle);
    } catch (err) {
      console.error(err);
    }
  };
  console.log(ordersFolder)
const printOrder = async (orderNumber) => {
  if (!ordersFolder) {
    alert("Сначала выберите папку заказов");
    return;
  }

  let orderFolder = null;

  for await (const entry of ordersFolder.values()) {
    if (entry.kind === "directory" && entry.name === orderNumber) {
      orderFolder = entry;
      break;
    }
  }

  if (!orderFolder) {
    alert(`Заказ ${orderNumber} не найден`);
    return;
  }

  const images = [];

  for await (const entry of orderFolder.values()) {
    if (entry.kind !== "file") continue;

    const ext = entry.name.split(".").pop().toLowerCase();

    if (!["jpg", "jpeg", "png", "bmp", "gif", "webp"].includes(ext)) {
      continue;
    }

    const file = await entry.getFile();
    images.push({
      name: entry.name,
      url: URL.createObjectURL(file),
    });
  }

  if (!images.length) {
    alert("Изображения не найдены");
    return;
  }

  // Чтобы файлы шли по порядку
  images.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

  const printWindow = window.open("", "_blank");

  if (!printWindow) {
    alert("Браузер заблокировал окно печати");
    return;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Печать ${orderNumber}</title>

        <style>
          @page {
            margin: 0;
            size: auto;
          }

          html, body {
            margin: 0;
            padding: 0;
          }

          .page {
            page-break-after: always;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
          }

          .page:last-child {
            page-break-after: auto;
          }

          img {
            max-width: 100%;
            max-height: 100vh;
            object-fit: contain;
          }
        </style>
      </head>

      <body>
        ${images
          .map(
            ({ url }) => `
              <div class="page">
                <img src="${url}" />
              </div>
            `
          )
          .join("")}
      </body>
    </html>
  `);

  printWindow.document.close();

  // Ждем загрузки всех изображений
  const waitImages = () =>
    new Promise((resolve) => {
      const imgs = printWindow.document.images;

      let loaded = 0;

      if (imgs.length === 0) resolve();

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

  await waitImages();

  printWindow.focus();
  printWindow.print();

  // После печати закрыть окно
  printWindow.onafterprint = () => {
    images.forEach((img) => URL.revokeObjectURL(img.url));
    printWindow.close();
  };
};

  return (
    <div>
      <Button onClick={selectFolder}>
        Выбрать папку заказов
      </Button>

      <Button
        disabled={!ordersFolder}
        onClick={() => printOrder("12035")}
      >
        Печать заказа 12035
      </Button>
    </div>
  );
}