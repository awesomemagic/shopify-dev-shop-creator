
const config = require('./config');

class Shop {
    constructor(shopDomain) {
        this.shopDomain = shopDomain;

        this.phoneNumber = '3232323232';
        this.notDisabledSaveXPath = '//button[not(@disabled)]//span[contains(text(), "Save")]';
    }

    async settingsGeneralPhone(page) {
        await page.goto(`https://${this.shopDomain}/admin/settings/general`, { waitUntil: 'networkidle2' });

        const companyNameInput = "input[name='shop[company_name]']";
        await page.waitFor(companyNameInput, { visible: true });
        const companyName = await page.$eval(companyNameInput, el => el.value);
        if (!companyName) {
            const storeName = await page.$eval("input[name='shop[name]']", el => el.value);
            await page.type(companyNameInput, storeName, { delay: 100 });
        }

        const phoneInput = "input[name='shop[phone]']";
        const phone = await page.$eval(phoneInput, el => el.value);
        if (!phone) {
            await page.type(phoneInput, this.phoneNumber, { delay: 100 });
        }

        if (!companyName || !phone) {
            const saveButton = 'button[type="submit"][name="commit"]';
            await page.waitFor(`${saveButton}:not(:disabled)`, { visible: true });
            await page.click(saveButton, { delay: 500 });

            await page.waitForXPath('//div[contains(text(), "Settings saved")]');
        }
        return true;
    }

    async turnOffNotifications(page) {
        await page.goto(`https://${this.shopDomain}/admin/settings/notifications`, { waitUntil: 'networkidle2' });

        const disableButtonXPath = '//a[contains(@href, "admin/order_subscriptions")][contains(text(), "Disable")]';
        await page.waitForXPath('//table//th[contains(text(), "Recipients")]', { visible: true });
        const [disableButton] = await page.$x(disableButtonXPath);

        if (disableButton) {
            await disableButton.click({ delay: 500 });
            await page.waitForXPath('//div[contains(text(), "has been disabled")]', { visible: true });
        }

        return true;
    }

    __waitForSaveButton(page) {
        const saveButton = '//button//span[contains(text(), "Save")]';
        return page.waitForXPath(saveButton, { visible: true });
    }

    async paymentProviders(page) {
        await page.goto(`https://${this.shopDomain}/admin/settings/payments`, { waitUntil: 'networkidle2' });

        await this.__waitForSaveButton(page);

        const [activateShopifyPayments] = await page.$x('//button//span[contains(text(), "Activate Shopify Payments")]');
        if (activateShopifyPayments) {
            await activateShopifyPayments.click({ delay: 500 });
            await page.waitForXPath('//div//p[contains(text(), "Your store accepts credit cards with Shopify Payments")]');
        }

        await page.goto(`https://${this.shopDomain}/admin/settings/payments/shopify-payments`, { waitUntil: 'networkidle2' });
        await this.__waitForSaveButton(page);

        const [testModeMessage] = await page.$x('//p[contains(text(), "Test mode is on")]');
        if (!testModeMessage) {
            const phoneInput = "input[name='customerBillingStatement.phoneNumber']";
            const phone = await page.$eval(phoneInput, el => el.value);
            if (!phone) {
                await page.type(phoneInput, this.phoneNumber, { delay: 100 });
            }

            const [enableTestMode] = await page.$x('//span[contains(text(), "Enable test mode")]');
            enableTestMode.click({ delay: 500 });

            await page.waitForXPath('//p[contains(text(), "When test mode is on")]', { visible: true });
            await page.waitForXPath(this.notDisabledSaveXPath, { visible: true });
            const [saveButton] = await page.$x(this.notDisabledSaveXPath);
            await saveButton.click({ delay: 500 });

            await page.waitForXPath('//div[contains(text(), "Shopify Payments updated")]', { visible: true, timeout: 60000 });
        }

        await page.goto(`https://${this.shopDomain}/admin/settings/payments`, { waitUntil: 'networkidle2' });
        await this.__waitForSaveButton(page);

        const [captureAutomatically] = await page.$x('//span[contains(text(), "Automatically")]');
        captureAutomatically.click({ delay: 500 });

        await page.waitFor(1000);

        const [saveButton] = await page.$x(this.notDisabledSaveXPath);
        if (saveButton) {
            await saveButton.click({ delay: 500 });
            await page.waitForXPath('//div[contains(text(), "Settings saved")]', { visible: true });
        }

        return true;
    }

