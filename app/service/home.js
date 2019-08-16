'use strict';
const Service = require('egg').Service;
const code = require("../utils/code");
const dateUtil = require("../utils/dateUtil");
const commonUtil = require("../utils/commonUtil");
const requestHttp = require("../utils/requestHttp");
const dbName = 'TokenskyAvatarDB';
const rp = require('request-promise');
const cheerio = require('cheerio');
//const puppeteer = require('puppeteer');
const table = require('./../../config/constant/table');
const moment = require('moment');

class HomeService extends Service {

    async findHashrateCategoryList() {
        let sql = `select * from ${table.HASHRATE_CATEGORY} where status=? `;
        let result = await this.app.mysql.get(dbName).query(sql, [1]);
        return result;
    }

    async getHashrateTreatyList({pageIndex, pageSize}) {
        let sql = `SELECT ht.key_id,ht.tag,ht.original_price,ht.futures_type,ht.earnings_rate,ht.price,ht.unit_money,ht.run_cycle,ht.inventory,ht.inventory_left,ht.restriction,ht.title as name,hc.unit,hc.name as symbol,hc.img_key img from ${table.HASHRATE_TREATY} ht,${table.HASHRATE_CATEGORY} hc where ht.hashrate_category = hc.key_id and hc.status=? and ht.status =? ORDER BY ht.sort DESC limit ?,?`;
        let result = await this.app.mysql.get(dbName).query(sql, [1, 1, parseInt(pageIndex), parseInt(pageSize)]);
        return result;
    }

    async getHashrateTreatyCount({pageIndex, pageSize}) {
        let sql = `SELECT count(*) count from ${table.HASHRATE_TREATY} ht,${table.HASHRATE_CATEGORY} hc where ht.hashrate_category = hc.key_id and hc.status=? and ht.status =?`;
        let result = await this.app.mysql.get(dbName).query(sql, [1, 1]);
        return result[0].count ? result[0].count : 0;
    }

    async findOneHashrateTreaty(keyId) {
        let sql = `SELECT ht.key_id,ht.tag,ht.original_price,ht.effective_date,ht.futures_type,ht.earnings_rate,ht.electric_bill,ht.price,ht.unit_money,ht.run_cycle,ht.inventory,ht.restriction,ht.intro,ht.inventory_left,ht.inventory,ht.title as name,hc.unit,hc.name as symbol,hc.img_key img from ${table.HASHRATE_TREATY} ht,${table.HASHRATE_CATEGORY} hc where ht.hashrate_category = hc.key_id and hc.status=? and ht.status =? and ht.key_id=? `;
        let result = await this.app.mysql.get(dbName).query(sql, [1, 1, keyId]);
        if (result.length < 1) {
            return null
        }
        return result[0]
    }


    async findOneUserBalance(user_id, coin_type) {
        let sql = `select * from ${table.TOKENSKY_USER_BALANCE} where user_id = ? and coin_type = ? `;
        let result = await this.app.mysql.get(dbName).query(sql, [user_id, coin_type]);
        if (result.length < 1) {
            return null;
        }
        return result[0];
    }

