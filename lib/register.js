
const faker = require('faker');

const typeToInput = (page, selector, value) => {
    return page.type(selector, value, { delay: 100 });
};

const fakeData = {
    companyPrefix: 'Alex',
    shopPassword: 'qwerty1234567',
    shopAddress: {
        address: '777 E Colorado Blvd',
        city: 'Pasadena',
        zipCode: '91101',
        state: 'CA',
        country: 'US'
    },
    shopPhone: '3232323232'
};

class Register {

    async fakeShop(page) {
        await page.click('.ui-nav a[href*="stores"]', { delay: 1000 });

        const addNewStoreButton = "a[href*='stores/new']";
        await page.waitFor(3000);
        await page.$eval(addNewStoreButton, (el) => el.click());

        await page.waitForXPath('//span[contains(text(), "Development store")]');
        const [developmentOptions] = await page.$x('//span[contains(text(), "Development store")]');
        if (!developmentOptions) {
            throw new Error('Development store option not found');
        }

        developmentOptions.click({ delay: 500 });
        await page.waitFor(2000);

        const companyName = faker.fake(`${fakeData.companyPrefix} {{company.companyName}} {{company.companySuffix}}`);

        const storeNameInput = "input[name='signup[shop_name]']";
        await page.waitFor(storeNameInput, { visible: true });
        await typeToInput(page, storeNameInput, companyName);

        await typeToInput(page, "input[name='signup[password]']", fakeData.shopPassword);
        await typeToInput(page, "input[name='signup[confirm_password]']", fakeData.shopPassword);

        await typeToInput(page, "input[name='signup[address1]']", fakeData.shopAddress.address);

        // click three times to select all
        await page.click("input[name='signup[city]']", {clickCount: 3});
        await typeToInput(page, "input[name='signup[city]']", fakeData.shopAddress.city);
        await typeToInput(page, "input[name='signup[zip]']", fakeData.shopAddress.zipCode);

        await page.select("select[name='signup[country]']", fakeData.shopAddress.country);
        await page.select("select[name='signup[province]']", fakeData.shopAddress.state);

        const [storePurpose] = await page.$x('//span[contains(text(), "Test an app or theme")]');
        if (!storePurpose) {
            throw new Error('Store purpose option not found');
        }
        await storePurpose.click({ delay: 500 });
        const shopDomain = await page.$eval('input[name="storeDomain"]', (el) => el.value);

        const [saveButton] = await page.$x('//span[contains(text(), "Save")]');
        if (!saveButton) {
            throw new Error('Save button not found');
        }
        await saveButton.click({ delay: 500 });

        await page.waitForXPath(`//span[contains(text(), "${companyName}")]`, {
            visible: true,
            timeout: 60000
        });

        return { companyName, shopDomain: `${shopDomain}.myshopify.com` };
    }

}

module.exports = Register;
