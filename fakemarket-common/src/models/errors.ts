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

export class MoneyHoldingNotFoundError extends Error {
    constructor(message = 'User does not have a money holding.') {
        super(message);
        this.name = 'MoneyHoldingNotFoundError';
    }
}

export class ResourceHoldingNotFoundError extends Error {
    constructor(message = 'User does not have a holding for the requested resource.') {
        super(message);
        this.name = 'ResourceHoldingNotFoundError';
    }
}

export class OrderToCancelNotFound extends Error {
    constructor(message = 'Order to cancel not found.') {
        super(message);
        this.name = 'OrderToCancelNotFound';
    }
}
