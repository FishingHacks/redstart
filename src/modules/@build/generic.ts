/**
 * @license GPL3
 * @author FishingHacks <https://github.com/FishingHacks>
 */

import chalk from 'chalk';
import { sync as spawnSync } from 'cross-spawn';
import { Module } from '../../lib/types';
import { is } from '../../lib/utils';

export default {
    validate({ config, cwd }) {
        return (
            is.set(config.command) &&
            is.str(config.command) &&
            (!is.set(config.arguments) || is.arr(config.arguments))
        );
    },
    initiate({ start, config, cwd }) {
        const compile = spawnSync(
            config.command as string,
            (config.arguments as any[]).map((el) => el.toString()) || [],
            { cwd }
        );
        if (compile.error || compile.status !== 0)
            console.error(chalk.redBright('[!] Error during build'));
        console.error(compile.output.filter((el) => el !== null).join('\n'));
    },
    description: 'Use any build system to build your application.',
    optionalFields: [{
        name: 'arguments',
        description: 'The arguments to be passed to the command (Array)',
        type: 'string'
    }],
    requiredFields: [{
        name: 'command',
        description: 'The path or name of the program (iex. g++ or /usr/opt/compiler)',
        type: 'string'
    }]
} as Module;
