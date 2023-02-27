import chalk from 'chalk';
import { sync as spawnSync } from 'cross-spawn';
import { existsSync } from 'fs';
import { mkdir } from 'fs/promises';
import { join } from 'path';
import { Module } from '../../lib/types';
import { describeProvider, is, tree } from '../../lib/utils';

export default {
    validate({ config }) {
        let invalid = false;
        if (config.buildDirectory) invalid ||= !is.str(config.buildDirectory);
        if (config.sourceDirectory)
            invalid ||= !is.boolean(config.sourceDirectory);
        if (config.configFile) invalid ||= !is.str(config.configFile);
        if (config.allowJSFiles) invalid ||= !is.boolean(config.allowJSFiles);

        return !invalid;
    },
    async initiate({ start, config, cwd, redstartConfig }) {
        const { describe } = describeProvider(start);

        const buildDirectory = join(
            cwd,
            config.buildDirectory?.toString() || ''
        );
        if (config.sourceDirectory)
            cwd = join(cwd, config.sourceDirectory?.toString() || '');
        const configFilePath = config.configFile || undefined;
        const allowJSFiles =
            config.allowJSFiles === 'true' ? '--allowJS' : undefined;

        if (!existsSync(cwd))
            return console.error(
                chalk.redBright("[!] SourceDirectory doesn't exist")
            );
        if (!existsSync(buildDirectory)) await mkdir(buildDirectory);

        describe('Checking Typescript compiler', () => {
            if (is.processError(spawnSync('tsc', ['-v']))) {
                console.error(chalk.redBright('[!] TSC is not installed'));
                return;
            }
        });

        const args = [
            configFilePath ? '-p' : undefined,
            configFilePath,
            '--outDir',
            buildDirectory,
            allowJSFiles,
            '--pretty',
            ...(configFilePath ? [] : await tree(cwd)).filter(
                (el) =>
                    el.endsWith('.ts') &&
                    !el.endsWith('.d.ts') &&
                    !el.includes('node_modules') // filter out node_modules files
            ),
        ].filter((el) => el !== undefined) as string[];

        describe('Running tsc', () => {
            if (redstartConfig.dbgprint === 'true')
                console.log('Running tsc ' + args.join(' ') + ' in ' + cwd);
            const compilerProcess = spawnSync('tsc', args, { cwd });
            if (is.processError(compilerProcess)) {
                console.error(
                    chalk.redBright('[!] Error running the compiler')
                );
                console.error(
                    compilerProcess.output
                        .map((el) => (el === null ? '\n' : el.toString()))
                        .join('')
                );
                return;
            } else {
                console.log(chalk.greenBright('[+] Compilation successful'));
            }
        });
    },
    description: 'Compile a typescript project',
    requiredFields: [],
    optionalFields: [
        {
            name: 'configFile',
            description:
                'The path to the configuration file for the TypeScript Compiler (usually tsconfig.json)',
        },
        {
            name: 'sourceDirectory',
            description: 'The Directory that houses all your typescript-files',
        },
        {
            name: 'buildDirectory',
            description: 'The Directory the compiled files get put in'
        },
        {
            name: 'allowJSFiles',
            description: 'Allow javascript files to be compiled (true/false)'
        },
    ],
} as Module;
