
SET NAMES utf8;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
--  Table structure for `hashrate_category`
-- ----------------------------
DROP TABLE IF EXISTS `hashrate_category`;
CREATE TABLE `hashrate_category` (
  `key_id` int(11) NOT NULL AUTO_INCREMENT,
  `img_key` varchar(200) COLLATE utf8_bin NOT NULL COMMENT '图片key值',
  `symbol` varchar(255) COLLATE utf8_bin DEFAULT NULL COMMENT '类别',
  `name` varchar(100) COLLATE utf8_bin NOT NULL COMMENT '名称',
  `unit` varchar(50) COLLATE utf8_bin NOT NULL COMMENT '单位',
  `status` int(11) NOT NULL DEFAULT '1' COMMENT '预留状态 默认为1  1为正常',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `admin_user_id` int(11) DEFAULT NULL COMMENT '创建人id',
  PRIMARY KEY (`key_id`),
  KEY `key_id_index` (`key_id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8 COLLATE=utf8_bin COMMENT='算力合约分类';

-- ----------------------------
--  Records of `hashrate_category`
-- ----------------------------
BEGIN;
INSERT INTO `hashrate_category` VALUES ('4', 'WechatIMG1.png', '', 'BTC', 'T', '1', '2019-07-29 13:48:32', '2019-07-29 13:48:32', '0');
COMMIT;

SET FOREIGN_KEY_CHECKS = 1;


DROP TABLE IF EXISTS `hashrate_order`;
CREATE TABLE `hashrate_order` (
  `order_id` varchar(50) COLLATE utf8_bin NOT NULL,
  `hashrate_treaty_id` int(11) NOT NULL COMMENT '算力合约ID',
  `user_id` int(11) NOT NULL COMMENT '用户ID',
  `buy_quantity` int(11) NOT NULL COMMENT '购买数量',
  `price` double NOT NULL,
  `pay_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '支付时间',
  `excavate_time` datetime DEFAULT NULL COMMENT '开挖日期',
  `end_time` date DEFAULT NULL COMMENT '挖矿终止时间',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建日期',
  `status` int(11) NOT NULL DEFAULT '1' COMMENT '1 已购买 2挖矿中 3已完结',
  PRIMARY KEY (`order_id`),
  KEY `order_id_index` (`order_id`),
  KEY `hashrate_treaty_id_index` (`hashrate_treaty_id`),
  KEY `user_id_index` (`user_id`),
  KEY `istime_index` (`excavate_time`,`end_time`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin COMMENT='算力订单表';


DROP TABLE IF EXISTS `hashrate_order_profit`;
CREATE TABLE `hashrate_order_profit` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `order_id` varchar(255) DEFAULT NULL COMMENT '算力订单号',
  `create_time` datetime DEFAULT NULL COMMENT '创建时间',
  `profit` double(255,8) DEFAULT NULL COMMENT '收益',
  `electricity` double(255,8) DEFAULT NULL COMMENT '电费所需',
  `coin_type` varchar(255) DEFAULT NULL COMMENT '货币类型',
  `status` int(11) DEFAULT NULL COMMENT '0收益未发放 1收益已发放',
  `user_id` int(11) DEFAULT NULL COMMENT '用户id',
  `category_name` varchar(255) DEFAULT NULL COMMENT '名称\n',
  `update_time` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `record_id` int(11) DEFAULT NULL COMMENT '算力资源资产发放记录表 ID hashrate_send_balance_record\n\n',
  `isdate` date DEFAULT NULL COMMENT '收益时间',
  PRIMARY KEY (`id`),
  KEY `isdate_index` (`isdate`) USING BTREE COMMENT '时间',
  KEY `order_id_index` (`order_id`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=latin1 COMMENT='算力订单收益表';

DROP TABLE IF EXISTS `hashrate_order_transaction`;
CREATE TABLE `hashrate_order_transaction` (
  `key_id` int(11) NOT NULL AUTO_INCREMENT,
  `order_id` varchar(255) CHARACTER SET utf8 COLLATE utf8_bin NOT NULL COMMENT '订单ID',
  `pay_type` varchar(50) CHARACTER SET utf8 COLLATE utf8_bin NOT NULL COMMENT '支付方式  货币',
  `transaction_money` double(255,8) NOT NULL COMMENT '交易金额',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `money_unit` varchar(50) NOT NULL DEFAULT 'BTC' COMMENT '单位',
  PRIMARY KEY (`key_id`),
  KEY `order_id_index` (`order_id`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8 COMMENT='订单交易关联表';


DROP TABLE IF EXISTS `hashrate_send_balance_record`;
CREATE TABLE `hashrate_send_balance_record` (
  `Id` int(11) NOT NULL AUTO_INCREMENT,
  `total_quantity` double(255,8) DEFAULT NULL COMMENT '总收益',
  `send_quantity` double(255,8) DEFAULT NULL COMMENT '发放收益',
  `coin_type` varchar(255) DEFAULT NULL COMMENT '货币类型',
  `update_time` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `create_time` datetime DEFAULT NULL COMMENT '创建时间',
  `electric` double(255,10) DEFAULT NULL COMMENT '电费',
  `status` int(11) DEFAULT '0' COMMENT '0未完成 1已完成',
  `isdate` date DEFAULT NULL COMMENT '资源日期',
  `total_hashrate` bigint(255) DEFAULT NULL COMMENT '总算力',
  `unit_output` double(255,8) DEFAULT NULL COMMENT '单位收益',
  PRIMARY KEY (`Id`),
  KEY `is_date_index` (`isdate`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=latin1 COMMENT='算力资源资产发放记录表\n';



SET NAMES utf8;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
--  Table structure for `hashrate_treaty`
-- ----------------------------
DROP TABLE IF EXISTS `hashrate_treaty`;
CREATE TABLE `hashrate_treaty` (
  `key_id` int(11) NOT NULL AUTO_INCREMENT,
  `hashrate_category` int(11) NOT NULL COMMENT '分类',
  `title` varchar(200) COLLATE utf8_bin NOT NULL COMMENT '标题名',
  `original_price` double(255,8) DEFAULT NULL COMMENT '原价',
  `price` double(255,8) NOT NULL COMMENT '价格',
  `inventory` int(11) NOT NULL COMMENT '库存',
  `inventory_left` int(11) NOT NULL,
  `run_cycle` int(11) NOT NULL COMMENT '运行周期',
  `sort` int(11) NOT NULL DEFAULT '0' COMMENT '排序 倒序',
  `status` int(11) NOT NULL DEFAULT '1' COMMENT '0待上架 1上架 2后台下架\n',
  `restriction` int(11) NOT NULL DEFAULT '0' COMMENT '每人限购  0无限',
  `intro` varchar(2000) COLLATE utf8_bin DEFAULT NULL COMMENT '简介',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `unit_money` varchar(50) COLLATE utf8_bin NOT NULL DEFAULT 'CNY',
  `admin_user_id` int(11) NOT NULL DEFAULT '0',
  `electric_bill` double(255,6) DEFAULT '0.000000' COMMENT '电费',
  `earnings_rate` double(255,6) DEFAULT NULL COMMENT '预计收益',
  `management` double(255,8) DEFAULT NULL COMMENT '管理费',
  `effective_date` date DEFAULT NULL COMMENT '生效日期',
  `futures_type` int(11) DEFAULT '0' COMMENT '期货类型 0非期货 1期货类',
  `tag` int(11) NOT NULL DEFAULT '0' COMMENT '0是普通版 1优惠版',
  PRIMARY KEY (`key_id`),
  KEY `key_id_index` (`key_id`),
  KEY `hashrate_category_index` (`hashrate_category`)
) ENGINE=InnoDB AUTO_INCREMENT=49 DEFAULT CHARSET=utf8 COLLATE=utf8_bin COMMENT='算力合约表';

-- ----------------------------
--  Records of `hashrate_treaty`
-- ----------------------------
BEGIN;
INSERT INTO `hashrate_treaty` VALUES ('18', '4', '决战丰水期 30天算力包(猎豹F3)', '34.66670000', '32.32000000', '1000', '1000', '30', '3', '0', '0', '决战丰水期 30天算力包(猎豹F3)', '2019-07-02 17:40:04', '2019-07-18 14:51:39', 'CNY', '22', '0.588000', '0.564800', '0.01000000', null, null, '0'), ('19', '4', '决战丰水期 90天算力包(猎豹F3)', '92.08330000', '91.16250000', '1000', '1000', '90', '4', '0', '0', '决战丰水期 90天算力包(猎豹F3)', '2019-07-02 17:41:23', '2019-07-18 14:51:58', 'CNY', '22', '0.588000', '0.610800', '0.01000000', null, null, '0'), ('20', '4', '期货版 180天算力包(猎豹F5i)', '162.50000000', '162.50000000', '0', '0', '180', '1', '1', '0', '期货版 180天算力包(猎豹F5i)', '2019-07-02 17:43:03', '2019-07-18 14:52:07', 'CNY', '22', '0.461000', '0.632900', '0.01000000', null, null, '0'), ('21', '4', '期货版 360天算力包(猎豹F5i)', '213.33330000', '213.33330000', '0', '0', '360', '2', '1', '0', '期货版 360天算力包(猎豹F5i)', '2019-07-02 17:43:38', '2019-07-18 14:52:10', 'CNY', '22', '0.461000', '0.704000', '0.01000000', null, null, '0'), ('22', '4', '决战丰水期 30天算力包优惠版(猎豹F3)', '34.66670000', '34.32000000', '1000', '1000', '30', '3', '1', '0', '决战丰水期 30天算力包优惠版(猎豹F3)', '2019-07-31 15:36:53', '2019-07-31 15:36:53', 'CNY', '22', '0.558000', '0.439000', '0.01000000', null, '0', '0'), ('27', '4', '决战丰水期 90天算力包优惠版(猎豹F3)', '92.08330000', '91.16250000', '1000', '1000', '90', '4', '1', '0', '决战丰水期 90天算力包优惠版(猎豹F3)', '2019-07-31 15:39:45', '2019-07-31 15:39:45', 'CNY', '220', '0.558000', '0.485800', '0.01000000', null, '0', '0');
COMMIT;

SET FOREIGN_KEY_CHECKS = 1;

SET NAMES utf8;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
--  Table structure for `spider_coin_market`
-- ----------------------------
DROP TABLE IF EXISTS `spider_coin_market`;
CREATE TABLE `spider_coin_market` (
  `coin` varchar(255) NOT NULL,
  `block_reward` varchar(255) DEFAULT NULL COMMENT '区块儿奖励',
  `block_time` int(11) DEFAULT NULL COMMENT '出块时间',
  `coin_price` varchar(255) DEFAULT NULL,
  `curr_connections` int(11) DEFAULT NULL,
  `curr_diff` varchar(255) DEFAULT NULL,
  `hash_unit` varchar(255) DEFAULT NULL,
  `min_payment_amount` varchar(255) DEFAULT NULL,
  `mining_algorithm` varchar(255) DEFAULT NULL,
  `network_hashrate` varchar(255) DEFAULT NULL,
  `payment_end_time` varchar(255) DEFAULT NULL,
  `payment_start_time` varchar(255) DEFAULT NULL,
  `pool_hashrate` varchar(255) DEFAULT NULL,
  `pricing_currency` varchar(255) DEFAULT NULL,
  `pricing_currency_symbol` varchar(255) DEFAULT NULL,
  `unit_output` varchar(255) DEFAULT NULL,
  `unit_output_currency` varchar(255) DEFAULT NULL,
  `is_date` datetime DEFAULT NULL,
  PRIMARY KEY (`coin`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- ----------------------------
--  Records of `spider_coin_market`
-- ----------------------------
BEGIN;
INSERT INTO `spider_coin_market` VALUES ('BCH', '12.5', '600', '320.93', '10774', '283556371774.81', 'TH/s', '0.01', 'SHA256d', '2019315507957405952', '16', '10', '124001883415830848', 'USD', '$', '0.0008442', '0.27', '2019-08-01 14:00:00'), ('BSV', '12.5', '600', '144.37', '527', '198271695864.87', 'TH/s', '0.01', 'SHA256d', '1380381841614179072', '16', '10', '6112511212723896', 'USD', '$', '0.00165857', '0.23', '2019-08-01 14:00:00'), ('BTC', '12.5', '600', '9925.51', '410364', '9013786945891.68', 'TH/s', '0.01', 'SHA256d', '84383640103035224064', '16', '10', '5490420953797364736', 'USD', '$', '0.00002743', '0.27', '2019-08-01 14:00:00'), ('BTM', '412.5', '150', '0.11', '38', '33179995762', 'KH/s', '0.1', 'Tensority', '461555515', '16', '10', '903588', 'USD', '$', '1.03121572', '0.11', '2019-08-01 14:00:00'), ('DASH', '1.55331345', '150', '105.31', '6570', '125662837.49', 'GH/s', '0.001', 'X11', '3778934816457618', '16', '10', '118226895765727', 'USD', '$', '0.00022654', '0.02', '2019-08-01 14:00:00'), ('DCR', '10.23263424', '300', '26.53', '53', '34347814773.18', 'TH/s', '0.01', 'Blake256', '538418668180347592', '16', '10', '482937576008362', 'USD', '$', '0.00583611', '0.15', '2019-08-01 14:00:00'), ('ETC', '1.97142857', '15', '5.88', '15', '116884603529178', 'MH/s', '0.01', 'Ethash', '7792306901945', '16', '10', '2768000000', 'USD', '$', '0.00139531', '0.00', '2019-08-01 14:00:00'), ('ETH', '1.97142857', '15', '213.17', '1631', '2186134377669128', 'MH/s', '0.01', 'Ethash', '109306718883456', '16', '10', '203313000000', 'USD', '$', '0.00007597', '0.01', '2019-08-01 14:00:00'), ('LTC', '25', '150', '96.35', '101944', '16191185.74', 'MH/s', '0.001', 'Scrypt', '456586987154978.87', '16', '10', '41100404949647', 'USD', '$', '0.00002985', '0.00', '2019-08-01 14:00:00'), ('XMR', '2.51129111', '150', '80.26', '609', '37323753397', 'KH/s', '0.001', 'Cryptonight', '311031278.3', '16', '10', '233162', 'USD', '$', '0.00547795', '0.43', '2019-08-01 14:00:00'), ('ZEC', '10', '150', '66.8', '3927', '100803074.08', 'KSol/s', '0.001', 'Equihash', '5349516851', '16', '10', '145717271', 'USD', '$', '0.00124766', '0.08', '2019-08-01 14:00:00');
COMMIT;

SET FOREIGN_KEY_CHECKS = 1;

