import logisticRequest from "../extension/logisticRequest.js";
import reclamationRequest from "../extension/reclamationRequest.js";
export default class ExtensionController {
    static async logisticRequest(req, res) {
        const result = await logisticRequest(req.body.dataFromForm)
        res.send(result);
    }
    static async reclamationRequest(req, res) {
        const result = await reclamationRequest(req.body.dataFromForm)
        res.send(result);
    }
}