/**
 * @license GPL3
 * @author FishingHacks <https://github.com/FishingHacks>
 */

import { join } from 'path';
import { Module } from '../../lib/types';
import { is, createSpinner, isChecker } from '../../lib/utils';

export default {
    validate({ config }) {
        return isChecker(config.testfile)
            .set()
            .str()
            .pipe((el) => el.endsWith('.mjs') || el.endsWith('.js')).isValid;
    },
    initiate({config, cwd}) {
        const testspinner = createSpinner('Loading testfile...');
        try {
            let test = require(join(cwd, config.testfile.toString()));
            if (typeof test?.default === 'function') test = test.default; // in case test is a module
            if (!test || typeof test !== 'function')
                return testspinner.error({ text: 'Test file not found!' });
            const returnValue = test(cwd);
            if (returnValue === true)
                return testspinner.success({ text: 'Tests completed!' });
            else if (returnValue === false)
                return testspinner.error({ text: 'Tests failed!' });
            else if (typeof returnValue === 'number' && returnValue === 0)
                return testspinner.success({
                    text: 'Tests completed!',
                });
            else if (typeof returnValue === 'number')
                return testspinner.error({
                    text:
                        'Tests failed! Tests failed: ' + returnValue.toString(),
                });
            else
                return testspinner.stop({
                    text: "The testing function didn't return a boolean or number.",
                });
        } catch (e) {
            testspinner.error({
                text: 'Error during the execution of the tests!',
            });
            console.error(e);
        }
    },
    description: 'Test your js functions',
    optionalFields: [{
        name: 'testfile',
        description: 'The testfile. It should export a function or {default: function}, which should return true/false or the number of failed tests.\nIt get\'s called with the directory, the .rsproj file is in.',
        type: 'string'
    }],
    requiredFields: []
} as Module;
