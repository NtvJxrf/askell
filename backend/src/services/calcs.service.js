import glass from './calculators/glass.js'

export default class CalcsService{
    static selfcost = null
    static calculate(value, type){
        const calculators = {
            glass,

        }
        return calculators[type](value, this.selfcost)
    }

    static async loadData(){
        
    }
}

CalcsService.loadData()