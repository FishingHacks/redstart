import chalk from 'chalk';
import { join } from 'path';
import {
    ConfigValue,
    ConfigValueNoArray,
    Config,
    Jobs,
    Job,
    FileOptions,
} from './types';

function isSpace(value: string) {
    return ' \n\r\t\v'.includes(value);
}
function arrayify(value: any | any[]): any[] {
    if (value instanceof Array) return value;
    return [value];
}
function toPrintable(value: string) {
    if (value === '\n') return '\\n';
    if (value === '\t') return '\\t';
    if (value === '\r') return '\\r';
    if (value === '\v') return '\\v';
    return value;
}
function printError(error: string, tokens: string[], ip: number) {
    let start = tokens.slice(ip - 10 < 0 ? 0 : ip - 10, ip);
    let end = tokens.slice(ip, ip + 10);
    if (end.indexOf('\n') > 0) end = end.slice(0, end.indexOf('\n'));
    if (end[0] === '\n') end.shift();
    if (start.indexOf('\n') > 0) start = start.slice(0, start.indexOf('\n'));
    if (start[0] === '\n') start.shift();
    while (start.length < 11) start.unshift(' ');

    console.error(chalk.red('Error: ' + error));
    console.log(' |', start.join('') + end.join(''));
    console.log('              ^\n');
    process.exit(1);
}

function error(err: string) {
    console.log(chalk.red('Error: ' + err));
    process.exit(1);
}

function parseValue(value: string): ConfigValue {
    const values: ConfigValueNoArray[] = [];

    const tokens = Object.values(value);
    const idx = tokens.indexOf('\n');
    if (idx > -1) printError('A value cannot include a new line', tokens, idx);
    let ip = -1;
    function next() {
        return tokens[++ip];
    }
    function makeString() {
        const translator: Record<string, string> = { n: '\n' };
        let isBackslash = false;
        let value = '';

        while (tokens.length - 1) {
            const token = next();

            if (token === undefined) break;
            else if (token === '\n')
                printError(
                    'Expected a character, \\, " or space but found \\n',
                    tokens,
                    ip
                );
            else if (isBackslash) {
                isBackslash = false;
                value += translator[token] || value;
            } else if (token === '"') break;
            else if (token === '\\') isBackslash = true;
            else value += token;
        }

        if (tokens[ip] !== '"')
            printError('Expected ", but found nothing', tokens, ip);
        return value;
    }

    function makeNumber() {
        ip--;

        let number = '';
        while (tokens.length - 1) {
            const value = next();

            if (value === undefined) break;
            else if (value === ' ') break;
            else if (!'0123456789'.includes(value))
                printError(
                    'Expected a number, but found ' + toPrintable(value),
                    tokens,
                    ip
                );
            else number += value;
        }
        ip--;
        return Number(number);
    }

    function makeWord() {
        ip--;

        let word = '';
        while (tokens.length - 1) {
            const value = next();
            if (value === undefined) break;
            else if (isSpace(value)) break;
            else word += value;
        }
        ip--;
        return word;
    }

    while (ip < tokens.length - 1) {
        const value = next();
        if (value === undefined) break;
        if (isSpace(value)) continue;
        else if (value === '"') values.push(makeString());
        else if ('0123456789'.includes(value)) values.push(makeNumber());
        else {
            const word = makeWord();
            if (!['true', 'false'].includes(word))
                printError(
                    'Word ' + word + ' is not a valid word',
                    tokens,
                    ip - (word.length - 1)
                );
            values.push(word === 'true');
        }
    }

    if (values.length < 1) error('No value defined\n' + value);
    if (values.length === 1) return values[0];
    return values;
}

