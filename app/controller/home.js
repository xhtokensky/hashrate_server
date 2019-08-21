'use strict';

const code = require("../utils/code");
const Controller = require('egg').Controller;
let Response = require('./../utils/resObj');
let commonUtil = require('./../utils/commonUtil');
let dateUtil = require('./../utils/dateUtil');
let qiniuUtil = require('./../utils/qiniu');
let homeRule = require('./rule/home');
const moment = require('moment');
const BigNumber = require('bignumber.js');
const I18nConst = require('./../../config/constant/i18n');

class HomeController extends Controller {


    async __getPrice() {
        let res = {};
        let categoryList = await this.ctx.service.home.findHashrateCategoryList();
        for (let i = 0; i < categoryList.length; i++) {
            if (categoryList[i].name) {
                let price = await this.service.mongodb.quoteService.findOneQuoteUSDBySymbol(categoryList[i].name);
                res[categoryList[i].name] = price;
            }
        }
        return res;
    }

    __getSimilarValue(num) {
        let arr = [30, 90, 180, 360];
        let index = 0;
        let d_value = Number.MAX_VALUE;
        for (var i = 0; i < arr.length; i++) {
            var new_d_value = Math.abs(arr[i] - num);
            if (new_d_value <= d_value) {
                if (new_d_value === d_value && arr[i] < arr[index]) {
                    continue;
                }
                index = i;
                d_value = new_d_value;
            }
        }
        return arr[index]
    }

    __getRate({symbol, num, tag, futures_type, pobject}) {
        //正常版
        let normalObject = {
            '30': {
                rate: 1.7436,
                base: 12
            },
            '90': {
                rate: 1.6111,
                base: 4
            }
        };
        //优惠版
        let offerObject = {
            '30': {
                rate: 1.732,
                base: 12
            },
            '90': {
                rate: 1.6009,
                base: 4
            }
        };
        //期货版
        let futuresObject = {
            '180': {
                rate: 1.3638,
                base: 2
            },
            '360': {
                rate: 1.0536,
                base: 2
            }
        };


        if (tag == 0) {//正常版
            if (futures_type == 1) {//期货
                let rateObj = futuresObject[this.__getSimilarValue(num)];
                if (!rateObj) {
                    return '';
                } else {
                    return (this.app.config.dayEarningsConfig.defaultVal[symbol] * pobject[symbol] * 7 * 0.99 / rateObj.rate - 1) * rateObj.base;
                }
            } else {
                let rateObj = normalObject[this.__getSimilarValue(num)];
                if (!rateObj) {
                    return '';
                } else {
                    return (this.app.config.dayEarningsConfig.defaultVal[symbol] * pobject[symbol] * 7 * 0.99 / rateObj.rate - 1) * rateObj.base;
                }
            }
        } else {//优惠版
            let rateObj = offerObject[this.__getSimilarValue(num)];
            if (!rateObj) {
                return '';
            } else {
                return (this.app.config.dayEarningsConfig.defaultVal[symbol] * pobject[symbol] * 7 * 0.99 / rateObj.rate - 1) * rateObj.base;
            }
        }
    }

