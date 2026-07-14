class BaseMachine {
    constructor({name, availableHeaps, bufferMinutes = 480, normaCache, materials, normaName}){
        this.name = name;
        this.availableHeaps = availableHeaps;
        this.bufferMax = bufferMinutes;
        this.normaCache = normaCache;
        this.materials = materials;
        this.normaName = normaName || name;
        this.completed = []
        // Рабочее состояние
        this.task = null;
        this.remaining = 0;
        this.available = 0;
        this.bufferRemaining = bufferMinutes;

        // Статистика
        this._busyMinutes = 0;
        this._totalAvailable = 0;
        this._totalCompleted = 0;
        this._lastEndTime = null;
        this.totalM2 = 0;
        this.totalMP = 0;
        this.tier3End = null
    }

    getNorma(){
        return this.normaCache[this.name] || 0;
    }

    calcWorkTime(item){
        const norma = this.getNorma();
        return this._calculateTime(item, norma);
    }

    setAvailable(minutes){
        this.available = minutes;
        this._totalAvailable += minutes;
    }

    tick(){
        if (this.available > 0) this.available--;
        if (this.remaining > 0){
            this.remaining--;
            this._busyMinutes++;
        }
    }

    tickBuffer(){
        if (!this.task && this.available > 0 && this.bufferRemaining > 0) {
                this.bufferRemaining--;
        }
    }

    resetBuffer(){
        this.bufferRemaining = this.bufferMax;
    }

    getNextStage(stages){
        const nextStage = this.task.productionPath[this.task.orderingPosition + 1]
        if(!nextStage) return null;
        return stages[nextStage.stageName]
    }
    
    hasMaterials(item){
        const materials = item.productionPath?.[item.orderingPosition]?.materials;
        if (!materials) return true;
        return Object.entries(materials).every(([assortmentId, quantity]) => {
            const available = this.materials[assortmentId];
            // Материал не отслеживается (обычный расходник) — считаем, что он есть на складе
            if (available === undefined) return true;
            return available >= quantity;
        });
    }

    consumeMaterials(item){
        const materials = item.productionPath?.[item.orderingPosition]?.materials;
        if (!materials) return;
        for (const [assortmentId, quantity] of Object.entries(materials)) {
            if (this.materials[assortmentId] === undefined) continue;
            this.materials[assortmentId] -= quantity;
        }
    }

    produceMaterial(item){
        if (item?.assortmentId && this.materials[item.assortmentId] !== undefined) {
            this.materials[item.assortmentId]++;
        }
    }
}

export class SingleItemMachine extends BaseMachine {
    constructor({name, availableHeaps, bufferMinutes, normaCache, pricesAndCoefs, materials, normaName}) {
        super({name, availableHeaps, bufferMinutes, normaCache, materials, normaName});
        this.pricesAndCoefs = pricesAndCoefs;
    }

    isBatchProcessor() {
        return false;
    }

    _calculateTime(item, norma) {
        return norma / 60
    }

    pickTask(heaps) {
        for (const heapName of this.availableHeaps) {
            const result = this.tryPickFromHeap(heaps[heapName]);

            if (result) {
                if(result.item.tier == 3){
                    result.item._totalNeededTime = (result.item._totalNeededTime || 0) + result.time
                }
                this.task = result.item;
                this.remaining = result.time;
                this.consumeMaterials(result.item);
                return;
            }
        }

        // Нет задач
        this.task = null;
        this.remaining = 0;
    }

    tryPickFromHeap(heap) {
        if (!heap || !heap.length) return null;

        let bestIdx = -1;
        let bestItem = null;
        let bestTime = 0;

        for (let i = 0; i < heap.length; i++) {
            const candidate = heap[i];
            const neededTime = this.calcWorkTime(candidate);

            if (candidate.tier === 3 && this.bufferRemaining > 0) continue;

            if (this.available >= neededTime && this.hasMaterials(candidate)) {
                if (bestIdx === -1 || this.compareItems(candidate, bestItem) < 0) {
                    bestIdx = i;
                    bestItem = candidate;
                    bestTime = Math.max(1, neededTime);
                }
            }
        }

        if (bestIdx === -1) return null;

        const lastIdx = heap.length - 1;
        if (bestIdx !== lastIdx) {
            heap[bestIdx] = heap[lastIdx];
        }
        heap.pop();

        return {
            item: bestItem,
            time: bestTime
        };
    }

