// nesting-optimal.js
const SHEET_WIDTH = 500;
const SHEET_HEIGHT = 300;

const rectangles = [
  { id: 'A', width: 100, height: 200 },
  { id: 'B', width: 200, height: 50 },
  { id: 'C', width: 120, height: 80 },
  { id: 'D', width: 50, height: 150 },
  { id: 'E', width: 60, height: 60 },
  { id: 'F', width: 90, height: 130 },
  { id: 'G', width: 100, height: 100 },
];

// Возвращает размеры в лучшей ориентации (оригинал или повёрнутый)
function bestFitOrientation(rect) {
  const orientations = [
    { ...rect, rotated: false },
    { ...rect, width: rect.height, height: rect.width, rotated: true },
  ];
  return orientations;
}

function ffdhNest(rects, sheetWidth, sheetHeight) {
  // Получить все варианты ориентации
  let allVariants = rects.flatMap(bestFitOrientation);

  // Сортируем по высоте (decreasing)
  allVariants.sort((a, b) => b.height - a.height);

  const placements = [];
  const shelves = []; // полосы по y

  for (const rect of allVariants) {
    let placed = false;

    for (const shelf of shelves) {
      if (
        shelf.y + rect.height <= sheetHeight &&
        shelf.x + rect.width <= sheetWidth &&
        rect.height <= shelf.height
      ) {
        placements.push({
          ...rect,
          x: shelf.x,
          y: shelf.y,
        });

        shelf.x += rect.width;
        placed = true;
        break;
      }
    }

    if (!placed) {
      const newY =
        shelves.length === 0
          ? 0
          : shelves[shelves.length - 1].y + shelves[shelves.length - 1].height;

      if (newY + rect.height > sheetHeight) {
        console.warn(`❌ Не помещается: ${rect.id}`);
        continue;
      }

      const newShelf = {
        x: rect.width,
        y: newY,
        height: rect.height,
      };

      placements.push({
        ...rect,
        x: 0,
        y: newY,
      });

      shelves.push(newShelf);
    }
  }

  return placements;
}

const result = ffdhNest(rectangles, SHEET_WIDTH, SHEET_HEIGHT);

console.log('📐 Размещение с поворотами:');
for (const r of result) {
  const note = r.rotated ? ' (повёрнут)' : '';
  console.log(`🧱 ${r.id}: (${r.x}, ${r.y}) — ${r.width}x${r.height}${note}`);
}