    async getHashrateTreatyList() {
        const {ctx} = this;
        let response = Response();
        try {
            let pobject = await this.__getPrice();
            let query = this.ctx.query;
            let index = query.pageIndex || 1;
            let pageSize = query.pageSize ? query.pageSize : 20;
            let pageIndex = (index - 1) * pageSize;
            if (pageSize > 20) {
                pageSize = 20;
            }
            let params = {
                pageIndex: pageIndex,
                pageSize: pageSize
            };
            let data = await this.ctx.service.home.getHashrateTreatyList(params);
            let dayEarnings = this.app.config.dayEarningsConfig.defaultVal;
            for (let i = 0; i < data.length; i++) {
                data[i].img_url = qiniuUtil.getSignAfterUrl(data[i].img, this.app.config.qiniuConfig);
                let day_earnings_profit = dayEarnings.BTC;
                if (dayEarnings[data[i].name]) {
                    day_earnings_profit = dayEarnings[data[i].name]
                }
                if (dayEarnings[data[i].symbol]) {
                    day_earnings_profit = dayEarnings[data[i].symbol]
                }
                data[i].day_earnings_profit = day_earnings_profit;

                data[i].earnings_rate = data[i].earnings_rate ? commonUtil.bigNumberMultipliedBy(parseFloat(data[i].earnings_rate.toString()), 100).toFixed(2) + "%" : "0%";
                /*let rate = this.__getRate({
                    symbol: data[i].symbol,
                    num: data[i].run_cycle,
                    tag: data[i].tag,
                    futures_type: data[i].futures_type,
                    pobject: pobject
                });
                data[i].earnings_rate = rate ? commonUtil.bigNumberMultipliedBy(rate,100).toFixed(2) + "%" : "--";*/
            }

            let count = await this.ctx.service.home.getHashrateTreatyCount(params);
            response.content.data = data;
            response.content.currentPage = index;
            response.content.totalPage = count;
            return ctx.body = response;
        } catch (e) {
            ctx.logger.error('getHashrateTreatyList > 系统错误,' + e.message);
            response.errMsg(this.ctx.I18nMsg(I18nConst.SystemError) + e.message, code.ERROR_SYSTEM, 'ERROR_SYSTEM');
            return ctx.body = response;
        }
    }


    /// 算力合约详情
    async getHashrateTreatyDetails() {
        const {ctx} = this;
        let response = Response();
        try {

            let RuleErrors = this.ctx.Rulevalidate(homeRule.getHashrateTreatyDetails, this.ctx.params);

            // 验证参数
            if (RuleErrors != undefined) {
                let errors = RuleErrors[0];
                response.errMsg(this.ctx.I18nMsg(I18nConst.VerifyFailed) + errors.field + " " + errors.message, code.ERROR_PARAMS, 'ERROR_PARAMS');
                return this.ctx.body = response;
            }

            let keyId = this.ctx.params.keyId;

            let obj = await ctx.service.home.findOneHashrateTreaty(keyId);
            if (!obj) {
                response.errMsg(this.ctx.I18nMsg(I18nConst.NoMiningContracts), code.ERROR_SYSTEM, 'ERROR_SYSTEM');
                return ctx.body = response;
            }

            //obj.send_coin_way = this.ctx.I18nMsg(I18nConst.DailySettlement);

            obj.img_url = qiniuUtil.getSignAfterUrl(obj.img, this.app.config.qiniuConfig);

            if (obj.futures_type == 1) {
                if (obj.effective_date) {
                    obj.excavate_time = dateUtil.formatBirthday(obj.effective_date);
                    obj.excavate_time = obj.excavate_time + " 00:00";
                } else {
                    obj.excavate_time = '';
                }
            } else {
                obj.excavate_time = moment(moment().add(1, 'day')).format('YYYY-MM-DD');
                obj.excavate_time = obj.excavate_time + " 00:00";
            }

            let dayEarnings = this.app.config.dayEarningsConfig.defaultVal;
            let day_earnings_profit = dayEarnings.BTC;
            if (dayEarnings[obj.name]) {
                day_earnings_profit = dayEarnings[obj.name]
            }
            if (dayEarnings[obj.symbol]) {
                day_earnings_profit = dayEarnings[obj.symbol]
            }
            obj.electric_bill = commonUtil.bigNumberMultipliedBy(obj.electric_bill, 7, 3);
            obj.day_earnings_profit = day_earnings_profit;
            obj.earnings_rate = obj.earnings_rate ? commonUtil.bigNumberMultipliedBy(parseFloat(obj.earnings_rate.toString()), 100).toFixed(2) + "%" : "0%";

            response.content.data = obj;


            return ctx.body = response;

        } catch (e) {
            ctx.logger.error('getHashrateTreatyDetails > 系统错误,' + e.message);
            response.errMsg(this.ctx.I18nMsg(I18nConst.SystemError) + e.message, code.ERROR_SYSTEM, 'ERROR_SYSTEM');
            return ctx.body = response;
        }
    }


