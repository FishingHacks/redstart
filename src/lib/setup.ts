import chalk from 'chalk';
import inquirer from 'inquirer';
import { extname, join, sep } from 'path';
import { Module } from './types';
import { applyPadding, tree } from './utils';
//@ts-ignore
import searchbox from 'inquirer-search-list';
import { writeFile } from 'fs/promises';

const modules: Record<string, Module> = {};

const modulesFolder = join(__filename, `..${sep}..${sep}modules`);
async function loadModules() {
    const files = await tree(modulesFolder);
    for (const f of files) {
        const filename = f.replace(modulesFolder, '').substring(1);
        try {
            modules[
                filename.substring(
                    0,
                    filename.length - extname(filename).length
                )
            ] = require(f).default;
        } catch {}
    }

    return modules;
}

async function setupModule(mod: Module, name: string) {
    const a = await inquirer.prompt([
        ...mod.requiredFields.map((el) => ({
            type:
                el.type === 'boolean'
                    ? 'checkbox'
                    : el.type === 'number'
                    ? 'number'
                    : el.choices
                    ? el.choices.length > 7
                        ? 'searchlist'
                        : 'list'
                    : 'input',
            name: el.name,
            message: el.name,
            choices: el.choices,
        })),
        ...mod.optionalFields.map((el) => ({
            name: el.name,
            message: el.name + ' (Optional)',
            type:
                el.type === 'boolean'
                    ? 'list'
                    : el.type === 'number'
                    ? 'number'
                    : el.choices && (el.choices?.length || 0) > 0
                    ? el.choices.length > 7
                        ? 'searchlist'
                        : 'list'
                    : 'input',
            choices:
                el.type === 'boolean'
                    ? [
                          { value: undefined, name: 'None' },
                          { name: 'Yes', value: true },
                          { name: 'No' },
                      ]
                    : el.choices && (el.choices?.length || 0) > 0
                    ? [{ name: 'none', value: undefined }, ...el.choices]
                    : ['a'],
        })),
    ]);
    for (const k in a) {
        if (isNaN(a[k]) && typeof a[k] === 'number') delete a[k];
        if (a[k] === undefined) delete a[k];
        if (a[k] === '' && mod.optionalFields.find((el) => el.name === k))
            delete a[k];
    }

    let str = `${name} {\n`;
    for (const k in a)
        str +=
            applyPadding(`${k}: ${JSON.stringify(a[k])}`, { left: 4 }) + '\n';
    str += '}';
    return str;
}

async function setupSettings() {
    const settings = await inquirer.prompt([
        {
            type: 'confirm',
            name: 'dbgprint',
            default: false,
        },
        {
            type: 'confirm',
            name: 'profiling',
            default: false,
        },
        {
            type: 'input',
            name: 'cwd',
        },
    ]);

    for (const k in settings) {
        if (isNaN(settings[k]) && typeof settings[k] === 'number')
            delete settings[k];
        if (settings[k] === undefined) delete settings[k];
        if (settings[k] === '') delete settings[k];
    }

    let str = `settings {\n`;
    for (const k in settings)
        str +=
            applyPadding(`${k}: ${JSON.stringify(settings[k])}`, { left: 4 }) +
            '\n';
    str += '}';
    return str;
}

export async function setup() {
    let { filename } = await inquirer.prompt({
        name: 'filename',
        type: 'input',
    });
    if (!filename || typeof filename !== 'string') {
        console.log(chalk.red('[!] No filename defined'));
        process.exit(1);
    }
    if (!filename.endsWith('.rsproj')) filename += '.rsproj';
    if (filename.includes('..')) {
        console.log(chalk.red('[!] filename cannot include `..`'));
        process.exit(1);
    }
    if (filename.includes('/')) {
        console.log(chalk.red('[!] filename cannot include `/`'));
        process.exit(1);
    }
    if (filename.includes('\\')) {
        console.log(chalk.red('[!] filename cannot include `\\`'));
        process.exit(1);
    }
    const file = join(process.cwd(), filename);
    console.log(chalk.green('[+] Using file ' + file));

    inquirer.registerPrompt('searchlist', searchbox);
    let str = (await setupSettings()) + '\n\n';
    let exit = false;
    let job = false;
    await loadModules();
    const moduleNames: any[] = Object.keys(modules);
    moduleNames.push({ name: 'Cancel', value: undefined });

    const availableJobs: string[] = [];
    let currentJob = '';

    while (!exit) {
        const { choice } = await inquirer.prompt([
            {
                name: 'choice',
                message: '[?] Select action',
                type: 'list',

                choices: job
                    ? [
                          {
                              name: 'Add an action',
                              value: 'addaction',
                          },
                          {
                              name: 'Add a job',
                              value: 'addjob',
                          },
                          {
                              name: 'Include a job',
                              value: 'includejob',
                          },
                          {
                              name: 'Write file',
                              value: 'exit',
                          },
                      ]
                    : [
                          {
                              name: 'Add a job',
                              value: 'addjob',
                          },
                          {
                              name: 'Write file',
                              value: 'exit',
                          },
                      ],
            },
        ]);

        if (choice === 'exit') exit = true;

        if (choice === 'addjob') {
            const { name } = await inquirer.prompt({
                name: 'name',
                type: 'input',
            });
            if (name.length < 1)
                console.log(chalk.red('[!] No name specified'));
            else {
                if (job) str += '}\n\n';
                str += name + ' {\n';
                if (job) availableJobs.push(currentJob);
                currentJob = name;
            }
            job = true;
        }

        if (choice === 'includejob' && !job)
            console.log(chalk.red('[!] No job defined!'));
        else if (choice === 'includejob') {
            const { name } = await inquirer.prompt({
                name: 'name',
                message: 'Name',
                //@ts-ignore
                type: 'searchlist',
                choices: [
                    { name: 'Cancel', value: undefined },
                    ...availableJobs,
                ],
            });
            if (name === undefined) {
            } else str += '    use ';
            str += name;
            str += '\n';
        }
        if (choice === 'addaction' && !job)
            console.log(chalk.red('[!] No job defined!'));
        else if (choice === 'addaction') {
            const { name } = await inquirer.prompt({
                name: 'name',
                message: 'Name',
                //@ts-ignore
                type: 'searchlist',
                choices: moduleNames,
            });
            if (!name) {
            } else if (modules[name] === undefined)
                console.log(
                    chalk.red('[!] no module with the name ' + name + ' found')
                );
            else {
                const options = await setupModule(modules[name], name);
                str += applyPadding(options, { left: 4 });
                str += '\n';
            }
        }
    }

    if (job) str += '}';
    await writeFile(file, str);
    console.log(chalk.green('[+] Wrote file ' + file));
}
