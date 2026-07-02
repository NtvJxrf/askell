import { triplex } from './triplex.js'
import { ceraglass } from './ceraglass.js'
import { glass } from './glass.js'
import { smd } from './smd.js'
import { glassPacket } from './glassPacket.js'
import { packageBox } from './packageBox.js'

export const productTypeHandlers = {
    'Триплекс': triplex,
    'Керагласс': ceraglass,
    'Стекло': glass,
    'СМД': smd,
    'Стеклопакет': glassPacket,
    'Упаковка': packageBox
}
