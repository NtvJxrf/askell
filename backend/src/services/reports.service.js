import report4 from "../reports/report4.js"
import report5 from '../reports/report5.js'
const map = {
    report4,
    report5
}
export default class ReportsService {
    static async create(body){
        const {type, filters} = body
        const result = await map[type](filters)
        return result
    }
}