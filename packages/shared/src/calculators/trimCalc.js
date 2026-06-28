function optimizeCuts(stockPanelSize, cutPieces, options = {}, material = 'Неизвестно') {
  const {
    minUsefulWaste = 300,
    minBreakableSize = 100
  } = options;
  if (!cutPieces || cutPieces.length === 0) {
    throw new Error('No cut pieces provided');
  }

  if (!stockPanelSize || !stockPanelSize.width || !stockPanelSize.height) {
    throw new Error('Stock panel size must have width and height properties');
  }

  const layouts = [];
  const offcuts = [];
  let remainingPieces = [];

  // Expand cut pieces based on quantity
  cutPieces.forEach(piece => {
    for (let i = 0; i < piece.quantity; i++) {
      remainingPieces.push({
        ...piece,
        uniqueId: `${piece.id}-${i}`,
        originalId: piece.id
      });
    }
  });

  // Sort pieces by area (largest first) for better packing
  remainingPieces.sort((a, b) => (b.width * b.height) - (a.width * a.height));

  // Detect pieces that cannot fit into the stock panel in any orientation
  const unplaceable = [];
  remainingPieces = remainingPieces.filter(piece => {
    const fitsNormal = piece.width <= stockPanelSize.width && piece.height <= stockPanelSize.height;
    const fitsRotated = piece.height <= stockPanelSize.width && piece.width <= stockPanelSize.height;
    if (!fitsNormal && !fitsRotated) {
      unplaceable.push({ ...piece });
      return false;
    }
    return true;
  });
  if(unplaceable.length > 0)
    throw new Error(`Some pieces cannot fit into the stock panel: ${unplaceable.map(p => p.id).join(', ')}`);
  // Place pieces in panels (infinite supply)
  let panelIndex = 0;
  
  while (remainingPieces.length > 0) {
    const layout = {
      id: `panel-${panelIndex++}`,
      stockWidth: stockPanelSize.width,
      stockHeight: stockPanelSize.height,
      pieces: [],
      waste: 0
    };

    // Free rectangles algorithm for bin packing
    const freeRectangles = [{
      x: 0,
      y: 0,
      width: stockPanelSize.width,
      height: stockPanelSize.height
    }];

    while (freeRectangles.length > 0 && remainingPieces.length > 0) {
      let bestFit = null;
      let bestPieceIndex = -1;
      let bestRectIndex = -1;
      let bestRotated = false;

      // Find best piece-rectangle combination
      for (let r = 0; r < freeRectangles.length; r++) {
        const rect = freeRectangles[r];

        for (let p = 0; p < remainingPieces.length; p++) {
          const piece = remainingPieces[p];

          // Try normal orientation
          if (piece.width <= rect.width && piece.height <= rect.height) {
            const fit = (rect.width * rect.height) - (piece.width * piece.height);
            if (bestFit === null || fit < bestFit) {
              bestFit = fit;
              bestPieceIndex = p;
              bestRectIndex = r;
              bestRotated = false;
            }
          }

          // Try rotated orientation
          if (piece.height <= rect.width && piece.width <= rect.height) {
            const fit = (rect.width * rect.height) - (piece.height * piece.width);
            if (bestFit === null || fit < bestFit) {
              bestFit = fit;
              bestPieceIndex = p;
              bestRectIndex = r;
              bestRotated = true;
            }
          }
        }
      }

      if (bestPieceIndex === -1) break;

      const piece = remainingPieces[bestPieceIndex];
      const rect = freeRectangles[bestRectIndex];

      const placedWidth = bestRotated ? piece.height : piece.width;
      const placedHeight = bestRotated ? piece.width : piece.height;


      // Add piece to layout
      layout.pieces.push({
        x: rect.x,
        y: rect.y,
        width: placedWidth,
        height: placedHeight,
        rotated: bestRotated,
        pieceId: piece.uniqueId,
        sourceId: piece.source?.id || piece.originalId,
        source: piece.source,
        sourceWidth: piece.sourceWidth || piece.source?.sourceWidth || piece.width,
        sourceHeight: piece.sourceHeight || piece.source?.sourceHeight || piece.height,
        originalWidth: piece.width,
        originalHeight: piece.height
      });

      // Remove placed rectangle and create new free rectangles
      freeRectangles.splice(bestRectIndex, 1);

      // Right rectangle
      if (rect.x + placedWidth < rect.x + rect.width) {
        freeRectangles.push({
          x: rect.x + placedWidth,
          y: rect.y,
          width: rect.width - placedWidth,
          height: placedHeight
        });
      }

      // Bottom rectangle
      if (rect.y + placedHeight < rect.y + rect.height) {
        freeRectangles.push({
          x: rect.x,
          y: rect.y + placedHeight,
          width: rect.width,
          height: rect.height - placedHeight
        });
      }

      remainingPieces.splice(bestPieceIndex, 1);
    }

    // Calculate waste percentage
    const usedArea = layout.pieces.reduce((sum, p) => sum + (p.width * p.height), 0);
    const totalArea = stockPanelSize.width * stockPanelSize.height;
    layout.waste = ((totalArea - usedArea) / totalArea * 100).toFixed(2);

    // Collect offcuts
    freeRectangles.forEach(rect => {
      if (rect.width >= minUsefulWaste && rect.height >= minUsefulWaste &&
          rect.width >= minBreakableSize && rect.height >= minBreakableSize) {
        offcuts.push({
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          area: Math.round(rect.width * rect.height)
        });
      }
    });

    // Add layout if it has pieces
    if (layout.pieces.length > 0) {
      layouts.push(layout);
    }
  }

  // Return results
  return {
    material,
    layouts,
    offcuts,
    unplaceablePieces: unplaceable,
    summary: {
      totalPanelsUsed: layouts.length,
      totalPieces: optimizeCuts.getTotalPieces(layouts),
      averageWaste: layouts.length > 0 
        ? (layouts.reduce((sum, l) => sum + parseFloat(l.waste), 0) / layouts.length).toFixed(2)
        : 0,
      offcutsGenerated: offcuts.length
    }
  };
}

/**
 * Helper function to get total pieces placed
 */
optimizeCuts.getTotalPieces = function(layouts) {
  return layouts.reduce((sum, layout) => sum + layout.pieces.length, 0);
};

export default optimizeCuts