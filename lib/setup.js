const puppeteer = require('puppeteer');
const ora = require('ora');
const inquirer = require('inquirer');

const config = require('./config');
const LibLogin = require('./login');
const LibRegister = require('./register');
const LibShop = require('./shop');

const LibGenerateProducts = require('./generator/products');
const LibGenerateCustomers = require('./generator/customers');
const LibGenerateOrders = require('./generator/orders');

class Setup {

    constructor () {
        this.loginInstance = null;
    }

    async checkEmailPasswordPartnerAccount() {
        const notCredentials = !config.get('email') || !config.get('password');

        if (notCredentials || !config.get('partnerAccount')) {
            if (notCredentials) {
                const creds = await inquirer.prompt([
                    {
                        type: 'input',
                        name: 'email',
                        message: 'Please enter your email for developers.shopify.com:',
                    },
                    {
                        type: 'password',
                        name: 'password',
                        message: 'Please enter password:',
                    }
                ]);

                await config.set('email', creds.email);
                await config.set('password', creds.password);
            }

            this.loginInstance = new LibLogin(config.get('email'), config.get('password'));

            const checkingText = 'Checking credentials and getting your partner accounts';
            const loginSpinner = ora(checkingText).start();
            const loginBrowser = await puppeteer.launch({
                headless: true,
                devtools: false
            });
            const loginPage = await loginBrowser.newPage();

            try {
                const accounts = await this.loginInstance.fetchPartnerAccounts(loginPage);
                await loginBrowser.close();

                if (!accounts.length) {
                    loginSpinner.fail(`${checkingText} - no accounts were found`);
                    return false;
                }

                loginSpinner.succeed(checkingText);

                const answers = await inquirer.prompt([
                    {
                        type: 'list',
                        name: 'partnerAccount',
                        message: 'Please choose partner account with which you would like to proceed:',
                        choices: accounts
                    }
                ]);

                await config.set('partnerAccount', answers.partnerAccount);

                return true;
            } catch (error) {
                loginSpinner.fail(`${checkingText} - no accounts were found`);
                return false;
            }
        }

        this.loginInstance = new LibLogin(config.get('email'), config.get('password'));
        return true;
    }

    async flow() {
        const result = await this.checkEmailPasswordPartnerAccount();
        if (!result) {
            return false;
        }

        return await this.getNextStep();
    }

    async getNextStep() {
        const partnerAccount = config.get('partnerAccount');
        const createNewStoreChoice = `Create new store in "${partnerAccount}" partner account`;
        const switchToAnotherPartnerAccount = 'Switch to another partner account';
        const generateFakeData = `Generate fake data for ${config.get('shopDomain')}`;
        const availableChoices = [createNewStoreChoice, switchToAnotherPartnerAccount];

        if (config.get('shopDomain') && config.get('apiKey') && config.get('password')) {
            availableChoices.push(generateFakeData);
        }

        const answers = await inquirer.prompt([
            {
                type: 'list',
                name: 'action',
                message: 'What you would like to do?',
                choices: availableChoices
            }
        ]);

        if (answers.action === switchToAnotherPartnerAccount) {
            await config.set('partnerAccount', null);
            return this.flow();
        }

        if (answers.action === generateFakeData) {
            await this.generateFakeData(config.get('shopDomain'), config.get('apiKey'), config.get('password'));
            return true;
        }

        if (answers.action === createNewStoreChoice) {
            const generateAnswers = await inquirer.prompt([
                {
                    type: 'input',
                    name: 'headless',
                    message: 'Create shop in headless mode?',
                    default: 'yes'
                },
                {
                    type: 'input',
                    name: 'fakeData',
                    message: 'Generate fake products (100), customers (50) and orders (50)?',
                    default: 'yes'
                }
            ]);

            const browser = await puppeteer.launch({
                headless: generateAnswers.headless === 'yes',
                devtools: false,
                defaultViewport: {
                    width: 1200,
                    height: 600
                }
            });

            const apiCreds = await this.registerShop(browser);

            await config.set('shopDomain', apiCreds.shopDomain);
            await config.set('apiKey', apiCreds.apiKey);
            await config.set('password', apiCreds.password);

            await browser.close();

            if (generateAnswers.fakeData === 'yes') {
                await this.generateFakeData(apiCreds.shopDomain, apiCreds.apiKey, apiCreds.password);
            }

            return true;
        }
    }

    async registerShop(browser) {
        const register = new LibRegister();
        const page = await browser.newPage();
        await this.loginInstance.developersConsole(page, config.get('partnerAccount'));
        const { companyName, shopDomain } = await register.fakeShop(page);
        const shop = new LibShop(shopDomain);
        await shop.setup(page);
        return await shop.getPrivateAppApiKeyAndPassword(page);
    };

    async generateFakeData(shopDomain, apiKey, password) {
        const generateProducts = new LibGenerateProducts('products', shopDomain, apiKey, password);
        const products = await generateProducts.execute(10);

        const generateCustomers = new LibGenerateCustomers('customers', shopDomain, apiKey, password);
        const customers = await generateCustomers.execute(5);

        const generateOrders = new LibGenerateOrders('orders', shopDomain, apiKey, password);
        await generateOrders.execute(2, products, customers);

        return true;
    };
}

module.exports = new Setup();
