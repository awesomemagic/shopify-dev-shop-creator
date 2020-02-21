
const Shopify = require('shopify-api-node');
const _ = require('lodash');
const ora = require('ora');

class Generator {

    constructor(instanceText, shopDomain, apiKey, password) {
        this.loaderText = `Generate fake data for ${instanceText}...`;
        this.loader = ora(this.loaderText);

        this.instance = new Shopify({
            shopName: shopDomain,
            apiKey,
            password,
            autoLimit: true
        })
    }

    async wait(time = 1000) {
        return new Promise((resolve) => {
            setTimeout(resolve, time);
        });
    }

    async changeLoaderText(text, status) {
        this.loader.text = `${this.loaderText} ${text}`;
        if (status === 'succeed') {
            this.loader.succeed()
        }

        if (status === 'failed') {
            this.loader.failed()
        }
    }

    async baseExecution(chunkFunction, amount, inputData = [], chunkSize = 5) {
        const status = {
            completed: 0,
            failed: 0
        };
        const data = [];
        this.loader.start();

        try {
            const chunks = _.chunk(inputData.length ? inputData : _.range(amount), chunkSize);
            for (const chunk of chunks) {
                const res = await Promise.all(chunk.map(async (c) => {
                    try {
                        const data = await chunkFunction(c);
                        status.completed += 1;
                        return data;
                    } catch (_) {
                        status.failed += 1;
                    }
                    return true;
                }));

                this.changeLoaderText(`completed: ${status.completed}; failed: ${status.failed}`);
                data.push(res);
            }

            this.changeLoaderText(`completed: ${status.completed}; failed: ${status.failed}`, 'succeed');
            return _.flatten(data);
        } catch (error) {
            this.changeLoaderText(`completed: ${status.completed}; failed: ${status.failed}`, 'failed');
            console.log(error.message); // eslint-disable-line
        }
    }

}

module.exports = Generator;
