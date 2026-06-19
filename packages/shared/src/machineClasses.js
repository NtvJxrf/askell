class BaseMachine {
    constructor({name, availableHeaps, bufferMinutes, normaCache, materials}){
        this.name = name;
        this.availableHeaps = availableHeaps;
        this.bufferMax = bufferMinutes;
        this.normaCache = normaCache;
        this.materials = materials;


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
        if (!item.materials?.length) return true;
        return item.materials.every(mat => this.materials[mat.id] >= mat.quantity);
    }

    consumeMaterials(item){
        if (!item.materials?.length) return;
        for (const mat of item.materials) {
            this.materials[mat.id] -= (mat.quantity || 1);
        }
    }

    produceMaterial(item){
        if (item?.originalId && this.materials[item.originalId] !== undefined) {
            this.materials[item.originalId]++;
        }
    }
}

export class SingleItemMachine extends BaseMachine {
    constructor({name, availableHeaps, bufferMinutes, normaCache, pricesAndCoefs, materials}) {
        super({name, availableHeaps, bufferMinutes, normaCache, materials});
        this.pricesAndCoefs = pricesAndCoefs;
    }

    isBatchProcessor() {
        return false;
    }

    _calculateTime(item, norma) {
        throw new Error('_calculateTime must be implemented in subclass');
    }

