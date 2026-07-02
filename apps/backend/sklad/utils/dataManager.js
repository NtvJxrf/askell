import { valkey } from "@askell/shared"

// Single source of truth for the cached MoySklad reference data the sklad
// service relies on. Values are loaded once on startup and refreshed whenever
// data-refresher emits a `dataUpdated` event.
const KEY_BY_FIELD = {
    smdPlans: 'sklad:data:smdPlans',
    sklad_materials: 'sklad:data:materials',
    sklad_packaging: 'sklad:data:packaging',
    currencies: 'sklad:data:currencies',
    stores: 'sklad:data:stores',
    priceTypes: 'sklad:data:priceTypes',
    processingStages: 'sklad:data:processingStages',
    attributes: 'sklad:data:attributes',
    colors: 'sklad:data:colors',
}

// `dataUpdated` carries the entity type (the valkey key suffix); map it back
// to the field we store it under.
const FIELD_BY_TYPE = {
    smdPlans: 'smdPlans',
    materials: 'sklad_materials',
    packaging: 'sklad_packaging',
    currencies: 'currencies',
    stores: 'stores',
    priceTypes: 'priceTypes',
    processingStages: 'processingStages',
    attributes: 'attributes',
    colors: 'colors',
}

const data = {}

const loadField = async (field) => {
    data[field] = JSON.parse(await valkey.get(KEY_BY_FIELD[field]))
}

await Promise.all(Object.keys(KEY_BY_FIELD).map(loadField))

export const getData = () => data

export const refreshData = async (type) => {
    const field = FIELD_BY_TYPE[type]
    if (field) await loadField(field)
}
