import { setSelfcost } from './slices/selfcostSlice.js'
import axios from "axios";
export default class Init{
    static async getSelfcost(dispatch){
            try{
                const selfcostResponse = await axios.get(`${import.meta.env.VITE_API_URL}/api/sklad/getSelfcost`, { withCredentials: true })
                dispatch(setSelfcost(selfcostResponse.data))
            }catch (err) {
                console.error('Ошибка при получении себестоимости:', err);
            }
        }
}