    async buyquantity() {
        const {ctx} = this;
        let response = Response();
        try {
            let body = this.ctx.request.body;

            let RuleErrors = this.ctx.Rulevalidate(homeRule.buyquantity, body);

            // 验证参数
            if (RuleErrors != undefined) {
                let errors = RuleErrors[0];
                response.errMsg(this.ctx.I18nMsg(I18nConst.VerifyFailed) + errors.field + " " + errors.message, code.ERROR_PARAMS, 'ERROR_PARAMS');
                return this.ctx.body = response;
            }
            let quantity = body.buyQuantity;
            let hashrateTreatyId = body.keyId;
            let payType = body.payType;
            let obj = await ctx.service.home.findOneHashrateTreaty(hashrateTreatyId);
            if (!obj) {
                response.errMsg('该合约已下架', code.ERROR_PARAMS, 'ERROR_PARAMS');
                return this.ctx.body = response;
            }
            if (quantity > obj.inventory_left) {
                response.errMsg(this.ctx.I18nMsg(I18nConst.InsufficientStock), code.ERROR_PARAMS, 'ERROR_PARAMS');
                return this.ctx.body = response;
            }

            let sumPriceCNY = commonUtil.bigNumberMultipliedBy(quantity, obj.price, 2);


            let rateVal = await this.ctx.service.home.getUsdCnyRate();
            if (!rateVal) {
                this.ctx.logger.error('buyinOrder error: 未抓到汇率数据');
                response.errMsg(this.ctx.I18nMsg(I18nConst.FrequentOperation), code.ERROR_PARAMS, 'ERROR_PARAMS');
                return this.ctx.body = response;
            }
            let sumPriceUSD = commonUtil.bigNumberDiv(sumPriceCNY, (commonUtil.bigNumberMultipliedBy(rateVal, 1.03)));


            let usdPrice = await this.ctx.service.mongodb.quoteService.findOneQuoteUSDBySymbol(payType);
            if (!usdPrice || usdPrice <= 0) {
                this.ctx.logger.error('buyinOrder usdPrice error : ', usdPrice);
                response.errMsg(this.ctx.I18nMsg(I18nConst.FrequentOperation), code.ERROR_PARAMS, 'ERROR_PARAMS');
                return this.ctx.body = response;
            }

            let transactionMoney = commonUtil.bigNumberDiv(sumPriceUSD, usdPrice, 8);

            let res = {
                sum_price_cny: sumPriceCNY,
                transaction_money: transactionMoney
            };
            response.content.data = res;
            return ctx.body = response;
        } catch (e) {
            ctx.logger.error('buyquantity > 系统错误,' + e.message);
            response.errMsg(this.ctx.I18nMsg(I18nConst.SystemError) + e.message, code.ERROR_SYSTEM, 'ERROR_SYSTEM');
            return ctx.body = response;
        }
    }

