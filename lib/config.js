
const _ = require('lodash');
const fs = require('fs');
const path = require('path');
const util = require('util');
const writeFile = util.promisify(fs.writeFile);
const readFile = util.promisify(fs.readFile);

class Config {
    constructor (fileName = '.config.json') {
        this.configData = {};
        this.fileName = fileName;
    }

    __resolvePath() {
        return path.resolve(__dirname, '../', this.fileName);
    };

    __saveFile() {
        return writeFile(this.__resolvePath(), JSON.stringify(this.configData));
    }

    __checkIfFileExists() {
        return new Promise((resolve, reject) => {
            fs.access(this.__resolvePath(), fs.constants.F_OK, (err) => {
                if (err) {
                    return resolve(false);
                }

                return resolve(true);
            });
        });
    };

    async __checkConfigFile() {
        const fileExists = await this.__checkIfFileExists();
        if (!fileExists) {
            this.__saveFile();
        }
    };

    async init() {
        await this.__checkConfigFile();
        const fileData = await readFile(this.__resolvePath());
        this.configData = JSON.parse(fileData);
    };

    get(field) {
        return _.get(this.configData, field, null);
    }

    set(field, value) {
        _.set(this.configData, field, value);

        return this.__saveFile()
    }
}

const instance = new Config();
module.exports = instance;