    async buyinOrder(params) {
        let hashrateTreatyId = params.hashrateTreatyId;
        let buyQuantity = params.buyQuantity;
        let payType = params.payType;
        let transactionMoney = params.transactionMoney;
        let orderId = params.orderId;
        let userId = params.userId;
        let payTime = params.payTime;
        let excavateTime = params.excavateTime;
        let endTime = params.endTime;
        let name = params.name;
        let price = params.price;

        const conn = await this.app.mysql.get(dbName).beginTransaction(); // 初始化事务
        try {

            //创建订单
            let orderParams = {
                order_id: orderId,
                hashrate_treaty_id: hashrateTreatyId,
                user_id: userId,
                buy_quantity: buyQuantity,
                pay_time: payTime,
                excavate_time: excavateTime,
                end_time: endTime,
                price: price
            };
            let orderResult = await conn.insert(table.HASHRATE_ORDER, orderParams);
            if (orderResult.affectedRows == 0) {
                await conn.rollback();
                return false;
            }

            let _oid = await conn.get(table.TOKENSKY_ORDER_IDS, {order_id: orderId});
            if (_oid) {
                this.ctx.logger.error(`buyinOrder error:order_id已存在`);
                await conn.rollback();
                return false;
            }
            let orderidsResult = await conn.insert(table.TOKENSKY_ORDER_IDS, {order_id: orderId});
            if (orderidsResult.affectedRows == 0) {
                await conn.rollback();
                return false;
            }

            let orderTranParams = {
                order_id: orderId,
                pay_type: payType,
                money_unit: payType,
                transaction_money: transactionMoney
            };
            let orderTranResult = await conn.insert(table.HASHRATE_ORDER_TRANSACTION, orderTranParams);
            if (orderTranResult.affectedRows == 0) {
                await conn.rollback();
                return false;
            }

            //减少合约
            let sql = `update ${table.HASHRATE_TREATY} set inventory_left = inventory_left-? where key_id =? `;
            let r = await conn.query(sql, [buyQuantity, hashrateTreatyId]);
            if (r.affectedRows == 0) {
                await conn.rollback();
                return false;
            }
            let obj = await conn.get(table.HASHRATE_TREATY, {key_id: hashrateTreatyId});
            if (!obj) {
                await conn.rollback();
                return false;
            }
            if (obj.inventory_left <= 0) {
                await conn.rollback();
                return false;
            }


            let otcTranTime = dateUtil.currentDate();
            //生成交易明细
            let tranParams = {
                coin_type: payType,
                tran_type: '算力合约购买',
                category: 2,
                user_id: userId,
                push_time: otcTranTime,
                money: transactionMoney,
                status: 1,
                relevance_category: "hashrateOrder",
                relevance_id: orderId
            };

            let tranResult = await conn.insert(table.TOKENSKY_TRANSACTION_RECORD, tranParams);
            if (tranResult.affectedRows == 0) {
                await conn.rollback();
                return false;
            }

            //修改用户资产
            let assetsParams = {
                change: {
                    uid: userId,
                    methodBalance: 'sub',
                    balance: transactionMoney,
                    symbol: payType,
                    signId: orderId
                },
                mold: 'hashrateOrder',
                cont: '算力合约购买'
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
            this.ctx.logger.error(`buyinOrder service error : ${e.message}`);
            return false;
        }
    }


    async getMyOrder(userId, pageIndex, pageSize, category) {
        if (category == 1) {
            let sql = `
                    SELECT
                        hc.img_key img,
                        hc.\`name\` as symbol,
                        hc.unit,
                        ho.order_id,
                        ho.buy_quantity,
                        ht.run_cycle,
                        ho.excavate_time,
                        ht.title
                    FROM
                        ${table.HASHRATE_ORDER} ho,
                        ${table.HASHRATE_TREATY} ht,
                        ${table.HASHRATE_CATEGORY} hc
                    WHERE
                        ho.hashrate_treaty_id = ht.key_id
                    AND ht.hashrate_category = hc.key_id
                    AND ho.user_id = ?
                    AND DATE_ADD(
                        ho.excavate_time,
                        INTERVAL ht.run_cycle DAY
                    )
                    >= NOW()
                    order by ho.pay_time DESC 
                    LIMIT ?,?
                  `;
            let result = await this.app.mysql.get(dbName).query(sql, [userId, parseInt(pageIndex), parseInt(pageSize)]);
            return result;
        } else {
            let sql = `
                    SELECT
                        hc.img_key img,
                        hc.\`name\` as symbol,
                        hc.unit,
                        ho.order_id,
                        ho.buy_quantity,
                        ht.run_cycle,
                        ho.excavate_time,
                        ht.title
                    FROM
                        ${table.HASHRATE_ORDER} ho,
                        ${table.HASHRATE_TREATY} ht,
                        ${table.HASHRATE_CATEGORY} hc
                    WHERE
                        ho.hashrate_treaty_id = ht.key_id
                    AND ht.hashrate_category = hc.key_id
                    AND ho.user_id = ?
                     AND DATE_ADD(
                        ho.excavate_time,
                        INTERVAL ht.run_cycle DAY
                    )
                    < NOW()
                    order by ho.pay_time DESC 
                    LIMIT ?,?
                  `;
            let result = await this.app.mysql.get(dbName).query(sql, [userId, parseInt(pageIndex), parseInt(pageSize)]);
            return result;
        }
    }

    async getMyOrderCount(userId, category) {
        if (category == 1) {
            let sql = `
                    SELECT
                        count(*) count
                    FROM
                        ${table.HASHRATE_ORDER} ho,
                        ${table.HASHRATE_TREATY} ht,
                        ${table.HASHRATE_CATEGORY} hc
                    WHERE
                        ho.hashrate_treaty_id = ht.key_id
                    AND ht.hashrate_category = hc.key_id
                    AND ho.user_id = ?
                    AND DATE_ADD(
                        ho.excavate_time,
                        INTERVAL ht.run_cycle DAY
                    )
                    >= NOW()
                  `;
            let result = await this.app.mysql.get(dbName).query(sql, [userId]);
            return result[0].count ? result[0].count : 0;
        } else {
            let sql = `
                    SELECT
                        count(*) count
                    FROM
                        ${table.HASHRATE_ORDER} ho,
                        ${table.HASHRATE_TREATY} ht,
                        ${table.HASHRATE_CATEGORY} hc
                    WHERE
                        ho.hashrate_treaty_id = ht.key_id
                    AND ht.hashrate_category = hc.key_id
                    AND ho.user_id = ?
                    AND DATE_ADD(
                        ho.excavate_time,
                        INTERVAL ht.run_cycle DAY
                    )
                    < NOW()
                  `;
            let result = await this.app.mysql.get(dbName).query(sql, [userId]);
            return result[0].count ? result[0].count : 0;
        }
    }


    async getMyOrderForProfit({orderId, userId}) {
        let sql = `select sum(profit) profit from ${table.HASHRATE_ORDER_PROFIT} where status=? and order_id=? and user_id=? `;
        let result = await this.app.mysql.get(dbName).query(sql, [1, orderId, userId]);
        return result[0].profit ? result[0].profit : 0;
    }


    async getMyOrderForYesterdayProfit({orderId, userId}) {
        let t = moment().subtract(1, 'day').format('YYYY-MM-DD');
        let sql = `select sum(profit) profit from ${table.HASHRATE_ORDER_PROFIT} where status=? and order_id=? and user_id=? and DATE_FORMAT(create_time,'%Y-%m-%d')=? `;
        let result = await this.app.mysql.get(dbName).query(sql, [1, orderId, userId, t]);
        return result[0].profit ? result[0].profit : 0;
    }


    async getMyOrderDetails(orderId) {
        let sql = `
                    SELECT
                        hc.img_key img,
                        hc.\`name\`,
                        hc.name as symbol,
                        hc.unit,
                        ho.order_id,
                        ho.buy_quantity,
                        ho.pay_time,
                        ht.price,
                        ht.unit_money,
                        ht.run_cycle,
                        ho.excavate_time,
                        hot.transaction_money,
                        hot.pay_type,
                        hot.money_unit as pay_money_unit
                    FROM
                        ${table.HASHRATE_ORDER} ho,
                        ${table.HASHRATE_TREATY} ht,
                        ${table.HASHRATE_CATEGORY} hc,
                        ${table.HASHRATE_ORDER_TRANSACTION} hot
                    WHERE
                        ho.hashrate_treaty_id = ht.key_id
                    AND ht.hashrate_category = hc.key_id
                    AND ho.order_id = hot.order_id
                    AND ho.order_id =?
        
                  `;
        let result = await this.app.mysql.get(dbName).query(sql, [orderId]);
        if (result.length < 1) {
            return {};
        }
        return result[0];
    }


    async getUserBalanceCoinList() {
        let sql = `select symbol from ${table.TOKENSKY_USER_BALANCE_COIN} where status = 1 `;
        let result = await this.app.mysql.get(dbName).query(sql);
        return result;
    }


    async getHashrateOrderCountForUser(hashrate_treaty_id, user_id) {
        let sql = `select count(*) count from ${table.HASHRATE_ORDER} where hashrate_treaty_id=? and user_id=? `;
        let result = await this.app.mysql.get(dbName).query(sql, [hashrate_treaty_id, user_id]);
        let count = result[0] ? result[0].count : 0;
        return count;
    }


    async sleep(t) {
        let st = 1000 * 5;
        if (t) {
            st = t;
        }
        return new Promise(function (resolve, reject) {
            setTimeout(function () {
                resolve('ok');
            }, st);
        })
    }


    async getDayEarnings() {
        let sql = `select unit_output from spider_coin_market where coin = ? `;
        let result = await this.app.mysql.get(dbName).query(sql, ['BTC']);
        if (result.length < 1) {
            return null;
        }
        let coinObject = result[0] ? result[0] : null;
        if (coinObject) {

            this.app.config.dayEarningsConfig.defaultVal.BTC = coinObject.unit_output;
        }
        return true;


        /*let postUrls = this.app.config.dayEarningsConfig.site;
        if (postUrls && Array.isArray(postUrls) && postUrls.length > 0) {
            try {
                let res = {};
                for (let i = 0; i < postUrls.length; i++) {
                    const browser = await puppeteer.launch({args: ['--no-sandbox', '--disable-setuid-sandbox']});
                    const page = await browser.newPage();
                    await page.goto(postUrls[i].url);
                    await this.sleep(1000 * 10);
                    let content = await page.content();
                    let $ = cheerio.load(content);
                    let ulLi = $('div.main-body div.indexNetworkStats div.panel-body').find('ul');
                    let lis = $(ulLi['0']).find('li');
                    let str = $(lis['2']).find('dd').text();
                    var reg2 = /([^=]+)$/;
                    var bluefile = str.match(reg2)[1];
                    let val = bluefile.replace(/[^\d.]/g, '');
                    console.log(`symbol:${postUrls[i].symbol} val:${val}`);
                    await browser.close();
                    await browser.close();
                    res[postUrls[i].symbol] = val;
                    let rnum = /^\d+(\.\d+)?$/;
                    console.log('val=====', val)
                    if (rnum.exec(val)) {
                        this.app.config.dayEarningsConfig.defaultVal[postUrls[i].symbol] = val;
                    }
                }
                return res;
            } catch (e) {
                console.error(`getDayEarnings error : ${e.message}`);
                this.ctx.logger.error(`getDayEarnings error : ${e.message}`);
                return {};
            } finally {
                //process.exit(1)
            }
        } else {
            return {};
        }*/
    }


    async getUsdCnyRate() {
        try {
            let options = {
                method: 'GET',
                url: 'https://hq.sinajs.cn/',
                qs: {rn: new Date().getTime(), list: 'USDCNY'},
                headers:
                    {
                        'postman-token': '4fd3268a-cf42-02c1-d16c-a3f0b7befedb',
                        'cache-control': 'no-cache',
                        'content-type': 'application/x-www-form-urlencoded'
                    },
                form: false
            };
            if (this.app.config.usdCnyRate.rate) {
                return this.app.config.usdCnyRate.rate;
            }
            let body = await rp(options);
            let arr = body.split(',');
            if (arr) {
                if (arr[8]) {
                    let val = arr[8];
                    let rnum = /^\d+(\.\d+)?$/;
                    if (rnum.exec(val)) {
                        this.app.config.usdCnyRate.rate = val;
                    }
                    return val;
                } else {
                    return null;
                }
            } else {
                return null;
            }
        } catch (e) {
            console.error(`getUsdCnyRate error : ${e.message}`);
            this.ctx.logger.error(`getUsdCnyRate error : ${e.message}`);
            return null;
        }
    }


}


module.exports = HomeService;
