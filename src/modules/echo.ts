/**
 * @license GPL3
 * @author FishingHacks <https://github.com/FishingHacks>
 */

import chalk from 'chalk';
import { Module } from '../lib/types';
import { is, isChecker } from '../lib/utils';

const translator: Record<string, chalk.Chalk> = {
    red: chalk.redBright,
    green: chalk.greenBright,
    yellow: chalk.yellowBright,
    blue: chalk.blueBright,
    white: chalk.whiteBright,
    black: chalk.blackBright,
    purple: chalk.magentaBright,
    aqua: chalk.cyanBright,
};

export default {
    validate({ config }) {
        return (
            is.set(config.message) &&
            is.str(config.message) &&
            config.message !== '' &&
            (!is.set(config.color) ||
                isChecker(config.color)
                    .set()
                    .str()
                    .pipe((el) => translator[el] !== undefined).isValid)
        );
    },
    initiate({ config }) {
        if (
            config.color &&
            Object.keys(translator).includes(config.color.toString())
        )
            return console.log(
                translator[config.color as string](config.message)
            );
        else return console.log(config.message);
    },
    description: 'Write to stdout',
    optionalFields: [
        {
            name: 'color',
            description:
                'The color of the message\nAvailable options: red, green, yellow, blue, white, black, purple and aqua',
            type: 'string',
            choices: [
                'red',
                'green',
                'yellow',
                'blue',
                'white',
                'black',
                'purple',
                'aqua',
            ],
        },
    ],
    requiredFields: [
        {
            name: 'message',
            description: 'The message to write',
            type: 'string',
        },
    ],
} as Module;
