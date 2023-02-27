/**
 * @license GPL3
 * @author FishingHacks <https://github.com/FishingHacks>
 */

import { is, createSpinner, tree, isChecker } from '../../lib/utils';
import { sync as spawnSync } from 'cross-spawn';
import chalk from 'chalk';
import { mkdir } from 'fs/promises';
import { join } from 'path';
import { Module } from '../../lib/types';

export default {
    validate({ config, cwd }) {
        return (
            is.set(config.fileName) &&
            is.str(config.fileName) &&
            is.set(config.sourceDirectory) &&
            is.str(config.sourceDirectory) &&
            (!is.set(config.buildDirectory) || is.str(config.buildDirectory)) &&
            (!is.set(config.optimizations) ||
                isChecker(config.optimizations)
                    .set()
                    .str()
                    .pipe((el) =>
                        ['0', '1', '2', '3', 'fast', 'g', 's'].includes(el)
                    ).isValid)
        );
    },
    async initiate({ start, config, cwd }) {
        const checkEnd = start('Checking for gcc');
        const getV = spawnSync('gcc', ['-v']);
        if (getV.error || getV.status !== 0)
            return console.error(
                chalk.redBright('[!] Compiler (' + 'gcc' + ') not found')
            );
        checkEnd();
        const fileFinderEnd = start('Finding files');
        const buildSpinner = createSpinner('Finding files...');
        const files = (
            await tree(join(cwd, config.sourceDirectory as string))
        ).filter((el) => el.endsWith('.h') || el.endsWith('.c'));
        fileFinderEnd();
        if (files.length < 1)
            return buildSpinner.error({ text: 'No files found' });
        const compilingEnd = start('Compiling');
        buildSpinner.update({ text: 'Compiling...' });
        const args = ['-o', config.fileName as string, ...files];
        if (!config.optimizations) args.unshift('-O1');
        else if (
            !['0', '1', '2', '3', 'fast', 'g', 's'].includes(
                (config.optimizations as string).toLowerCase()
            )
        )
            args.unshift('-O1');
        else args.unshift('-O' + (config.optimizations as string).toLowerCase());
        if (is.set(config.buildDirectory) && is.str(config.buildDirectory))
            await mkdir(join(cwd, config.buildDirectory), { recursive: true });
        const builddir =
            is.set(config.buildDirectory) && is.str(config.buildDirectory)
                ? join(cwd, config.buildDirectory)
                : cwd;

        const compile = spawnSync('gcc', args, { cwd: builddir });
        compilingEnd();

        if (compile.error || compile.status !== 0) {
            buildSpinner.error({ text: 'Compilation failed!' });
            return console.log(
                compile.output
                    .filter((el) => (el === null ? '' : el))
                    .map((el) => el?.toString())
                    .join('\n')
            );
        }
    },
    
    description: 'Compile your c-program',
    optionalFields: [
        {
            name: 'optimizations',
            description:
                'The optimization level (standard: 1). Available options: 0, 1, 2, 3, fast, g and s',
            type: 'string',
            choices: ['0', '1', '2', '3', 'fast', 'g', 's'],
        },
        {
            name: 'buildDirectory',
            description: 'The directory, you want to have your executable in',
            type: 'string',
        },
    ],
    requiredFields: [
        {
            name: 'fileName',
            description: 'The name of the runnable executable',
            type: 'string',
        },
        {
            name: 'sourceDirectory',
            description:
                'The directory that houses all your .c, .h, .cpp and .hpp files',
            type: 'string',
        },
    ],
} as Module;
