#!/usr/bin/env node
/**
 * @license GPL3
 * @author RedCrafter07 <https://github.com/RedCrafter07>
 * @author FishingHacks <https://github.com/FishingHacks>
 */

import chalk from 'chalk';
import { existsSync, lstatSync, readFileSync } from 'fs';
import { readdir } from 'fs/promises';
import inquirer from 'inquirer';
import path, { extname, join } from 'path';
import { argv } from 'process';
import { parse as parseFile } from '../lib/parser';
import { version } from '../../package.json';
import { generateUsages, TextboxBuilder } from '../lib/utils';
import { format } from 'util';
import { timer } from '../lib/timer';
import { Module } from '../lib/types';

const oldConsoleLog = console.log;
const oldConsoleError = console.error;
const oldConsoleWarn = console.warn;

function inspectPrefixed(prefix: string, args: (string | number | boolean)[]) {
    return args
        .map((el) => el.toString())
        .join(' ')
        .split('\n')
        .map((el) => prefix + ' ' + el)
        .join('\n');
}

function configureLogForModule(module: string) {
    console.log = (...args) =>
        oldConsoleLog(inspectPrefixed('[' + module + ']', args));
    console.info = (...args) =>
        oldConsoleLog(inspectPrefixed('[' + module + ']', args));
    console.warn = (...args) =>
        oldConsoleWarn(
            chalk.yellowBright(inspectPrefixed('[' + module + ']', args))
        );
    console.error = (...args) => {
        throw new Error(format(...args));
    };
}

function resetLog() {
    console.log = oldConsoleLog;
    console.info = oldConsoleLog;
    console.warn = oldConsoleWarn;
    console.error = oldConsoleError;
}

const sourcePath = join(__filename, '../../');
const args = argv.slice(2);

const { prompt } = inquirer;