    compareItems(a, b) {
        // Returns: <0 if a is better, >0 if b is better, 0 if equal
        if (a.tier < b.tier) return -1;
        if (a.tier > b.tier) return 1;

        // Delivery date priority
        const dateA = a._deliveryDate || new Date(0);
        const dateB = b._deliveryDate || new Date(0);
        if (dateA < dateB) return -1;
        if (dateA > dateB) return 1;

        // Drill count priority
        const drillsA = a._num?.drills || 0;
        const drillsB = b._num?.drills || 0;
        if (drillsA > drillsB) return -1;
        if (drillsA < drillsB) return 1;

        // Tempering tiebreaker - if both have tempering, prefer 'a' (candidate)
        // This matches original picker() behavior: only checks when both have it
        if (a.attributes?.['Закалка'] && b.attributes?.['Закалка']) {
            return -1;
        }

        return 0;
    }

    routeItem(heaps, simTimeMs, stages, tier3Items) {
        const nextStage = this.getNextStage(stages);
        const task = this.task;
        this._totalCompleted++;
        this.totalM2 += (task._num.length * task._num.width) / 1e6 || 0;
        this.totalMP += ((task._num.length + task._num.width) * 2 / 1000) || 0;
        this._lastEndTime = simTimeMs;
        if(this.task.tier === 3)
            this.tier3End = simTimeMs;

        if (nextStage) {
            task.orderingPosition++;
            heaps[nextStage.name].push(task);
        } else {
            if(task.tier === 3)
                tier3Items.push(task);
            this.produceMaterial(task);
        }
        this.completed.push(structuredClone(task));
    };
}

