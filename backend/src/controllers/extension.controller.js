import logisticRequest from "../extension/logisticRequest.js";
export default class ExtensionController {
    static async logisticRequest(req, res) {
        const result = await logisticRequest(req.body.dataFromForm)
        res.send(result);
    }
}