    /**
     * 下单逻辑
     *
     * 创建订单
     * 减少合约
     * 减少余额
     * 生成交易明细
     * @returns {Promise<Response|Object>}
     */
    async buyinOrder() {
        const {ctx} = this;
        let response = Response();
        try {
            let json = await this.ctx.checkToken();
            let userId = json.uid;

            let body = this.ctx.request.body;

            let RuleErrors = this.ctx.Rulevalidate(homeRule.buyinOrder, body);

            // 验证参数
            if (RuleErrors != undefined) {
                let errors = RuleErrors[0];
                response.errMsg(this.ctx.I18nMsg(I18nConst.VerifyFailed) + errors.field + " " + errors.message, code.ERROR_PARAMS, 'ERROR_PARAMS');
                return this.ctx.body = response;
            }
            let hashrateTreatyId = body.keyId;
            let buyQuantity = body.buyQuantity;
            let payType = body.payType;
            let transactionPassword = body.transactionPassword;


            let hashrateTreaty = await ctx.service.home.findOneHashrateTreaty(hashrateTreatyId);
            if (!hashrateTreaty) {
                response.errMsg(this.ctx.I18nMsg(I18nConst.NoMiningContracts), code.ERROR_SYSTEM, 'ERROR_SYSTEM');
                return ctx.body = response;
            }
            if (hashrateTreaty.inventory_left <= 0) {
                response.errMsg(this.ctx.I18nMsg(I18nConst.SoldOutPleaseChooseOtherProducts), code.ERROR_SYSTEM, 'ERROR_SYSTEM');
                return ctx.body = response;
            }
            if (hashrateTreaty.inventory_left < buyQuantity) {
                response.errMsg(this.ctx.I18nMsg(I18nConst.InsufficientStock), code.ERROR_SYSTEM, 'ERROR_SYSTEM');
                return ctx.body = response;
            }

            //是否设置交易密码
            const userInfo = await ctx.service.user.getUserByUid(userId);
            if (!userInfo.transaction_password) {
                response.errMsg(this.ctx.I18nMsg(I18nConst.PleaseSetTransactionPassword), code.ERROR_SET_PWD, 'ERROR_SET_PWD');
                return ctx.body = response;
            }

            //余额是否足够
            let userBalance = await ctx.service.home.findOneUserBalance(userId, payType);
            if (!userBalance) {
                response.errMsg(this.ctx.I18nMsg(I18nConst.BalanceNotEnough), code.ERROR_BALANCE_NOENOUGH, 'ERROR_BALANCE_NOENOUGH');
                return ctx.body = response;
            }
            let useBalance = commonUtil.bigNumberMinus(userBalance.balance, userBalance.frozen_balance);

            if (commonUtil.encrypt(commonUtil.decryptTranPWDByClient(transactionPassword, userId), userId) != userInfo.transaction_password) {
                response.errMsg(this.ctx.I18nMsg(I18nConst.IncorrectPassword), code.ERROR_PARAMS, 'ERROR_PARAMS');
                return this.ctx.body = response;
            }

            let buycount = await ctx.service.home.getHashrateOrderCountForUser(hashrateTreatyId, userId);

            let restriction = hashrateTreaty.restriction;
            if (restriction > 0) {
                if (buycount >= restriction) {
                    response.errMsg(`每人最多限购${restriction}个`, code.ERROR_PARAMS, 'ERROR_PARAMS');
                    return this.ctx.body = response;
                }
            }

            let sumPriceCNY = commonUtil.bigNumberMultipliedBy(hashrateTreaty.price, buyQuantity);

            let rateVal = await this.ctx.service.home.getUsdCnyRate();
            if (!rateVal) {
                this.ctx.logger.error('buyinOrder error: 未抓到汇率数据');
                response.errMsg(this.ctx.I18nMsg(I18nConst.SystemError), code.ERROR_PARAMS, 'ERROR_PARAMS');
                return this.ctx.body = response;
            }
            let sumPriceUSD = commonUtil.bigNumberDiv(sumPriceCNY, (commonUtil.bigNumberMultipliedBy(rateVal, 1.03)));


            let usdPrice = await this.ctx.service.mongodb.quoteService.findOneQuoteUSDBySymbol(payType);
            if (!usdPrice || usdPrice <= 0) {
                this.ctx.logger.error('buyinOrder usdPrice error : ', usdPrice);
                response.errMsg(this.ctx.I18nMsg(I18nConst.SystemError), code.ERROR_PARAMS, 'ERROR_PARAMS');
                return this.ctx.body = response;
            }

            let transactionMoney = commonUtil.bigNumberDiv(sumPriceUSD, usdPrice, 8);


            let oid = commonUtil.orderId('02');
            let params = {
                hashrateTreatyId: hashrateTreatyId,
                buyQuantity: buyQuantity,
                payType: payType,
                transactionMoney: transactionMoney,
                orderId: oid,
                userId: userId,
                excavateTime: moment(moment().add(1, 'day')).format('YYYY-MM-DD'),
                payTime: dateUtil.currentDate(),
                name: hashrateTreaty.name,
                price: hashrateTreaty.price
            };

            //期货版
            if (hashrateTreaty.futures_type == 1) {
                if (!hashrateTreaty.effective_date) {
                    response.errMsg(this.ctx.I18nMsg(I18nConst.SystemError), code.ERROR_SYSTEM, 'ERROR_SYSTEM');
                    this.ctx.logger.error(`buyinOrder error:系统错误，期货版缺少初始时间`);
                    return this.ctx.body = response;
                }
                params.excavateTime = dateUtil.formatBirthday(hashrateTreaty.effective_date);
            }

            let run_cycle = hashrateTreaty.run_cycle || 0;
            params.endTime = moment(moment(params.excavateTime).add(run_cycle, 'day')).format('YYYY-MM-DD');
            if (useBalance < transactionMoney) {
                response.errMsg(this.ctx.I18nMsg(I18nConst.BalanceNotEnough), code.ERROR_BALANCE_NOENOUGH, 'ERROR_BALANCE_NOENOUGH');
                return ctx.body = response;
            }

            ctx.getLogger('recordLogger').info("Hashrate buyinOrder >> " + JSON.stringify(params));

            let us = await ctx.service.home.buyinOrder(params);
            if (!us) {
                response.errMsg(this.ctx.I18nMsg(I18nConst.OrderFailed), code.ERROR_SYSTEM, 'ERROR_SYSTEM');
                return ctx.body = response;
            } else if (us == -1) {
                response.errMsg(this.ctx.I18nMsg(I18nConst.FrequentOperation), code.ERROR_SYSTEM, 'ERROR_SYSTEM');
                return ctx.body = response;
            }
            response.content.data = {
                order_id: oid
            };
            return ctx.body = response;

        } catch (e) {
            ctx.logger.error('buyinOrder > 系统错误,' + e.message);
            response.errMsg(this.ctx.I18nMsg(I18nConst.SystemError) + e.message, code.ERROR_SYSTEM, 'ERROR_SYSTEM');
            return ctx.body = response;
        }
    }


