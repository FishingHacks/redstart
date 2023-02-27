/**
 * @license GPL3
 * @author FishingHacks <https://github.com/FishingHacks>
 */

import chalk from 'chalk';
import { sync as spawnSync } from 'cross-spawn';
import { existsSync } from 'fs';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { Module } from '../../lib/types';
import { is } from '../../lib/utils';

export default {
    validate({ config }) {
        return (
            is.set(config.mainFile) &&
            is.str(config.mainFile) &&
            (!is.set(config.arguments) || is.arr(config.arguments)) &&
            (!is.set(config.envFile) || is.str(config.envFile))
        );
    },
    async initiate({ start, config, cwd }) {
        let additionalEnv: Record<string, string> = {};
        if (is.set(config.envFile) && is.str(config.envFile)) {
            if (existsSync(join(cwd, config.envFile))) {
                const contents = (
                    await readFile(join(cwd, config.envFile))
                ).toString();
                contents
                    .split('\n')
                    .filter((el) => el.length > 0)
                    .forEach((el) => {
                        additionalEnv[el.split('=')[0].trim()] = el
                            .split('=')
                            .slice(1)
                            .join('=')
                            .trim();
                    });
            }
        }
        const end = start('running the program');
        const runProcess = spawnSync(
            'node',
            [
                config.mainFile,
                ...((config.arguments as any[]).map((el) =>
                    el.toString().trim()
                ) || []),
            ],
            { cwd, env: { ...process.env, ...additionalEnv } }
        );
        end();
        if (runProcess.error || runProcess.status !== 0) {
            console.error(chalk.redBright('[!] Error: Exection failed!'));
            return console.error(
                chalk.redBright(
                    runProcess.output
                        .map((el) => is.set(el))
                        .map((el) => el?.toString())
                        .join('\n')
                )
            );
        }
        return console.log(
            runProcess.output
                .filter((el) => is.set(el))
                .map((el) => el?.toString())
                .join('\n')
        );
    },
    description: 'Run your node application',
    requiredFields: [
        {
            name: 'mainFile',
            description: 'The mainfile. It get\'s executed on run',
        },
    ],
    optionalFields: [
        {
            name: 'arguments',
            description: 'The arguments to the program, you\'re running. Type: Array',
        },
        {
            name: 'envFile',
            description: 'The environment file. It get\'s parsed and passed into the environment.\nFileformat: .env',
        },
    ],
} as Module;
