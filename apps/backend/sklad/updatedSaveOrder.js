{
                const data = ctx.params
                const order = await broker.call('proxy.sklad', {url: `https://api.moysklad.ru/api/remap/1.2/entity/customerorder/${data.order.id}?expand=state,positions.assortment`})
                if(['В работе', 'Поставлено в производство'].includes(order.state.name)) throw new Error(400, `Нельзя менять позиции у заказа который в работе, смените статус на "Карантин"`)//Кидаю ошибку чтоб не пересохраняли заказы которые уже в работе
                const indexes = []
                const prevPositions = order.positions?.rows || []
                const positions = Array.isArray(data?.positions) ? data.positions : [];
                const map = positions.reduce((acc, curr) => {if (curr?.key != null) acc[String(curr.key)] = true; return acc}, {});
                const positionsToCreate = data.positions.filter((el, index) => {if(!el.added && el.result.other.type){indexes.push(index); return true}});
                const deletedPositions = prevPositions.filter(el => !map[el.id]);
                let vizEngaged = false
                const productsToCreate = positionsToCreate.map((product, idx) => {
                    if(product?.result?.other?.viz) vizEngaged = true
                    const isService = Boolean(product?.result?.other?.customerSuppliedGlassForTempering);
                    const params = {
                        name: product.name,
                        shared: false,
                        attributes: generateProductAttributes({...product.initialData, ...product.result.other, order: data.order, details: {initialData: product.initialData, selfcost: product.selfcost, result: product.result}}, attributes, sklad_materials),
                        uom: uomMeta
                    }
                    params.salePrices = Object.entries(product.prices).map(([key, value]) => ({value: Number((value * 100).toFixed(2)), priceType: priceTypes[mapPrices[key]], currency: currencies['руб']}));
                    params.productFolder = dictionary.productFolders.glassGuard;
                    params.minPrice = {currency: currencies['руб'], value: product?.result?.other?.materialsandworks * 100 || 0};
                    switch (product.result.other.type){
                        case 'Стекло': params.productFolder = productFoldersByType['Стекло']; break
                        case 'Керагласс': params.productFolder = productFoldersByType['Керагласс']; break
                        case 'Триплекс': params.productFolder = productFoldersByType['Триплекс']; break
                        case 'СМД': params.productFolder = productFoldersByType['СМД']; break
                        case 'Упаковка': params.productFolder = productFoldersByType['Упаковка']; break
                        case 'Стеклопакет': params.productFolder = productFoldersByType['Стеклопакет']; break
                    }
                    if (!isService) {
                        params.weight = Number((product.result.other.weight).toFixed(2));
                        params.volume = Number((product.result.other.S).toFixed(2));
                    } else {
                        params.productFolder = productFoldersByType['Услуга']
                    }
                    return {params, isService, index: indexes[idx]}
                })
                let createdProducts = null
                if (productsToCreate.length > 0) {
                    const toCreateProducts = productsToCreate.filter(p => !p.isService)
                    const toCreateServices = productsToCreate.filter(p => p.isService)
                    const [createdProductsRes, createdServicesRes] = await Promise.all([
                        toCreateProducts.length > 0 ? broker.call('proxy.sklad', {url: "https://api.moysklad.ru/api/remap/1.2/entity/product", type: "post", data: toCreateProducts.map(p => p.params)}) : [],
                        toCreateServices.length > 0 ? broker.call('proxy.sklad', {url: "https://api.moysklad.ru/api/remap/1.2/entity/service", type: "post", data: toCreateServices.map(p => p.params)}) : []
                    ])
                    createdProducts = []
                    toCreateProducts.forEach((item, i) => {const created = createdProductsRes[i]; data.positions[item.index] = {...data.positions[item.index], position: {assortment: created}}; createdProducts.push(created)})
                    toCreateServices.forEach((item, i) => {const created = createdServicesRes[i]; data.positions[item.index] = {...data.positions[item.index], position: {assortment: created}}; createdProducts.push(created)})
                }
                try {
                    const params = {
                        positions: data.positions.map((pos) => ({
                            assortment: {meta: pos.position.assortment.meta},
                            price: pos.added ? pos.position.price : Number(pos.prices[data.displayPrice].toFixed(2) * 100),
                            quantity: pos.quantity,
                            vat: data.order.organization.name === 'ООО "А2"' ? 22 : 5
                        })),
                        attributes: [{
                            meta: {"href":"https://api.moysklad.ru/api/remap/1.2/entity/customerorder/metadata/attributes/99884b94-8f93-11f0-0a80-029a000276da","type":"attributemetadata","mediaType":"application/json"},
                            value: String(data.planDate.workingDays)
                        },{
                            meta: {"href":"https://api.moysklad.ru/api/remap/1.2/entity/customerorder/metadata/attributes/afc68830-5368-11f1-0a80-156a000b5f1e","type":"attributemetadata","mediaType":"application/json"},
                            value: Array.from(new Set(data.positions.map(pos => pos.result?.other?.type).filter(Boolean))).join(';')
                        }],
                        store: { meta: vizEngaged ? stores['ВИЗ СГИ'].meta : stores['Полеводство СГИ'].meta }
                    }
                    if(data.planDate.apiDate) params.deliveryPlannedMoment = data.planDate.apiDate
                    return await broker.call('proxy.sklad', {url: `https://api.moysklad.ru/api/remap/1.2/entity/customerorder/${data.order.id}`, type: "put", data: params})
                } catch(error) {
                    console.error(error, `Ошибка во время добавления позиций в заказ ${data.order.name}`)
                    // logger.error(error, `Ошибка во время добавления позиций в заказ ${data.order.name}`)
                    createdProducts && broker.call('proxy.sklad', {url: `https://api.moysklad.ru/api/remap/1.2/entity/product/delete`, type: "post", data: createdProducts.map(el => ({meta: el.meta}))})
                    // throw new ApiError(500, `Ошибка при добавлении позиций в заказ: ${error?.message || error}`)
                    throw new Error(`Ошибка при добавлении позиций в заказ: ${error?.message || error}`)
                } finally {
                    deleteEntitys(deletedPositions)
                }
            }