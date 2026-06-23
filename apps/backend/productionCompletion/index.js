import { ServiceBroker } from "moleculer";
import { initEnv, valkey } from "@askell/shared";
import { ROLES } from "@askell/shared/roles";
const PRODUCTION_STAGE_COMPLETION_USER_ATTRIBUTE_META = {
    href : "https://api.moysklad.ru/api/remap/1.2/entity/productionstagecompletion/metadata/attributes/0f552d4d-2e92-11f1-0a80-1088000fa9b8",
    type : "attributemetadata",
    mediaType : "application/json"
}

const broker = new ServiceBroker({
  nodeID: "productionCompletion",
  transporter: "nats://localhost:4222",
  logger: true
});

broker.createService({
    name: "productionCompletion",
    actions: {
        complete: {
            rest: "POST /complete",
            roles: [ROLES.PRODUCTION],
            async handler(ctx) {
                const { item, user, quantity, description } = ctx.params;
                const response = await broker.call('proxy.sklad',{
                    type: 'post',
                    url: `https://api.moysklad.ru/api/remap/1.2/entity/productionstagecompletion`,
                    data: buildStageCompletionPayload({ ...item, description, quantity }, user)
                })
                if(!response.errors){
                    updateHeaps({ ...item, quantity })
                    return true
                }
                return response.errors[0].error
            }
        },
        defect: {
            rest: "POST /defect",
            roles: [ROLES.PRODUCTION],
            async handler(ctx) {
                const { item, user, quantity, description } = ctx.params;
            }
        }
    }
});

const updateHeaps = async (data) => {
    const heaps = JSON.parse(await valkey.get('heaps')) || {}
    let heapKey = null
    for (const [key, heap] of Object.entries(heaps)) {
        if (heap.some(item => item.productionStageId === data.productionStageId)) {
            heapKey = key
            break
        }
    }
    if(!heapKey) {
        console.error('Элементы не найдены в кучах для productionStageId', data.productionStageId)
        return
    }

    const heap = heaps[heapKey]
    let toRemove = data.quantity || 1
    const newHeap = []
    for (const item of heap) {
        if (item.productionStageId === data.productionStageId && toRemove > 0) {
            const nextStep = item.productionPath[item.orderingPosition + 1]
            if (nextStep?.stageName) {
                if (!heaps[nextStep.stageName]) heaps[nextStep.stageName] = []
                item.productionStageId = nextStep.productionStageId
                item.orderingPosition = nextStep.orderingPosition
                heaps[nextStep.stageName].push(item)
            }
            toRemove--
            continue
        }
        newHeap.push(item)
    }
    heaps[heapKey] = newHeap
    broker.call('websocket.broadcast', { type: 'heaps', heaps })
    await valkey.set('heaps', JSON.stringify(heaps))
}

const buildStageCompletionPayload = (data, user, extraPayload = {}) => {
    const description = data?.description || undefined;
    const payload = {
        productionStage: {
            meta: {
                href: `https://api.moysklad.ru/api/remap/1.2/entity/productionstage/${data.productionStageId}`,
                type: "productionstage",
                mediaType: "application/json"
            }
        },
        productionVolume: data.quantity,
        attributes: [{
            meta: PRODUCTION_STAGE_COMPLETION_USER_ATTRIBUTE_META,
            value: user.fullname
        }],
        ...extraPayload
    }

    if (description) {
        payload.description = description
    }

    return payload
}

broker.start();