    async getMyOrder() {
        const {ctx} = this;
        let response = Response();
        try {
            let query = this.ctx.query;
            let index = query.pageIndex || 1;
            let pageSize = query.pageSize ? query.pageSize : 20;
            let pageIndex = (index - 1) * pageSize;
            if (pageSize > 20) {
                pageSize = 20;
            }

            let json = await this.ctx.checkToken();
            let userId = json.uid;
            let category = query.category || 1;//1合约中  2已过期
            let data = await ctx.service.home.getMyOrder(userId, pageIndex, pageSize, category);
            for (let i = 0; i < data.length; i++) {
                data[i].img = qiniuUtil.getSignAfterUrl(data[i].img, this.app.config.qiniuConfig);
                let run_cycle = data[i].run_cycle ? data[i].run_cycle : 0;
                let d = moment(data[i].excavate_time).add(run_cycle, 'day');

                data[i].expire_time = dateUtil.format(d);

                if (new Date().getTime() > new Date(d).getTime()) {
                    data[i].expire = 1;//过期
                } else {
                    data[i].expire = 0;//合约中
                }
                let excavate_time = data[i].excavate_time;
                var s1 = new Date(dateUtil.formatBirthday(new Date())).getTime(),
                    s2 = new Date(dateUtil.formatBirthday(excavate_time)).getTime();
                if (s1 < s2) {
                    data[i].cur_day = 0;
                } else {
                    var total = (s1 - s2) / 1000;
                    var day = Math.ceil(total / (24 * 60 * 60));
                    if (day <= 1) {
                        day = 1;
                    }
                    data[i].cur_day = day;
                }
                data[i].excavate_time = dateUtil.format(data[i].excavate_time);

                if (category == 1) {
                    let dval = this.app.config.dayEarningsConfig.defaultVal[data[i].symbol];
                    if (!dval) {
                        data[i].profit = 0;
                    } else {
                        let yesterday_profit = await ctx.service.home.getMyOrderForYesterdayProfit({
                            orderId: data[i].order_id,
                            userId: userId
                        });
                        data[i].profit = yesterday_profit//commonUtil.bigNumberMultipliedBy(dval, data[i].buy_quantity, 8);
                    }
                } else {
                    let profit = await ctx.service.home.getMyOrderForProfit({
                        orderId: data[i].order_id,
                        userId: userId
                    });
                    data[i].profit = profit;
                }
            }
            let count = await ctx.service.home.getMyOrderCount(userId, category);
            response.content.data = data;
            response.content.currentPage = index;
            response.content.totalPage = count;
            return ctx.body = response;
        } catch (e) {
            ctx.logger.error('getMyOrder > 系统错误,' + e.message);
            response.errMsg(this.ctx.I18nMsg(I18nConst.SystemError) + e.message, code.ERROR_SYSTEM, 'ERROR_SYSTEM');
            return ctx.body = response;
        }

    }


