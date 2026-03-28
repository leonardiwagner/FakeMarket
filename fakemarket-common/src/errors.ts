export class InsufficientResourcesError extends Error {
    constructor(message = 'Insufficient resources to create order.') {
        super(message);
        this.name = 'InsufficientResourcesError';
    }
}

export class InsufficientMoneyError extends Error {
    constructor(message = 'Insufficient money to create order.') {
        super(message);
        this.name = 'InsufficientMoneyError';
    }
}
