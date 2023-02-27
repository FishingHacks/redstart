/**
 * @license GPL3
 * @author FishingHacks <https://github.com/FishingHacks>
 */

import { sync as spawnSync } from 'cross-spawn';
import chalk from 'chalk';
import { is, createSpinner, describeProvider } from '../../lib/utils';
import { Module } from '../../lib/types';

export default {
    validate({ config }) {
        return (
            is.set(config.repository) &&
            is.str(config.repository) &&
            (!is.set(config.branch) || is.str(config.branch))
        );
    },
    async initiate({ start, config, cwd }) {
        const { describe, describePromise } = describeProvider(start);

        const gitSpinner = describe('checking git...', () => {
            const gitSpinner = createSpinner('Checking git...');
            gitSpinner.start();
            if (spawnSync('git', ['-v'], { cwd }).error)
                gitSpinner.error({ text: 'Git is not installed' });
            return gitSpinner;
        });
        let remote = spawnSync('git', ['remote', 'get-url', 'origin'], {
            cwd,
        });
        if (remote.status !== 0) {
            describe('Initializing repository', () => {
                gitSpinner.update({ text: 'Initializing repository' });
                spawnSync('git', ['init'], { cwd });
            });
        }
        remote = spawnSync('git', ['remote'], {
            cwd,
        });
        if (remote.status !== 0)
            return gitSpinner.error({
                text: "[!] Error: Couldn't initialize git Repository",
            });
        return describePromise('Fetching repository', async () => {
            gitSpinner.update({ text: 'Fetching repository' });
            if (
                spawnSync(
                    'git',
                    ['remote', 'add', 'origin', config.repository as string],
                    {
                        cwd,
                    }
                ).status === 0
            )
                spawnSync('git', ['pull'], { cwd });
            await new Promise((r) => setTimeout(r, 1000));
            if (config.branch) {
                const cmd = 'checkout ' + config.branch;
                if (spawnSync('git', ['checkout', config.branch as string]).status !== 0)
                    console.error(
                        chalk.redBright(
                            '[!] Branch ' + config.branch + ' not found!'
                        )
                    );
            }
            if (spawnSync('git', ['pull'], { cwd }).status !== 0)
                return gitSpinner.error({
                    text: "Couldn't fetch remote repository",
                });
            gitSpinner.success({
                text: 'Successfully fetched remote repository',
            });
        });
    },
    description: 'Fetch a remote repository',
    requiredFields: [{
        name: 'repository',
        description: 'The URL of the git repository\nUsually ends in .git'
    }],
optionalFields: [{
    name: 'branch',
    description: 'The branch to pull from, required when there are multiple branches'
}]
} as Module;
