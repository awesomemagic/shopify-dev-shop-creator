
const faker = require('faker');
const _ = require('lodash');

const Generator = require('./base');

class GeneratorProducts extends Generator {

    __fake(fake) {
        return faker.fake(`{{${fake}}}`)
    }

    __randomImageSize(number) {
        const array = ['640/480', '1024/768', '1080/1080', '1280/720', '1280/960'];
        return array[number] ? array[number] : array[1];
    }

    __randomRange(max, min = 0) {
        return _.range(_.random(min, max));
    }

    __randomYesNo() {
        return _.random(0, 1) === 0;
    }

    __getPrice(basePrice = null, compareAt = false) {
        if (!basePrice) {
            return _.random(0, 100);
        }
        const smallAmount = _.random(0, 10);
        return compareAt || this.__randomYesNo() ? basePrice + smallAmount : basePrice - smallAmount;
    }

    __allOptionsCombos(list, n = 0, result = [], current = []) {
        if (n === list.length) {
            result.push(current);
        } else {
            list[n].forEach(item => this.__allOptionsCombos(list, n + 1, result, [...current, item]))
        }

        return result;
    }

    __randomVariantsOptions(count) {
        const fakeOptions = [{
            name: 'Color',
            faker: 'commerce.color',
            max: 5
        }, {
            name: 'Adjective',
            faker: 'commerce.productAdjective',
            max: 5
        }, {
            name: 'Material',
            faker: 'commerce.productMaterial',
            max: 5
        }, {
            name: 'Day',
            faker: 'date.weekday',
            max: 3
        }, {
            name: 'File type',
            faker: 'system.commonFileType',
            max: 3
        }];

        if (count === 0) {
            return {
                variants: [
                    {
                        title: 'Default title',
                        price: this.__getPrice(),
                        option1: 'Default Title'
                    }
                ],
                options: []
            }
        }
        const options = [];
        for (const option of _.shuffle(fakeOptions)) {
            options.push({
                name: option.name,
                values: _.uniq(_.map(this.__randomRange(option.max, 1), () => {
                    return this.__fake(option.faker);
                }))
            });

            if (options.length >= count) {
                break;
            }
        }

        const combos = this.__allOptionsCombos(_.map(options, (o) => o.values));

        const basePrice = _.random(1, 1000);
        const requireShipping = this.__randomYesNo();
        const variants = _.map(combos, (combo) => {
            // random value if variant exists
            if (_.random(0, 10) > 8) {
                return false;
            }

            const data = {
                title: combo.join(' - '),
                inventory_quantity: _.random(0, 100),
                inventory_policy: 'deny',
                inventory_management: this.__randomYesNo() ? 'shopify' : null,
                requires_shipping: requireShipping
            };

            if (data.inventory_management === 'shopify') {
                data.inventory_policy = this.__randomYesNo() ? 'continue' : 'deny';
            }

            data.price = this.__getPrice(basePrice);
            data.compare_at_price = this.__randomYesNo() ? this.__getPrice(data.price, true) : null;

            if (data.requires_shipping) {
                data.weight = _.random(1, 100);
            }

            _.each(combo, (c, key) => {
                data[`option${key + 1}`] = c;
            });

            return data;
        }).filter(Boolean);

        return { options, variants }
    }

    __generateProduct() {
        const data = {
            title: this.__fake('commerce.productName'),
            body_html: `<p>${this.__fake('lorem.paragraphs')}</p>`,
            vendor: '',
            product_type: this.__fake('commerce.department'),
        };

        data.images = _.map(this.__randomRange(4), () => {
            return {
                src: `https://picsum.photos/${this.__randomImageSize(_.random(0,4))}.jpg`
            }
        });
        const { variants, options } = this.__randomVariantsOptions(_.random(0,3));
        data.variants = variants;
        data.options = options;

        return data;
    }

    async execute(amountOfProducts) {
        return await this.baseExecution(async () => {
            const product = this.__generateProduct();
            return this.instance.product.create(product);
        }, amountOfProducts);
    }
}

module.exports = GeneratorProducts;
