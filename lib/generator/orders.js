
const _ = require('lodash');
const Generator = require('./base');

class GeneratorOrders extends Generator {

    __generateOrder(customer, products) {
        const address = _.omit(customer.default_address, ['default', 'id', 'customer_id', 'company']);
        const order = {
            customer: {
                id: customer.id
            },
            financial_status: 'paid',
            tax_lines: [],
            billing_address: address,
            send_receipt: false,
            send_fulfillment_receipt: false,
            test: true,
            transactions: []
        };
        const taxes = {
            price: 0,
            rate: _.random(10, 30) / 100,
            title: 'Fake Tax'
        };

        let totalCost = 0;
        let requiredShipping = false;
        order.line_items = products.map((product) => {
            const validVariants = product.variants.filter((v) => {
                return v.inventory_management !== 'shopify' || v.inventory_policy === 'continue' || v.inventory_quantity > 0;
            });
            if (!validVariants.length) {
                return false;
            }

            const variant = _.shuffle(validVariants)[0];
            const lineItem = {
                variant_id: variant.id,
                quantity: _.random(1, variant.inventory_quantity < 3 && variant.fulfillment_service === 'shopify' ? variant.inventory_quantity : 3)
            };

            totalCost += parseFloat(variant.price) * lineItem.quantity;
            if (!requiredShipping && variant.requires_shipping) {
                requiredShipping = true;
            }
            return lineItem;
        }).filter(Boolean);

        taxes.price = Math.round(totalCost * taxes.rate);
        order.total_tax = taxes.price;

        const transaction = {
            amount: totalCost + order.total_tax,
            kind: 'authorization',
            status: 'success'
        };

        if (requiredShipping) {
            const shippingLine = {
                custom: true,
                handle: null,
                price: _.random(0, 40),
                title: 'Fake shipping'
            };
            order.shipping_lines = [ shippingLine ];

            transaction.amount += shippingLine.price;
            order.shipping_address = address;
        }

        order.tax_lines.push(taxes);
        order.transactions.push(transaction);
        return order;
    }

    __getRandomProducts(products, amount) {
        return _.map(_.range(amount), () => {
            return products[_.random(0, products.length - 1)];
        });
    };

    async __orderTransactionCreation(order) {
        try {
            await this.wait(2000);
            const shopifyOrder = await this.instance.order.create(order);
            await this.wait(2000);
            const transaction = await this.instance.transaction.list(shopifyOrder.id).then(data => data[ 0 ]);
            await this.wait(2000);
            await this.instance.transaction.create(shopifyOrder.id, {
                kind: 'capture',
                gateway: 'manual',
                amount: transaction.amount,
                parent_id: transaction.id,
                status: 'success'
            });

            return shopifyOrder;
        } catch (error) {
            await this.wait(5000);
            throw error;
        }
    }

    async execute(amountOfOrder, products, customers) {
        const stat = {
            completedCustomers: 0,
            completedOrders: 0,
            lengthOrders: amountOfOrder,
            lengthCustomers: customers.length
        };

        const dataForChunk = customers.map((customer) => {
            let customerFactor = stat.lengthCustomers - stat.completedCustomers;
            if (customerFactor <= 0) {
                customerFactor = 1;
            }
            const ordersForCustomer = Math.ceil((stat.lengthOrders - stat.completedOrders) / customerFactor);

            stat.completedCustomers += 1;
            stat.completedOrders += ordersForCustomer;

            return { ordersForCustomer, customer };
        });

        await this.baseExecution(async({ ordersForCustomer, customer }) => {
            for (const number of _.range(ordersForCustomer)) {
                const randomProducts = this.__getRandomProducts(products, _.random(1,3));
                const order = this.__generateOrder(customer, randomProducts);
                await this.__orderTransactionCreation(order);
            }

            return true;
        }, null, dataForChunk, 1);

        return true;
    }

}

module.exports = GeneratorOrders;
