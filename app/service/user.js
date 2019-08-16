'use strict';
const Service = require('egg').Service;
const code = require("../utils/code");
const commonUtil = require("../utils/commonUtil");
const requestHttp = require("../utils/requestHttp");
const dateUtil = require("../utils/dateUtil");
const dbName = 'TokenskyAvatarDB';
const moment = require('moment');
const table = require('./../../config/constant/table');

class UserService extends Service {


    /**
     * 通过用户ID获取用户信息
     * @param {*Int M} userId
     */
    async getUserByUid(userId) {
        let sql = `SELECT yu.*, yut.token
            FROM ${table.TOKENSKY_USER} AS yu
            LEFT JOIN ${table.TOKENSKY_USER_TOKEN} AS yut
            ON yut.user_id=yu.user_id
            WHERE yu.user_id = ?`;
        let userInfo = await this.app.mysql.get(dbName).query(sql, [userId]);
        if (userInfo.length < 1) {
            return null
        }
        return userInfo[0]
    }

    async findOneRoleBlack(balckType, phone) {
        let sql = `select * from ${table.ROLE_BLACK_LIST} where balck_type = ? and phone=? order by end_time desc `;
        let result = await this.app.mysql.get(dbName).query(sql, [balckType, phone]);
        if (result.length < 1) {
            return null;
        }
        return result[0];
    }

    async findOneUserElectricityBalance(params) {
        let obj = await await this.app.mysql.get(dbName).get(table.TOKENSKY_USER_ELECTRICITY_BALANCE, params);
        return obj;
    }


    async findOneUserBalance({userId, coinType}) {
        let sql = `select * from ${table.TOKENSKY_USER_BALANCE} where coin_type=? and user_id=? `;
        let data = await this.app.mysql.get(dbName).query(sql, [coinType, userId]);
        if (data[0]) {
            return data[0];
        } else {
            return null;
        }
    }

    async getTodayElectricity(userId) {
        let sql = `
                    SELECT
                        ho.buy_quantity,
                        ht.electric_bill,
                        ht.run_cycle,
                        ho.excavate_time
                    FROM
                        ${table.HASHRATE_ORDER} ho,
                        ${table.HASHRATE_TREATY} ht
                    WHERE
                        ho.hashrate_treaty_id = ht.key_id
                    AND ho.user_id = ?
                    AND DATE_ADD(
                        ho.excavate_time,
                        INTERVAL ht.run_cycle DAY
                    )
                    >= NOW()
                  `;
        let result = await this.app.mysql.get(dbName).query(sql, [userId]);
        if (!result || result.length == 0) {
            return 0;
        }
        let electricity = 0;
        for (let i = 0; i < result.length; i++) {
            if (new Date().getTime() >= new Date(result[i].excavate_time).getTime()) {
                let buy_quantity = result[i].buy_quantity;
                let electric_bill = result[i].electric_bill;
                let num = commonUtil.bigNumberMultipliedBy(buy_quantity, electric_bill);
                electricity = commonUtil.bigNumberPlus(electricity, num);
            }
        }
        return electricity;
    }

