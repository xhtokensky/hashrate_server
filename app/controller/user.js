const Controller = require('egg').Controller;
let Response = require('./../utils/resObj');
let userRule = require('./rule/user');
let commonUtil = require('./../utils/commonUtil');
const code = require("../utils/code");
const I18nConst = require('./../../config/constant/i18n');

class UserController extends Controller {

    async getElectricityBalance() {
        let {ctx} = this;
        let response = Response();

        try {

            let json = await this.ctx.checkToken();
            let userId = json.uid;
            let balance = 0;
            let obj = await ctx.service.user.findOneUserElectricityBalance({user_id: userId});

            if (obj) {
                balance = obj.balance;
            }


            let today_electricity = await ctx.service.user.getTodayElectricity(userId);

            let price = await ctx.service.mongodb.quoteService.findOneQuoteUSDBySymbol('USDT');
            if (price > 0) {
                today_electricity = commonUtil.bigNumberDiv(today_electricity, price, 3);
            }
            let unit = 'USDT';

            let totalArrearsNum = await ctx.service.home.getHashrateOrderArrearsElectic(userId);
            let result = {
                balance: balance ? balance : 0,
                today_electricity: today_electricity ? today_electricity.toFixed(3) : 0,
                unit: unit,
                totalArrears: totalArrearsNum || 0,
                electricUnit: 'USD'
            };

            response.content.data = result;

            return ctx.body = response;

        } catch (e) {
            console.error('getElectricityBalance > 系统错误,' + e.message);
            ctx.logger.error('getElectricityBalance > 系统错误,' + e.message);
            response.errMsg(this.ctx.I18nMsg(I18nConst.SystemError) + e.message, code.ERROR_SYSTEM, 'ERROR_SYSTEM');
            return ctx.body = response;
        }
    }


    /**
     * 1新增交易纪录
     * 2新增购买电力包订单
     * 3得到电力包
     * 4减去账户金额
     * @returns {Promise<Response|Object>}
     */
    async chongElectricity() {
        let {ctx} = this;
        let response = Response();

        try {
            let json = await this.ctx.checkToken();
            let userId = json.uid;

            let body = this.ctx.request.body;
            let RuleErrors = this.ctx.Rulevalidate(userRule.chongElectricity, body);
            // 验证参数
            if (RuleErrors != undefined) {
                let errors = RuleErrors[0];
                response.errMsg(this.ctx.I18nMsg(I18nConst.VerifyFailed) + errors.field + " " + errors.message, code.ERROR_PARAMS, 'ERROR_PARAMS');
                return this.ctx.body = response;
            }

            let money = body.money;
            let transactionPassword = body.transactionPassword;

            if (money <= 0) {
                response.errMsg(this.ctx.I18nMsg(I18nConst.IlegalParameters), code.ERROR_SYSTEM, 'ERROR_SYSTEM');
                return ctx.body = response;
            }

            let userInfo = await this.ctx.service.user.getUserByUid(userId);
            if (!userInfo) {
                response.errMsg(this.ctx.I18nMsg(I18nConst.UserDoesNotExist), code.ERROR_SYSTEM, 'ERROR_SYSTEM');
                return ctx.body = response;
            }
            if (!userInfo.transaction_password) {
                response.errMsg(this.ctx.I18nMsg(I18nConst.PleaseSetTransactionPassword), code.ERROR_SET_PWD, 'ERROR_SET_PWD');
                return ctx.body = response;
            }
            if (commonUtil.encrypt(commonUtil.decryptTranPWDByClient(transactionPassword, userId), userId) != userInfo.transaction_password) {
                response.errMsg(this.ctx.I18nMsg(I18nConst.IncorrectPassword), code.ERROR_TPWD_ERR, 'ERROR_TPWD_ERR');
                return ctx.body = response;
            }

            let userBalance = await ctx.service.user.findOneUserBalance({userId: userId, coinType: 'USDT'});
            if (!userBalance) {
                response.errMsg(this.ctx.I18nMsg(I18nConst.InsufficientBalance), code.ERROR_SYSTEM, 'ERROR_SYSTEM');
                return ctx.body = response;
            }

            let balance = userBalance.balance;
            let frozen_balance = userBalance.frozen_balance;

            let usableBalance = commonUtil.bigNumberMinus(balance, frozen_balance);

            if (usableBalance < money) {
                response.errMsg(this.ctx.I18nMsg(I18nConst.InsufficientBalance), code.ERROR_SYSTEM, 'ERROR_SYSTEM');
                return ctx.body = response;
            }

            let params = {
                money: money,
                userId: userId
            };
            ctx.getLogger('recordLogger').info("Hashrate chongElectricity >> " + JSON.stringify(params));
            let adstatus = await ctx.service.user.chongElectricity(params);
            if (!adstatus) {
                response.errMsg('充值失败,请稍后重试.', code.ERROR_SYSTEM, 'ERROR_SYSTEM');
                return ctx.body = response;
            } else if (adstatus == -1) {
                response.errMsg(this.ctx.I18nMsg(I18nConst.FrequentOperation), code.ERROR_SYSTEM, 'ERROR_SYSTEM');
                return ctx.body = response;
            }

            return ctx.body = response;
        } catch (e) {
            console.error('chongElectricity > 系统错误,' + e.message);
            ctx.logger.error('chongElectricity > 系统错误,' + e.message);
            response.errMsg(this.ctx.I18nMsg(I18nConst.SystemError) + e.message, code.ERROR_SYSTEM, 'ERROR_SYSTEM');
            return ctx.body = response;
        }
    }


}


module.exports = UserController;
