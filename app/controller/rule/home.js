module.exports = {
    getHashrateTreatyDetails: {
        keyId: {type: 'string', required: true, allowEmpty: false}
    },
    buyinOrder: {
        buyQuantity: {type: 'number', required: true, allowEmpty: false, min: 1},
        payType: {type: 'string', required: true, allowEmpty: false},
        keyId: {type: 'number', required: true, allowEmpty: false},
        transactionPassword: {type: 'string', required: true, allowEmpty: false}
    },
    buyquantity: {
        keyId: {type: 'number', required: true, allowEmpty: false},
        buyQuantity: {type: 'number', required: true, allowEmpty: false},
        payType: {type: 'string', required: true, allowEmpty: false}
    },
    getMyOrderDetails: {
        orderId: {type: 'string', required: true, allowEmpty: false}
    }
};