    async chongElectricity(params) {
        let money = params.money;
        let userId = params.userId;

        const conn = await this.app.mysql.get(dbName).beginTransaction(); // 初始化事务

        try {
            //新增充电订单表
            let orderId = commonUtil.orderId('06');
            let chongElectricityOrderParams = {
                order_id: orderId,
                user_id: userId,
                money: money,
                pay_time: dateUtil.currentDate(),
                pay_type: 'USDT'
            };
            let chongElectricityOrderResult = await conn.insert(table.TOKENSKY_USER_CHONG_ELECTRICITY_ORDER, chongElectricityOrderParams);
            if (chongElectricityOrderResult.affectedRows == 0) {
                await conn.rollback();
                return false;
            }
            let _oid = await conn.get(table.TOKENSKY_ORDER_IDS, {order_id: orderId});
            if (_oid) {
                this.ctx.logger.error(`chongElectricity error:order_id已存在;order_id=${orderId},_oid:`, _oid);
                await conn.rollback();
                return false;
            }
            let orderidsResult = await conn.insert(table.TOKENSKY_ORDER_IDS, {order_id: orderId});
            if (orderidsResult.affectedRows == 0) {
                await conn.rollback();
                return false;
            }
            this.ctx.getLogger('recordLogger').info("chongElectricity chongElectricityOrderParams >> " + JSON.stringify(chongElectricityOrderParams));
            //新增交易纪录
            let transactionRecordParams = {
                coin_type: 'USDT',
                tran_type: '充值电费',
                push_time: dateUtil.currentDate(),
                category: 2,
                user_id: userId,
                money: money,
                status: 1,
                relevance_category: "chongElectricityOrder",
                relevance_id: orderId
            };
            let transactionRecordResult = await conn.insert(table.TOKENSKY_TRANSACTION_RECORD, transactionRecordParams);
            if (transactionRecordResult.affectedRows == 0) {
                await conn.rollback();
                return false;
            }

            this.ctx.getLogger('recordLogger').info("chongElectricity transactionRecordParams >> " + JSON.stringify(transactionRecordParams));

            //放入电力钱包里
            let userElectricityBalanceObject = await await this.app.mysql.get(dbName).get(table.TOKENSKY_USER_ELECTRICITY_BALANCE, {user_id: userId});
            if (!userElectricityBalanceObject) {
                let userElectricityBalanceParams = {
                    user_id: userId,
                    balance: money,
                    coin_type: 'USDT',
                    create_time: dateUtil.currentDate()
                };
                let userElectricityBalanceResult = await conn.insert(table.TOKENSKY_USER_ELECTRICITY_BALANCE, userElectricityBalanceParams);
                if (userElectricityBalanceResult.affectedRows == 0) {
                    await conn.rollback();
                    return false;
                }
                this.ctx.getLogger('recordLogger').info("chongElectricity userElectricityBalanceParams >> " + JSON.stringify(userElectricityBalanceParams));
            } else {
                let sql = `update ${table.TOKENSKY_USER_ELECTRICITY_BALANCE} set balance=balance+? where user_id=? `;
                let updateUserElectricityBalanceResult = await this.app.mysql.get(dbName).query(sql, [money, userId]);
                if (updateUserElectricityBalanceResult.affectedRows == 0) {
                    await conn.rollback();
                    return false;
                }
                this.ctx.getLogger('recordLogger').info("chongElectricity updateUserElectricityBalanceResult >> " + JSON.stringify({
                    money: money,
                    user_id: userId
                }));
            }


            this.ctx.getLogger('recordLogger').info("chongElectricity updateUserBalanceResult >> " + JSON.stringify({
                money: money,
                user_id: userId,
                coin_type: 'USDT'
            }));


            //修改用户资产
            let assetsParams = {
                change: {
                    uid: userId,
                    methodBalance: 'sub',
                    balance: money,
                    symbol: 'USDT',
                    signId: orderId
                },
                mold: 'chongElectricityOrder',
                cont: '电费充值'
            };

            let assetsResult = await requestHttp.postAssets.call(this, assetsParams);
            if (!assetsResult.success) {
                await conn.rollback();
                return false;
            }
            let hashId = assetsResult.hashId;

            let hashSql = `update ${table.TOKENSKY_USER_BALANCE_HASH} set model_status=? where hash_id=? `;
            let hashResult = await conn.query(hashSql, [1, hashId]);
            if (hashResult.affectedRows == 0) {
                this.ctx.logger.error(`tibi update hash fail:hashId==${hashId},userId=${userId}`);
            }


            await conn.commit();
            return true;

        } catch (e) {
            await conn.rollback();
            throw e;
            this.ctx.logger.error(`chongElectricity service error : ${e.message}`);
            return false;
        }
    }

}


module.exports = UserService;