export class CuttingMachineBig extends SingleItemMachine {
    getNorma(){
        return this.normaCache[this.normaName] || 0;
    }
    tryPickFromHeap(heap) {
        if (!heap || !heap.length) return null;

        let bestIdx = -1;
        let bestItem = null;
        let bestTime = 0;

        for (let i = 0; i < heap.length; i++) {
            const candidate = heap[i];
            let isGlasspacketPiece 
            try{
                isGlasspacketPiece = (this.materialForItem[candidate.assortmentId]?.attributes?.['Тип изделия'] || this.materialForItem[candidate.assortmentId]?.productType) === 'Стеклопакет';
            }catch(e){
                console.log(e)
                console.log(this.materialForItem[candidate.assortmentId])
            }
            if (!isGlasspacketPiece && candidate._num.length < 2000 && candidate._num.width < 2000) continue; // Отбрасываем мелкие детали, которые режет маленький раскройный станок
            const neededTime = this.calcWorkTime(candidate);

            if (candidate.tier === 3 && this.bufferRemaining > 0) continue;

            if (this.available >= neededTime && this.hasMaterials(candidate)) {
                if (bestIdx === -1 || this.compareItems(candidate, bestItem) < 0) {
                    bestIdx = i;
                    bestItem = candidate;
                    bestTime = Math.max(1, neededTime);
                }
            }
        }

        if (bestIdx === -1) return null;

        const lastIdx = heap.length - 1;
        if (bestIdx !== lastIdx) {
            heap[bestIdx] = heap[lastIdx];
        }
        heap.pop();

        return {
            item: bestItem,
            time: bestTime
        };
    }
    _calculateTime(item, norma) {
        const len = item._num.length;
        const wid = item._num.width;
        return Math.ceil(((len * wid) / 1e6 / norma) * 60)
    }
}
export class CuttingMachineSmall extends SingleItemMachine {
    getNorma(){
        return this.normaCache[this.normaName] || 0;
    }
    tryPickFromHeap(heap) {
        if (!heap || !heap.length) return null;

        let bestIdx = -1;
        let bestItem = null;
        let bestTime = 0;

        for (let i = 0; i < heap.length; i++) {
            const candidate = heap[i];
            let isGlasspacketPiece 
            try{
                isGlasspacketPiece = (this.materialForItem[candidate.assortmentId]?.attributes?.['Тип изделия'] || this.materialForItem[candidate.assortmentId]?.productType) === 'Стеклопакет';
            }catch(e){
                console.log(e)
                console.log(this.materialForItem[candidate.assortmentId])
            }
            
            if (isGlasspacketPiece || candidate._num.length >= 2000 || candidate._num.width >= 2000) continue; // Отбрасываем большие детали, которые режет большой раскройный станок
            const neededTime = this.calcWorkTime(candidate);

            if (candidate.tier === 3 && this.bufferRemaining > 0) continue;

            if (this.available >= neededTime && this.hasMaterials(candidate)) {
                if (bestIdx === -1 || this.compareItems(candidate, bestItem) < 0) {
                    bestIdx = i;
                    bestItem = candidate;
                    bestTime = Math.max(1, neededTime);
                }
            }
        }

        if (bestIdx === -1) return null;

        const lastIdx = heap.length - 1;
        if (bestIdx !== lastIdx) {
            heap[bestIdx] = heap[lastIdx];
        }
        heap.pop();

        return {
            item: bestItem,
            time: bestTime
        };
    }
    _calculateTime(item, norma) {
        const len = item._num.length;
        const wid = item._num.width;
        return Math.ceil(((len * wid) / 1e6 / norma) * 60)
    }
}
export class AreaMachine extends SingleItemMachine {
    _calculateTime(item, norma) {
        const len = item._num.length;
        const wid = item._num.width;
        return Math.ceil(((len * wid) / 1e6 / norma) * 60)
    }
}
export class TemperingMachine extends SingleItemMachine {
    getNorma(item){
        const thickness = Number(item.attributes['Материал 1'].match(/(\d+(?:[.,]\d+)?)\s*мм/i)[1])
        return this.normaCache[this.name + ` ${thickness}`] || 0;
    }

    calcWorkTime(item){
        const norma = this.getNorma(item);
        return this._calculateTime(item, norma);
    }
    _calculateTime(item, norma) {
        const len = item._num.length;
        const wid = item._num.width;
        return Math.ceil(((len * wid) / 1e6 / norma) * 60)
    }
}
export class TrashMachine extends SingleItemMachine {
    _calculateTime(item, norma) {
        return 1; // 1 минут на "обработку" (выбрасывание) каждой детали
    }
}

export class PerimeterMachine extends SingleItemMachine {
    _calculateTime(item, norma) {
        const len = item._num.length;
        const wid = item._num.width;
        return Math.ceil((((len + wid) * 2 / 1000) / norma) * 60);
    }
}

export class PerimeterWithCutsMachine extends SingleItemMachine {
    _calculateTime(item, norma) {
        const len = item._num.length;
        const wid = item._num.width;
        const mp = (len + wid) * 2 / 1000;
        const attrs = item.attributes || {};
        const cutsTime =
            (attrs['Кол-во вырезов 1 категорий'] || 0) / this.pricesAndCoefs['Вырез в стекле 1 кат'].ratePerHour +
            (attrs['Кол-во вырезов 2 категорий'] || 0) / this.pricesAndCoefs['Вырез в стекле 2 кат'].ratePerHour +
            (attrs['Кол-во вырезов 3 категорий'] || 0) / this.pricesAndCoefs['Вырез в стекле 3 кат'].ratePerHour;
        return Math.ceil((mp / norma) * 60 + cutsTime * 60);
    }
}

export class DrillingMachine extends SingleItemMachine {
    _calculateTime(item, norma) {
        return Math.ceil((item._num.drills / norma) * 60);
    }
}