module.exports = {
    schedule: {
        interval: '30s', // 1 分钟间隔
        type: 'worker', // 指定所有的 worker 都需要执行
    },
    async task(ctx) {
        try {
            let res = await ctx.service.home.getDayEarnings();
            console.log(res);
            return;
        } catch (e) {
            this.ctx.logger.error('task >> update day earnings error : ' + e.message);
            console.error('task >> update day earnings error : ' + e.message);
            return;
        }

    },
};
