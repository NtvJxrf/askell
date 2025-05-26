export default class CalcsService{
    static selfcost = null
    static calculate(value, type){
        const calculators = {
            ballons: ballons,
            fbort: fbort,
            mattress: mattress
        }
        return calculators[type](value, this.selfcost)
    }
    static async loadData(){
        
    }
    static async deleteHistory(id){
        return await HistoryNote.destroy({where: {id}})
    }
    static async updateHistory(data){
        const { id, comments, markup, initData } = data.toChange
        return await HistoryNote.update({comments, markup, initData: JSON.stringify(initData)}, {where: {id}})
    }
}

CalcsService.loadData()