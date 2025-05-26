import Joi from 'joi'

const loginValidator = Joi.object({
    username: Joi.string().alphanum().required(),
    password: Joi.string().required(),
})

export default loginValidator