    async removePasswordProtection(page) {
        await page.goto(`https://${this.shopDomain}/admin/online_store/preferences`, { waitUntil: 'networkidle2' });

        await page.waitFor('iframe[title="Online Store Preferences"]', { visible: true });

        const iframe = page.frames().find(frame => frame.name() === 'app-iframe');
        await this.__waitForSaveButton(iframe);
        const [passwordMessage] = await iframe.$x('//p[contains(text(), "Online store is password protected")]');
        if (passwordMessage) {
            const [enablePassword] = await iframe.$x('//span[contains(text(), "Enable password")]');
            await enablePassword.click({ delay: 500 });

            await iframe.waitForXPath(this.notDisabledSaveXPath);
            const [saveButton] = await iframe.$x(this.notDisabledSaveXPath);
            await saveButton.click({ delay: 500 });

            await page.waitForXPath('//div[contains(text(), "Settings saved")]', { visible: true });
        }

        return true;
    }

    async __getDataFromPrivateApp(page) {
        await page.waitFor('input[name="api_key"]');
        const apiKey = await page.$eval('input[name="api_key"]', (el) => el.value);
        const password = await page.$eval('input[name="private_app_password"]', (el) => el.value);
        return { shopDomain: this.shopDomain, apiKey, password };
    }

    async getPrivateAppApiKeyAndPassword(page) {
        const privateAppName = 'shopify-dev-shop-creator';
        await page.goto(`https://${this.shopDomain}/admin/apps/private`, { waitUntil: 'networkidle2' });

        const privateAppXPath = '//h1[contains(text(), "Private apps")]';
        await page.waitForXPath(privateAppXPath, { visible: true });
        const [privateAppLink] = await page.$x(`//a[contains(text(), "${privateAppName}")]`);
        if (privateAppLink) {
            await privateAppLink.click({ delay: 500 });
            return await this.__getDataFromPrivateApp(page);
        }

        await page.goto(`https://${this.shopDomain}/admin/apps/private/new`, { waitUntil: 'networkidle2' });

        const appNameInput = "input[name='api_client[title]']";

        await page.waitFor(appNameInput, { visible: true });
        await page.type(appNameInput, privateAppName, { delay: 100 });

        await page.type("input[name='api_client[contact_email]']", config.get('email'), { delay: 100 });

        const [ moreButton ] = await page.$x('//button[contains(text(), "▼ Review disabled Admin API permissions")]');
        await moreButton.click({ delay: 500 });

        await page.select('#api_client\\[access_scope\\]\\[products\\]\\[authenticated\\]', 'write_products');
        await page.select('#api_client\\[access_scope\\]\\[orders\\]\\[authenticated\\]', 'write_orders');
        await page.select('#api_client\\[access_scope\\]\\[customers\\]\\[authenticated\\]', 'write_customers');

        await this.__waitForSaveButton(page);

        const [ saveButton ] = await page.$x('//button[not(@disabled)][contains(text(), "Save")]');
        await saveButton.click({ delay: 500 });

        await page.waitFor(2000);

        const confirmButton = '//button[contains(text(), "I understand, create the app")]';
        await page.waitForXPath(confirmButton, { visible: true });

        const [ cButton ] = await page.$x(confirmButton);
        await cButton.click({ delay: 500 });

        await page.waitForXPath('//div[contains(text(), "API credentials saved")]', { visible: true });
        return await this.__getDataFromPrivateApp(page);
    }

    async setup(page) {
        await this.settingsGeneralPhone(page);
        await this.turnOffNotifications(page);
        await this.paymentProviders(page);
        await this.removePasswordProtection(page);
    }
}

module.exports = Shop;
