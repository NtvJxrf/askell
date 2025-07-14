import ReportsService from '../services/reports.service.js'
export default class pricesAndCoefsController {
    static async create(req, res) {
        const result = await ReportsService.create(req.body)
        res.setHeader(
            'Content-Disposition',
            'attachment; filename="report.xlsx"'
        );
        res.setHeader(
            'Content-Type',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );
        res.send(result);
    }
}