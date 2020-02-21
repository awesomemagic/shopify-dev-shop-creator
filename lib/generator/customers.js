
const _ = require('lodash');
const faker = require('faker');
const addresses = require('rrad/addresses-us-all.min.json').addresses;

const Generator = require('./base');

class GeneratorCustomers extends Generator {

    __generateCustomer() {
        const randomAddress = addresses[Math.floor(Math.random() * addresses.length)];
        const fakePhone = faker.phone.phoneNumberFormat();

        const data = {
            first_name: faker.name.firstName(),
            last_name: faker.name.lastName(),
            email: faker.internet.exampleEmail(),
            verified_email: true,
            addresses: []
        };

        const address = {
            address1: randomAddress.address1,
            address2: randomAddress.address2,
            city: randomAddress.city,
            province: randomAddress.state,
            phone: fakePhone,
            zip: randomAddress.postalCode,
            last_name: data.first_name,
            first_name: data.last_name,
            country: 'US'
        };

        data.addresses.push(address);
        return data;
    }

    async execute(amountOfCustomers) {
        return await this.baseExecution(async () => {
            const customer = this.__generateCustomer();
            return this.instance.customer.create(customer);
        }, amountOfCustomers);
    }

}

module.exports = GeneratorCustomers;
