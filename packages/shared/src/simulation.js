import { TrashMachine, AreaMachine, PerimeterMachine, PerimeterWithCutsMachine, ExternalService, DrillingMachine } from './machineClasses.js';

const machineNames = ['Раскрой', 'Дабл эджер', 'Ялонг', 'Интермак', 'Альпа большая', 
    'Альпа малая', 'Сверление', 'Закалка', 'Окрашивание', 'Триплекс'];

// Станки/этапы, для которых в history сохраняется текущая задача и остаток времени
// (используется production-страницей фронтенда). Ограничено этим набором, чтобы не
// раздувать history данными по ~100 вспомогательным (Trash) очередям.
const LOGGED_MACHINE_NAMES = new Set([...machineNames, 'Сборка стеклопакета']);
const getTaskName = (task) => {
    if (!task) return null;
    if (Array.isArray(task)) return `${task[0]?.name || ''}${task.length > 1 ? ` и ещё ${task.length - 1}` : ''}`;
    return task.name || null;
};

export default function runSimulation(params) {
    const {
        schedule,
        startIndex,
        heaps,
        pricesAndCoefs,
        workStartHour = 9,
        logging = false,
        stages
    } = params;
    normalize(heaps);
    console.log('runSimulation: heaps', JSON.parse(JSON.stringify(heaps)))
    // console.log(heaps['Подготовка лист мет ( для СМД)'][0])
    // return
        // ─── Кэш норм из schedule[0] ─────────────────────────
    const normaCache = {};
    const history = logging ? [] : null; // для хранения снимков состояния при логировании
    const getNorma = (machineName) => {
        if (normaCache[machineName] !== undefined) return normaCache[machineName];
        return (normaCache[machineName] = toNum(schedule[0][machineName]));
    };
    const materialsRaw = Object.entries(heaps).reduce((acc, [_, heap]) => {
        for (const item of heap) {
            for(const stage of item.productionPath || []) {
                if(stage.materials) {
                    for (const assortmentId of Object.keys(stage.materials)) {
                        acc[assortmentId] ??= 0;
                        acc[assortmentId] += stage.materials[assortmentId];
                    }
                }
            }
        }
        return acc
    }, {});
    const usedMaterialIds = new Set();
    for(const heap of Object.values(heaps)) {
        for(const item of heap) {
            if(materialsRaw[item.assortmentId] !== undefined) {
                materialsRaw[item.assortmentId]--;
                usedMaterialIds.add(item.assortmentId);
            }
        }
    }
    const materials = Object.entries(materialsRaw).reduce((acc, [assortmentId, count]) => {
        if (usedMaterialIds.has(assortmentId)) {
            acc[assortmentId] = count;
        }
        return acc
    }, {});
    for (const name of machineNames) {
        getNorma(name);
    }

    const machines = [
        new AreaMachine(          {name: 'Раскрой',          availableHeaps: ['Раскрой'],           bufferMinutes: 480, normaCache, materials, maxBatchArea: 15}),
        new PerimeterMachine(        {name: 'Дабл эджер',    availableHeaps: ['ПР Полировка', 'ПР Шлифовка'], bufferMinutes: 480, normaCache, materials}),
        new PerimeterMachine(        {name: 'Ялонг',         availableHeaps: ['ПР Притупка'],  bufferMinutes: 480, normaCache, materials}),
        new PerimeterWithCutsMachine({name: 'Интермак',      availableHeaps: ['КР Полировка', 'КР Шлифовка'],            bufferMinutes: 480, normaCache, pricesAndCoefs, materials}),
        new PerimeterWithCutsMachine({name: 'Альпа большая', availableHeaps: ['КР Полировка', 'КР Шлифовка'],            bufferMinutes: 480, normaCache, pricesAndCoefs, materials}),
        new PerimeterWithCutsMachine({name: 'Альпа малая',   availableHeaps: ['КР Полировка', 'КР Шлифовка'],            bufferMinutes: 480, normaCache, pricesAndCoefs, materials}),
        new DrillingMachine(         {name: 'Сверление',     availableHeaps: ['Сверление'],            bufferMinutes: 480, normaCache, materials}),
        new AreaMachine(        {name: 'Закалка',            availableHeaps: ['Закалка'],         bufferMinutes: 480, normaCache, materials, maxBatchArea: 16.8}),
        // new PerimeterMachine(        {name: 'Окрашивание',   availableHeaps: ['Окраска стекла', 'ОКР (окрашивание стекла)'],          bufferMinutes: 480, normaCache, materials}),
        new AreaMachine(          {name: 'Триплекс',         availableHeaps: ['Триплексование'],           bufferMinutes: 480, normaCache, materials, maxBatchArea: 20}),
    ];
    const usedHeaps = new Set(
        machines.flatMap(machine => machine.availableHeaps)
    );
    const stagesKeys = Object.keys(stages);
    for (const stage of stagesKeys) {
        if (!usedHeaps.has(stage)) {
            machines.push(
                new TrashMachine({
                    name: `Trash ${stage}`,
                    availableHeaps: [stage],
                    bufferMinutes: 480,
                    pricesAndCoefs,
                    normaCache,
                    materials
                })
            );
        }
    }
    // ─── Маршрутизация изделия ───────────────────────────
    let simTimeMs = 0; // будет установлен в initDay
    let simTime = null;
    let index = startIndex;
    let iterations = 0;
    initDay();
    while (!isHeapsEmpty() || isMachinesBusy()) {
        if(logging && (iterations % 5 === 0)) {
            // Record compact heap summary (name -> length) to avoid copying large arrays.
            // NOTE: full per-machine snapshots (all ~100 machines incl. Trash) used to make
            // `history` ~70MB for long simulations. Now only the machines in
            // LOGGED_MACHINE_NAMES get a compact {name, task, remaining} entry.
            const heapsSummary = {};
            for (const [k, v] of Object.entries(heaps)) {
                heapsSummary[k] = Array.isArray(v) ? v.length : (v ? Object.keys(v).length : 0);
            }

            const machinesSummary = machines
                .filter(m => LOGGED_MACHINE_NAMES.has(m.name.startsWith('Trash ') ? m.name.replace('Trash ', '') : m.name))
                .map(m => ({
                    name: m.name,
                    task: getTaskName(m.task),
                    remaining: m.remaining || 0,
                }));

            history.push({
                time: new Date(simTime),
                heaps: heapsSummary,
                machines: machinesSummary,
            });
        }
        // Обработка станков
        for (const machine of machines) {
            if (machine.remaining < 1 && machine.task) {
                if (machine.remaining < 1) {
                    machine.routeItem(heaps, simTimeMs, stages);
                    machine.task = null;
                    machine.remaining = 0;
                }
            }

            if (machine.available > 0 && !machine.remaining && !machine.task) {
                machine.pickTask(heaps);        
            }

            machine.tick();
            machine.tickBuffer();
        }
        // Конец рабочего дня → переход на следующий
        if (!isMachinesAvailable() && !isMachinesBusy()) {
            if (!nextDay()){
                throw new Error(`[SimV4] Schedule exhausted at iteration ${iterations}, time ${simTime}, index ${index}. Cannot advance to next day. Heaps state: ${JSON.stringify(Object.fromEntries(Object.entries(heaps).map(([k,v]) => [k, Array.isArray(v) ? v.length : Object.keys(v || {}).length])))}`);   
            }
        }

        iterations++;
        simTimeMs += 60000;
        simTime.setTime(simTimeMs);
    }
    const tier3EndTimes = machines.map(m => {
        return {
            name: m.name || null,
            time: m.tier3End ? new Date(m.tier3End) : null,
        }
    });

    return {
        history,
        date: Date.now(),
        machines: machines.map(m => ({
            name: m.name || m.machine || null,
            _busyMinutes: m._busyMinutes || 0,
            _totalCompleted: m._totalCompleted || 0,
            _lastEndTime: m._lastEndTime ? new Date(m._lastEndTime) : null,
            totalM2: m.totalM2 || 0,
            totalMP: m.totalMP || 0,
            
        })),
        tier3EndTimes,
        lastTier3End: tier3EndTimes.filter(t => t.time).sort((a,b) => b.time - a.time)[0] || null,
    }
    function initDay() {
        const ekbNow = getEkaterinburgDate();
        const currentHours = ekbNow.getHours() + ekbNow.getMinutes() / 60;
        // Максимальное рабочее время среди станков за этот день
        const maxWorkHours = Object.values(schedule[index]).reduce((max, val) => {
            const n = toNum(val);
            return n > max ? n : max;
        }, 0);

        let hoursElapsed = currentHours - workStartHour;

        if (maxWorkHours - hoursElapsed < 0) {
            // Рабочий день уже закончился → переход на следующий
            hoursElapsed = 0;
            index++;
            ekbNow.setDate(ekbNow.getDate() + 1);
            ekbNow.setHours(workStartHour, 0, 0, 0);
            simTime = new Date(ekbNow);
        } else if (hoursElapsed < 0) {
            // Ещё не начался → ставим на начало дня
            hoursElapsed = 0;
            simTime = new Date(ekbNow.setHours(workStartHour, 0, 0, 0));
        } else {
            simTime = ekbNow;
        }

        for (const machine of machines) {
            if(!schedule[index][machine.name]) {
                machine.setAvailable(400);
                continue;
            }
            const mins = (toNum(schedule[index][machine.name], true) - hoursElapsed) * 60;
            machine.setAvailable(Math.max(0, mins));
        }

        simTimeMs = simTime.getTime();
    }
    function nextDay() {
        const prevSimMs = simTimeMs;
        simTime.setDate(simTime.getDate() + 1);
        simTime.setHours(workStartHour, 0, 0, 0);
        index++;

        // Защита от выхода за пределы расписания
        if (index >= schedule.length) {
            console.warn(`[SimV4] Расписание закончилось (index=${index}). Остановка.`);
            return false;
        }

        for (const machine of machines) {
            if(!schedule[index][machine.name]) {
                machine.setAvailable(400);
                continue;
            }
            const mins = toNum(schedule[index][machine.name]) * 60;
            machine.setAvailable(mins);
        }

        simTimeMs = simTime.getTime();
        
        // Вычисляем сколько минут было пропущено (ночное время)
        const skippedMinutes = Math.max(0, Math.round((simTimeMs - prevSimMs) / 60000));
        
        return true;
    }
    // ─── Проверки состояния ──────────────────────────────
    function isHeapsEmpty() {
        for (const heap of Object.values(heaps)) {
            if (heap.length > 0) return false;
        }
        return true;
    }
    function isMachinesBusy() {
        for (const machine of machines) {
            if (machine.remaining > 0 || machine.task !== null) return true;
        }
        return false;
    }
    function isMachinesAvailable() {
        for (const machine of machines) {
            if (machine.available > 0) return true;
        }
        return false;
    }
    function getEkaterinburgDate() {
        const now = new Date();
        const parts = new Intl.DateTimeFormat('en-GB', {
            timeZone: 'Asia/Yekaterinburg',
            hour12: false,
            year: 'numeric',
            month: 'numeric',
            day: 'numeric',
            hour: 'numeric',
            minute: 'numeric',
            second: 'numeric',
        }).formatToParts(now);

        const d = {};
        for (const p of parts) {
            if (p.type !== 'literal') d[p.type] = parseInt(p.value, 10);
        }
        return new Date(d.year, d.month - 1, d.day, d.hour, d.minute, d.second);
    }
}

function toNum(str, fixed = false) {
    if (str == null) return 0;
    if (typeof str === 'number') return fixed ? +str.toFixed(2) : str;
    const n = Number(String(str).replace(',', '.'));
    return fixed ? +n.toFixed(2) : n;
}

export function preprocessItems(items) {
    for (const it of items) {
        if (it._deliveryDate === undefined) {
            it._deliveryDate = it.deliveryPlannedMoment
                ? new Date(it.deliveryPlannedMoment)
                : null;
        }
        if (!it._num) {
            const a = it.attributes || {};
            const b = it.initialData || {};
            it._num = {
                length: toNum(a['Длина в мм']) || toNum(b.height) || 0,
                width:  toNum(a['Ширина в мм']) || toNum(b.width) || 0,
                drills: toNum(a['Кол-во сверлений']) || toNum(b.drills) || 0,
            };
        }
    }
}
export function normalize(heaps) {
    for (const k of Object.values(heaps)) {
        preprocessItems(k);
    }
}