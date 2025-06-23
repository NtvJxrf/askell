import store from "../../../store"
const Packaging = () => {
    const positions = store.getState().positions.positions
    const selfcost = store.getState().selfcost.selfcost
    const temp = {
        smd: false,
        weight: 0,
        count: 0,
        maxHeight: 0,
        maxWidth: 0,
    }
    positions.forEach( position => {
        position.initialData.height > temp.maxHeight && (temp.maxHeight = position.initialData.height)
        position.initialData.width > temp.maxWidth && (temp.maxWidth = position.initialData.width)
        temp.weight += position.temp.other.weight * position.quantity
        temp.count += position.quantity
        position.temp.other.type === 'СМД' && (temp.smd = true)
    })
    const packagingType = getPackagingType(temp)

    const result = {
        materials: [],
        works: [],
        expenses: [],
    }

    switch (packagingType) {
        case 1:
            
        break
        case 2:

        break

        case 3:

        break
        case 4:

        break
    } 

}


function getPackagingType({ smd, weight, count }) {
    if (weight > 120) 
    return smd ? 4 : 3
    return count <= 2 ? 1 : 2
}


export default Packaging