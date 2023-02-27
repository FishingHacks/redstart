/**
 * @license GPL3
 * @author FishingHacks <https://github.com/FishingHacks>
 */
import {
    createSpinner,
    describeProvider,
    isChecker,
} from '../../lib/utils';
import chalk from 'chalk';
import checkPackageManager from '../../lib/checkPackageManager';

import { sync as spawnSync } from 'cross-spawn';
import { Module } from '../../lib/types';

export default {
    validate({ config }) {
        return isChecker(config.packageManager)
            .set()
            .str()
            .pipe((el) => ['yarn', 'pnpm', 'npm'].includes(el)).isValid;
    },
    async initiate({ start, config, cwd }) {
        const { describe, describePromise } = describeProvider(start);

        await describePromise('Checking package manger', async () => {
            console.log(chalk.green(`[/] Using ${config.packageManager}`));
            const pmSpinner = createSpinner('Checking package manager...');
            pmSpinner.start();
            const isInstalled = await checkPackageManager(
                config.packageManager as 'npm' | 'yarn' | 'pnpm'
            );
            if (!isInstalled) {
                pmSpinner.error({ text: 'Package manager not installed!' });
                return;
            }
            pmSpinner.success({ text: 'Package manager checked!' });
        });

        const packageSpinner = createSpinner('Installing packages...');
        packageSpinner.start();
        const packageManager = config.packageManager as 'yarn' | 'pnpm' | 'npm';

        describe('Installing packages', () => {
            packageSpinner.update({ text: 'Installing packages' });
            const packageManagerArgs = [
                packageManager === 'yarn' ? 'add' : 'install',
            ];
            const packageManagerProcess = spawnSync(
                `${packageManager}`,
                packageManagerArgs,
                {
                    cwd,
                }
            );

            if (packageManagerProcess.status !== 0) {
                packageSpinner.error({ text: 'Failed to install packages!' });

                return;
            }

            packageSpinner.success({ text: 'Packages installed!' });

            console.log(chalk.green('[+] Initialized project successfully!'));
        });
    },
    description: 'Install node packages',
    optionalFields: [],
    requiredFields: [{
        name: 'packageManager',
        description: 'The package manager to use. Either yarn, pnpm or npm'
    }]
} as Module;