(async () => {
    let configPath: string;
    if (['--h', '-h', '-help', '--help'].includes(args[0])) {
        return new TextboxBuilder()
            .setTitle(chalk.blue('Usage'))
            .addLine(
                `${chalk.redBright('redstart')} ${chalk.cyan(
                    '<file/folder>'
                )} ${chalk.greenBright('- Execute a .rsproj file')}`
            )
            .addLine(
                `${chalk.redBright('redstart')} ${chalk.yellow(
                    '--help --h -h -help'
                )} ${chalk.greenBright('- Obtain usage informations')}`
            )
            .addLine(
                `${chalk.redBright('redstart')} ${chalk.yellow(
                    '-v -version --version --v'
                )} ${chalk.greenBright(
                    '- Get the ' + chalk.redBright('redstart') + ' version'
                )}`
            )
            .addLine(
                `${chalk.redBright('redstart')} ${chalk.yellow(
                    '-m --modules'
                )} ${chalk.greenBright(
                    '- Get the avilable modules for redstart'
                )}`
            )
            .addLine(
                `${chalk.redBright('redstart')} ${chalk.yellow(
                    '-u --usage'
                )} ${chalk.cyan('<modulename>')} ${chalk.greenBright(
                    '- Get the avilable modules for redstart'
                )}`
            )
            .addLine('')
            .setFooter(
                `${chalk.redBright('Redstart')} v${chalk.blueBright(version)}`
            )
            .log();
    }
    if (['-m', '--modules'].includes(args[0])) {
        const modules = join(sourcePath, 'modules');
        new TextboxBuilder()
            .setTitle(chalk.blue('Modules'))
            .addLines([
                ...new Set(
                    trimFileEndings(
                        (await tree(modules)).filter(
                            (el) => el.endsWith('.js') || el.endsWith('.ts')
                        )
                    )
                ),
            ])
            .setFooter(
                `${chalk.redBright('Redstart')} v${chalk.blueBright(version)}`
            )
            .setMinLength(50)
            .log();
        return;
    }
    if (['-u', '--usage'].includes(args[0])) {
        let file = join(
            sourcePath,
            './modules/' + args[1] + extname(__filename)
        );
        if (!existsSync(file))
            return console.log(
                chalk.redBright(
                    '[!] Error: ' + args[1] + ' is not a valid module'
                )
            );

        try {
            const module = require(file)?.default as Module;
            if (!module) throw new Error();
            console.log(generateUsages(module, args[1]));
            process.exit(0);
        } catch {
            console.log(chalk.redBright('[!] Module not found'));
            process.exit(1);
        }
    }
    if (['-v', '-version', '--v', '--version'].includes(args[0])) {
        return console.log(`${chalk.redBright('Redstart')} v${version}`);
    }
    if (args[0]) configPath = path.resolve(process.cwd(), args[0]);
    else {
        const configFiles = (
            await readdir(process.cwd(), {
                withFileTypes: true,
            })
        ).filter((f) => f.isFile() && f.name.endsWith('.rsproj'));

        if (configFiles.length < 1) {
            console.log(chalk.red('[!] No .rsproj files found!'));
            process.exit(1);
        }

        const { config: newConf } = await prompt([
            {
                type: 'list',
                name: 'config',
                choices: configFiles.map((f) => ({
                    name: f.name,
                    value: f.name,
                })),
            },
        ]);

        if (
            !existsSync(join(process.cwd(), newConf)) &&
            !newConf.endsWith('.rsproj') &&
            existsSync(join(process.cwd(), newConf + '.rsproj'))
        )
            configPath = path.resolve(process.cwd(), newConf + '.rsproj');
        else configPath = path.resolve(process.cwd(), newConf);
    }
    if (lstatSync(configPath).isDirectory()) {
        const configFiles = (
            await readdir(configPath, {
                withFileTypes: true,
            })
        ).filter((f) => f.isFile() && f.name.endsWith('.rsproj'));

        if (configFiles.length === 0) {
            oldConsoleLog(chalk.redBright('[!] No config file found!'));
            process.exit(1);
        }
        if (configFiles.length === 1) {
            configPath = join(configPath, configFiles[0].name);
        } else {
            const { config: newConf } = await prompt([
                {
                    type: 'list',
                    name: 'config',
                    choices: configFiles.map((f) => ({
                        name: f.name,
                        value: f.name,
                    })),
                },
            ]);

            configPath = join(configPath, newConf);
        }
    }
    const end = timer.start('Parsing config file');
    if (!existsSync(configPath) || !lstatSync(configPath).isFile()) {
        console.error('[!] No file found. Looking for:', configPath);
        process.exit(1);
    }
    const config = await parseFile(readFileSync(configPath).toString());
    const redstartConfig = config.settings;
    const modules = config.modules;

    if (redstartConfig.dbgprint) process.on('beforeExit', () => timer.print());

    if (redstartConfig.dbgprint)
        oldConsoleLog(
            chalk.yellowBright('[/] Config file parsed successfully!')
        );
    oldConsoleLog(chalk.green('[+] Using ' + modules.join(', ')));
    const cwd = join(configPath, '..', redstartConfig.cwd?.toString() || '');
    if (redstartConfig.dbgprint)
        oldConsoleLog(chalk.yellowBright('[/] CWD: ' + cwd));

    const moduleIndexEnd = timer.start('Indexing modules');
    const moduleObjects = modules
        .map((el) => [require.resolve('../modules/' + el), el])
        .map((el) => {
            if (!existsSync(el[0])) {
                oldConsoleLog(
                    chalk.redBright('[!] Module ' + el[1] + " doesn' exist!")
                );
                process.exit(1);
            }
            return el;
        })
        .map((el) => [require(el[0]).default, el[1]]) as [any, string][];
    moduleIndexEnd();

    const availableJobs = Object.keys(config.jobs);
    if (availableJobs.length < 1) {
        console.log(chalk.red('[!] No jobs defined'));
    }
    let job =
        args[1] || (availableJobs.length === 1 ? availableJobs[0] : undefined);
    if (!job) {
        const { job: newJob } = await prompt({
            type: 'list',
            name: 'job',
            choices: availableJobs,
        });

        job = newJob;
    }
    if (!config.jobs[job as string]) {
        oldConsoleLog(chalk.red('[!] No job with the name ' + job + ' found'));
        process.exit(1);
    }

    if (!existsSync(cwd) || !lstatSync(cwd).isDirectory()) {
        oldConsoleLog(
            chalk.red(
                '[!] Current directory not found. Expecting to find ' + cwd
            )
        );
        process.exit(1);
    }
    process.chdir(cwd);
    if (redstartConfig.dbgprint)
        oldConsoleLog(chalk.green('[+] Using job ' + job));

    const modulesForExecution = config.jobs[job as string];

    const validationEnd = timer.start('Module Validation');

    function getModule(name: string): Module {
        const obj = moduleObjects.find((el) => el[1] === name)?.[0];
        if (!obj) {
            oldConsoleLog(chalk.red('[!] Could not find module', name));
            process.exit(1);
        }
        return obj;
    }

    for (const { cwd, options, type } of modulesForExecution) {
        const end = timer.start('Validating ' + type);

        configureLogForModule(type);

        const module = getModule(type);
        if (
            !(await module.validate({
                config: options,
                cwd: join(process.cwd(), cwd),
                redstartConfig,
            }))
        ) {
            end();
            oldConsoleError(chalk.red('[!] Could not validate module', type));
            process.exit(1);
        }

        resetLog();
        end();
    }
    validationEnd();

    const runningEnd = timer.start('Module Instanic & Running');

    for (const { cwd, options, type } of modulesForExecution) {
        const end = timer.start('Validating ' + type);

        configureLogForModule(type);

        const module = getModule(type);
        await module.initiate({
            config: options,
            cwd: join(process.cwd(), cwd),
            redstartConfig,
            start(name) {
                return timer.start('└─« ' + name);
            },
        });

        resetLog();
        end();
    }

    runningEnd();

    end();
})();

async function tree(dir: string) {
    const entries: string[] = [];
    const toScan: string[] = [dir];

    while (toScan.length > 0) {
        const directory = toScan.pop();
        if (!directory) break;

        for (const f of await readdir(directory, { withFileTypes: true })) {
            if (f.isFile()) entries.push(join(directory, f.name));
            else if (f.isDirectory()) toScan.push(join(directory, f.name));
        }
    }

    if (toScan.length > 0)
        throw new Error(
            "Entries left, this should never happen. It's likely a bug in the runtime, path module or fs module"
        );
    return entries
        .map((el) =>
            el.replace(dir.replaceAll('/', path.sep), '').replaceAll('\\', '/')
        )
        .map((el) => (el[0] === '/' ? el.substring(1) : el));
}

function trimFileEndings(files: string[]): string[] {
    return files.map((el) => el.split('.').slice(0, -1).join('.'));
}
