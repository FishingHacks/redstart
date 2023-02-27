import chalk from 'chalk';
import { sync } from 'cross-spawn';
import { Module } from '../../lib/types';
import { is } from '../../lib/utils';

export default {
    validate: () => true,
    initiate: () => {
        if (is.processError(sync('tsc', ['--init'])))
            console.error(chalk.redBright('[!] TSC is not installed'));
        else console.log(chalk.greenBright('[+] Initialized typescript'));
    },
    description: 'Initialize a typescript project (creates a tsconfig.json file)',
    optionalFields: [],
    requiredFields: [],
} as Module;
