import ApiError from "./apiError.js"
import logger from "./logger.js"
import sequelize from "../databases/db.js"
const doTransaction = async (fn, message) => {
    try{
        return await sequelize.transaction(fn)
    }catch(err){
        logger.error(err.message)
        //console.error(err)
        throw new ApiError(500, message)
    }
}
export default doTransaction