module.exports = {
    schedule: {
        interval: '60s', // 1 分钟间隔
        type: 'worker', // 指定所有的 worker 都需要执行
    },
    async task(ctx) {
        try {
            let res = await ctx.service.home.getUsdCnyRate();
            console.log(res);
            return;
        } catch (e) {
            this.ctx.logger.error('task >> update getUsdCnyRate error : ' + e.message);
            console.error('task >> update getUsdCnyRate error : ' + e.message);
            return;
        }

    },
};