    pickTask(heaps) {
        for (const heapName of this.availableHeaps) {
            const result = this.tryPickFromHeap(heaps[heapName]);

            if (result) {
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

    routeItem(heaps, simTimeMs, stages) {
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
            this.produceMaterial(task);
        }
    };
}

export class BatchMachine extends BaseMachine {
    constructor({name, availableHeaps, bufferMinutes, normaCache, maxBatchArea = 10.0, materials}) {
        super({name, availableHeaps, bufferMinutes, normaCache, materials});

        this.batch = [];           // Текущая партия
        this.maxBatchArea = maxBatchArea; // Максимальная площадь партии в м²
        this.currentBatchArea = 0;  // Текущая площадь партии
    }

    addToBatch(item) {
        const area = (item._num.length * item._num.width) / 1e6;
        this.batch.push(item);
        this.currentBatchArea += area;
    }

    isBatchFull() {
        return this.currentBatchArea >= this.maxBatchArea;
    }

    hasBatch() {
        return this.batch.length > 0;
    }

    clearBatch() {
        this.batch = [];
        this.currentBatchArea = 0;
    }

    pickFirstItem(arr) {
        let bestIdx = 0;

        for (let i = 1; i < arr.length; i++) {
            const a = arr[i];
            const b = arr[bestIdx];
            if(a.tier === 3 && this.bufferRemaining > 0) continue
            if (a.tier < b.tier) { bestIdx = i; continue; }
            if (a.tier > b.tier) continue;
            
            // 2) Более ранняя доставка
            const dateA = a._deliveryDate || new Date(0);
            const dateB = b._deliveryDate || new Date(0);
            if (dateA < dateB) { bestIdx = i; continue; }
            if (dateA > dateB) continue;
        }

        const selected = arr[bestIdx];
        const lastIdx = arr.length - 1;
        if (bestIdx !== lastIdx) arr[bestIdx] = arr[lastIdx];
        arr.pop();
        return selected;
    }

    routeItem(heaps, simTimeMs, stages) {
        for(const item of this.batch) {
            this._totalCompleted++;
            this.totalM2 += (item._num.length * item._num.width) / 1e6 || 0;
            this.totalMP += ((item._num.length + item._num.width) * 2 / 1000) || 0;
            this._lastEndTime = simTimeMs;
            if(this.task.tier === 3)
                this.tier3End = simTimeMs;
            const nextStage = this.getNextStage(stages);

            if (nextStage) {
                heaps[nextStage].push(item);
            } else {
                this.produceMaterial(item);
            }
        }
        this.clearBatch()
    }
}

export class ExternalService {
    constructor(name, fixedMinutes) {
        this.name = name;
        this.fixedMinutes = fixedMinutes;
        this.queue = [];
        this.tier3End = null
    }

    addItem(item, currentTimeMs) {
        item._serviceRemaining = this.fixedMinutes;
        item._serviceStartMs = currentTimeMs;
        this.queue.push(item);
    }

    tick() {
        for (const item of this.queue) {
            if (item._serviceRemaining > 0) {
                item._serviceRemaining--;
            }
        }
    }
    reduceTime(minutes) {
        for (const item of this.queue) {
            if (item._serviceRemaining > 0) {
                item._serviceRemaining -= minutes;
            }
        }
    }
    getCompleted(simTimeMs) {
        const completed = [];
        for (let i = this.queue.length - 1; i >= 0; i--) {
            if (this.queue[i]._serviceRemaining <= 0) {
                if(this.queue[i].tier === 3)
                    this.tier3End = simTimeMs;
                completed.push(this.queue.splice(i, 1)[0]);
            }
        }
        return completed;
    }

    hasItems() {
        return this.queue.length > 0;
    }
}

export class AreaMachine extends SingleItemMachine {
    _calculateTime(item, norma) {
        const len = item._num.length;
        const wid = item._num.width;
        return Math.ceil(((len * wid) / 1e6 / norma) * 60)
    }
}

export class TrashMachine extends SingleItemMachine {
    _calculateTime(item, norma) {
        return 10; // 10 минут на "обработку" (выбрасывание) каждой детали
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
    constructor({name, availableHeaps, bufferMinutes, normaCache, pricesAndCoefs, materials}) {
        super({name, availableHeaps, bufferMinutes, normaCache, pricesAndCoefs, materials});
    }

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

export class CuttingMachine extends BatchMachine {
    pickTask(heaps) {
        const buildBatchFromHeap = (heap) => {
            if (!heap || !heap.length) return false;

            this.clearBatch();
            const first = this.pickFirstItem(heap);
            if (!first) return false;

            const material = first.attributes?.['Материал 1'];
            this.addToBatch(first);
            // `addToBatch` already updates `currentBatchArea`

            // collect more items with the same material until batch is full
            let writeIdx = 0;
            let i = 0;
            for (; i < heap.length && !this.isBatchFull(); i++) {
                const itm = heap[i];
                const mat = itm.attributes?.['Материал 1'];
                if (mat === material) {
                    this.addToBatch(itm);
                } else {
                    heap[writeIdx++] = itm;
                }
            }
            // Copy remaining items that weren't processed due to batch being full
            for (; i < heap.length; i++) {
                heap[writeIdx++] = heap[i];
            }
            // Truncate the array to remove processed items
            heap.length = writeIdx;

            const norma = this.normaCache[this.name] || 0;
            if(!norma) throw new Error(`Norma not found for machine ${this.name}`);

            const totalArea = this.currentBatchArea; // m^2
            const estimatedTime = Math.max(1, Math.ceil((totalArea / norma) * 60));
            if (this.available < estimatedTime) {
                for (const item of this.batch) heap.push(item);
                this.clearBatch();
                return false;
            }
            this.task = this.batch.slice();
            // ensure at least 1 minute for the whole batch
            this.remaining = estimatedTime;
            return true;
        };

        if (buildBatchFromHeap(heaps[this.availableHeaps])) return;

        // no tasks
        this.task = null;
        this.remaining = 0;
    }
}
export class TemperingMachine extends BatchMachine {
    pickTask(heaps) {
        const buildBatchFromHeap = (heap) => {
            if (!heap || !heap.length) return false;

            // start new batch with the first picked item (by delivery date)
            this.clearBatch();
            const first = this.pickFirstItem(heap);
            if (!first) return false;

            const parseThickness = (material) => {
                if (!material) return NaN;
                const m = String(material).match(/(\d+(?:[.,]\d+)?)\s*мм/i);
                if (!m) return NaN;
                return Number(m[1].replace(',', '.'));
            };

            const thickness = parseThickness(first.attributes?.['Материал 1']);
            this.addToBatch(first);

            // collect more items with the same thickness until batch is full
            let writeIdx = 0;
            let i = 0;
            for (; i < heap.length && !this.isBatchFull(); i++) {
                const itm = heap[i];
                const mat = parseThickness(itm.attributes?.['Материал 1']);
                if (!Number.isNaN(thickness) && !Number.isNaN(mat) && mat === thickness) {
                    this.addToBatch(itm);
                } else {
                    heap[writeIdx++] = itm;
                }
            }
            // Copy remaining items that weren't processed due to batch being full
            for (; i < heap.length; i++) {
                heap[writeIdx++] = heap[i];
            }
            // Truncate the array to remove processed items
            heap.length = writeIdx;

            const norma = this.normaCache[this.name] || 0;
            if(!norma) throw new Error(`Norma not found for machine ${this.name}`);
            const estimatedTime = Math.max(1, Math.ceil(norma));
            if (this.available < estimatedTime) {
                for (const item of this.batch) heap.push(item);
                this.clearBatch();
                return false;
            }
            this.task = this.batch.slice();
            this.remaining = estimatedTime;
            return true;
        };

        // 1) try first heap
        if (buildBatchFromHeap(heaps[this.availableHeaps])) return;

        // no tasks
        this.task = null;
        this.remaining = 0;
    }
}
export class TriplexMachine extends BatchMachine {
    pickTask(heaps) {
        const buildBatchFromHeap = (heap) => {
            if (!heap || !heap.length) return false;

            // start new batch with the first picked item (by delivery date)
            this.clearBatch();
            const first = this.pickFirstItem(heap);
            if (!first) return false;

            const parseThickness = (material) => {
                if (!material) return NaN;
                const m = String(material).match(/(\d+(?:[.,]\d+)?)\s*мм/i);
                if (!m) return NaN;
                return Number(m[1].replace(',', '.'));
            };

            const thickness = parseThickness(first.attributes?.['Материал 1']);
            this.addToBatch(first);

            // collect more items with the same thickness until batch is full
            let writeIdx = 0;
            let i = 0;
            for (; i < heap.length && !this.isBatchFull(); i++) {
                const itm = heap[i];
                const mat = parseThickness(itm.attributes?.['Материал 1']);
                if (!Number.isNaN(thickness) && !Number.isNaN(mat) && mat === thickness && this.hasMaterials(itm)) {
                    this.addToBatch(itm);
                } else {
                    heap[writeIdx++] = itm;
                }
            }
            // Copy remaining items that weren't processed due to batch being full
            for (; i < heap.length; i++) {
                heap[writeIdx++] = heap[i];
            }
            // Truncate the array to remove processed items
            heap.length = writeIdx;

            const norma = this.normaCache[this.name] || 0;
            if (!norma) {
                throw new Error(`Norma not found for machine ${this.name}`);
            }
            const totalArea = this.currentBatchArea; // m^2
            const estimatedTime = Math.max(1, Math.ceil((totalArea / norma) * 60));
            if (this.available < estimatedTime) {
                for (const item of this.batch) heap.push(item);
                this.clearBatch();
                return false;
            }
            this.task = this.batch.slice();
            this.remaining = estimatedTime;
            return true;
        };
        // 1) try first heap
        if (buildBatchFromHeap(heaps[this.availableHeaps])) return;

        // no tasks
        this.task = null;
        this.remaining = 0;
    }
}