    async getMyOrderDetails() {
        const {ctx} = this;
        let response = Response();
        try {
            let json = await ctx.checkToken();
            let userId = json.uid;

            let RuleErrors = this.ctx.Rulevalidate(homeRule.getMyOrderDetails, ctx.params);

            // 验证参数
            if (RuleErrors != undefined) {
                let errors = RuleErrors[0];
                response.errMsg(this.ctx.I18nMsg(I18nConst.VerifyFailed) + errors.field + " " + errors.message, code.ERROR_PARAMS, 'ERROR_PARAMS');
                return this.ctx.body = response;
            }

            let orderId = ctx.params.orderId;
            let obj = await ctx.service.home.getMyOrderDetails(orderId);
            if (!obj) {
                response.errMsg(this.ctx.I18nMsg(I18nConst.NoSuchOrder3), code.ERROR_SYSTEM, 'ERROR_SYSTEM');
                return thix.ctx.body = response;
            }

            let excavate_time = obj.excavate_time;
            var s1 = new Date(dateUtil.formatBirthday(new Date())).getTime(),
                s2 = new Date(dateUtil.formatBirthday(excavate_time)).getTime();
            if (s1 < s2) {
                obj.cur_day = 0;
            } else {
                var total = (s1 - s2) / 1000;
                var day = Math.ceil(total / (24 * 60 * 60));
                if (day <= 1) {
                    day = 1;
                }
                obj.cur_day = day;
            }

            let run_cycle = obj.run_cycle ? obj.run_cycle : 0;
            let d = moment(obj.excavate_time).add(run_cycle, 'day');
            if (new Date().getTime() > new Date(d).getTime()) {
                obj.expire = 1;
            } else {
                obj.expire = 0;
            }

            obj.excavate_time = dateUtil.format(obj.excavate_time);
            obj.pay_time = dateUtil.format(obj.pay_time);

            let profit = await ctx.service.home.getMyOrderForProfit({orderId: orderId, userId: userId});

            let yesterday_profit = await ctx.service.home.getMyOrderForYesterdayProfit({
                orderId: orderId,
                userId: userId
            });

            obj.profit = profit;
            obj.yesterday_profit = yesterday_profit;

            let usdPrice = await this.ctx.service.mongodb.quoteService.findOneQuoteUSDBySymbol(obj.symbol);
            let cnyPrice = commonUtil.bigNumberMultipliedBy(usdPrice, 7, 8);
            
            obj.cny_money = commonUtil.bigNumberMultipliedBy(cnyPrice, profit, 2);

            /// 每日电费 和 欠费状态
            obj.everyday_electric = commonUtil.bigNumberMultipliedBy(obj.buy_quantity, obj.electric_bill, 4);
            let resArrearsList = await ctx.service.home.getHashrateOrderArrears(userId, orderId);
            let isArrears = (resArrearsList && resArrearsList.length > 0) ? true : false;
            if(isArrears && resArrearsList){
                let arrearsElectric = 0;
                let minTime = Date.now();
                let notGrantProfit = 0;
                for(let ai = 0 ; ai < resArrearsList.length; ai++){
                    let info = resArrearsList[ai];

                    arrearsElectric = commonUtil.bigNumberPlus(arrearsElectric, info.electricity, 8);
                    notSendProfit = commonUtil.bigNumberPlus(notSendProfit, info.profit, 8);

                    let isDateTime = new Date(info.isdate).getTime();
                    if(isDateTime < minTime){
                        minTime = isDateTime;
                    }
                }
                obj.arrears_day = Math.floor((s1 - minTime) / 86400000);  ///欠店费的天数
                obj.arrears_electric = arrearsElectric;     ///欠电费总额
                obj.not_grant_profit = notGrantProfit;      ///未发放的收益
            }
            obj.is_arrears = isArrears;

            response.content.data = obj;
            return ctx.body = response;
        } catch (e) {
            ctx.logger.error('getMyOrderDetails > 系统错误,' + e.message);
            response.errMsg(this.ctx.I18nMsg(I18nConst.SystemError) + e.message, code.ERROR_SYSTEM, 'ERROR_SYSTEM');
            return ctx.body = response;
        }

    }

    async test(){
        let res = await this.ctx.service.home.getDayEarnings();
        return this.ctx.body = res;
    }


}

module.exports = HomeController;
