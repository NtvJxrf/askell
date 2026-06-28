import { constructWorks, constructName, checkDetail } from './triplexCalc.js'

const Calculate = ({data, selfcost}) => {
    console.log(data)
    const { material, height, width, drills, zenk, cutsv1, cutsv2, cutsv3, processing,
        tempered, shape, color, print, rounding, quantity = 1, ignoreRestricts = false, trims = {} } = data
    let S = (height * width) / 1000000
    const P = ((height + width) * 2) / 1000
    let S_calc = S
    if (S < 0.3 && rounding == 'Округление до 0.3') {
        S_calc = 0.3
    } else if (S < 0.5) {
        switch (rounding) {
            case 'Округление до 0.5':
                S_calc = 0.5
                break
            case 'Умножить на 2':
                S_calc = S * 2
                break
            default:
                S_calc = 0.5
        }
    }
}

export default Calculate