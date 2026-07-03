export function getMaterialsStock(names, materials, stock) {
  return names.reduce((acc, name) => {
    const materialId = materials?.[name]?.id
    acc[name] = stock?.[materialId]?.total ?? 0
    return acc
  }, {})
}