/* eslint valid-jsdoc: "off" */

'use strict';

const path = require('path');

/**
 * @param {Egg.EggAppInfo} appInfo app info
 */
module.exports = appInfo => {
    /**
     * built-in config
     * @type {Egg.EggAppConfig}
     **/
    const config = exports = {};

    // use for cookie sign key, should change to your own and keep security
    config.keys = appInfo.name + '_1559627814434_3225';

    // add your middleware config here
    config.middleware = [];

    // add your user config here
    const userConfig = {
        // myAppName: 'egg',
    };

    config.mongoose = {
        client: {
            url: 'mongodb://127.0.0.1/tokenskyQuoteDB',
            options: {},
        },
    };

    // 配置mysql
    config.mysql = {
        clients: {
            TokenskyAvatarDB: {
                // 数据库名
                host: "118.31.121.239",//"127.0.0.1",
                user: "root",
                password: "root",
                database: 'tokensky',
            },
        },
        // 所有数据库配置的默认值
        default: {
            // host
            host: '127.0.0.1', // 54.179.154.12 139.224.115.73 172.31.21.72
            // 端口号
            port: '3306',
        },

        // 是否加载到 app 上，默认开启
        app: true,
        // 是否加载到 agent 上，默认关闭
        agent: false,
    };


    config.customLogger = {
        recordLogger: {
            file: path.join(appInfo.root, `logs/${appInfo.name}/info-record.log`),
        },
    };


    exports.security = {
        csrf: false
    };


    config.qiniuConfig = {
        bucketName: "test1",
        accessKey: 'gPoNjxfS1qvYnbMjccy-UbOzvviIIeOSu5xqCPa7',
        secretKey: "_hcWP1rxzAYaa75KSQGFZulSqbGzTisv4j79vmTx",
        qiniuServer: 'http://test2.hardrole.com/'
    };


    config.dayEarningsConfig = {
        site: [
            {
                url: "https://btc.com/",
                symbol: "BTC"
            },
            /*{
                url: "https://bch.btc.com/",
                symbol: "BCH"
            }*/
        ],
        defaultVal: {
            "BTC": "0.00002790",
            "BCH": "0.00075063"
        }
    };

    config.usdCnyRate = {
        rate: ''
    };


    config.assetsUrl = 'http://127.0.0.1:8888/balance/one';
    config.assetsUrlMulti = 'http://127.0.0.1:8888/balance/multi';


    return {
        ...config,
        ...userConfig,
    };
};