function parseBlock(block: string) {
    const values = block.split('\n');
    const config: Config = {};

    for (const e of values) {
        if (e.trim().length < 1) continue;
        let [name, ...values] = e.split(':');
        name = name.trim();

        if (values.length < 1)
            printError('No value defined', Object.values(e), name.length + 1);
        values[0] = values[0].trimStart();
        values[values.length - 1] = values[values.length - 1].trimEnd();

        const value = parseValue(values.join(':'));
        if (config[name] !== undefined) {
            (config as Record<string, any>)[name] = [
                ...(arrayify(config[name]) as ConfigValueNoArray[]),
                ...(arrayify(value) as ConfigValueNoArray[]),
            ];
        } else config[name] = value;
    }
    return config;
}

function parseCompilationJob(value: string, jobs: Jobs): Job {
    const job: Job = [];
    const values = Object.values(value);
    let ip = -1;
    function next() {
        return values[++ip] || '';
    }
    function makeWord() {
        ip--;

        let word = '';
        while (values.length - 1) {
            const value = next();
            if (!value) break;
            else if (isSpace(value)) break;
            else word += value;
        }
        ip--;
        return word;
    }
    function skipSpaces() {
        while (ip < values.length) {
            if (!isSpace(next())) break;
        }
        ip--;
    }

    while (ip < values.length) {
        const value = next();
        if (!value) break;
        if (isSpace(value)) continue;
        const name = makeWord();
        if (name.length < 1) continue;
        skipSpaces();
        if (name === 'use') {
            ip++;
            const jobName = makeWord();
            if (!jobs[jobName])
                printError(
                    'No job with the name ' + jobName + ' found',
                    values,
                    ip - (jobName.length - 1)
                );
            job.push(...jobs[jobName]);
        } else {
            if (values[++ip] !== '{')
                printError(
                    'Expected {, but found ' + toPrintable(values[ip]),
                    values,
                    ip
                );
            const startip = ip + 1;
            let $nestings = 0;
            while (ip < values.length) {
                const val = next();
                if (val === '}') $nestings--;
                else if (val === '{') $nestings++;
                if ($nestings < 0) break;
            }
            if (values[ip] !== '}')
                printError('Expected }, but found nothing', values, ip);
            const config = parseBlock(values.slice(startip, ip).join(''));
            let cwd = process.cwd();
            if (config[cwd] !== undefined) {
                const joinWith = config[cwd].toString();
                if (joinWith.startsWith('/')) cwd = joinWith;
                else cwd = join(cwd, joinWith);
                delete config[cwd];
            }

            job.push({
                type: name,
                cwd,
                options: config,
            });
        }
    }

    return job;
}

export function parse(value: string): FileOptions {
    const options: FileOptions = {
        jobs: {},
        settings: {},
        modules: [],
    };
    const values = Object.values(value);
    let ip = -1;
    function next() {
        return values[++ip] || '';
    }
    function makeWord() {
        ip--;

        let word = '';
        while (values.length - 1) {
            const value = next();
            if (!value) break;
            else if (isSpace(value)) break;
            else word += value;
        }
        ip--;
        return word;
    }

    while (ip < values.length) {
        const value = next();
        if (!value) break;
        if (isSpace(value)) continue;
        const name = makeWord();
        if (name.length < 1) continue;
        while (ip < values.length) {
            if (!isSpace(next())) break;
        }

        if (options.jobs[name] !== undefined)
            printError(
                'A job with this name is already defined',
                values,
                ip - (name.length - 1)
            );
        if (values[ip] !== '{')
            printError(
                'Expected {, but found ' + toPrintable(values[ip]),
                values,
                ip
            );
        const startip = ip + 1;
        let $nestings = 0;
        while (ip < values.length) {
            const val = next();
            if (val === '}') $nestings--;
            else if (val === '{') $nestings++;
            if ($nestings < 0) break;
        }
        if (values[ip] !== '}')
            printError('Expected }, but found nothing', values, ip);
        if (name === 'settings')
            options.settings = parseBlock(values.slice(startip, ip).join(''));
        else
            options.jobs[name] = parseCompilationJob(
                values.slice(startip, ip).join(''),
                options.jobs
            );
    }

    for (const k in options.jobs)
        for (const { type } of options.jobs[k])
            if (!options.modules.includes(type)) options.modules.push(type);

    return options;
}
