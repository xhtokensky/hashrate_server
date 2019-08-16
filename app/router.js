'use strict';

/**
 * @param {Egg.Application} app - egg application
 */
module.exports = app => {
    const isAuthenticated = app.middleware.isAuthenticated();
    const {router, controller} = app;
    router.get('/hashrate/treaty', controller.home.getHashrateTreatyList);//挖矿列表

    router.get('/hashrate/treaty/:keyId', controller.home.getHashrateTreatyDetails);//挖矿购买详情

    router.post('/hashrate/buyquantity', isAuthenticated, controller.home.buyquantity);//
    router.post('/hashrate/buyin/order', isAuthenticated, controller.home.buyinOrder);//下单

    router.get('/hashrate/my/order', isAuthenticated, controller.home.getMyOrder);//我的算力租凭
    router.get('/hashrate/my/order/:orderId', isAuthenticated, controller.home.getMyOrderDetails);//我的算力租凭详情


    router.get('/hashrate/user/electricityBalance', isAuthenticated, controller.user.getElectricityBalance);//获取我的电力包
    router.post('/hashrate/chong/electricity', isAuthenticated, controller.user.chongElectricity);//充电力包


    router.get('/hashrate/test',controller.home.test);

};
