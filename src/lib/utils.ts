/**
 * @license GPL3
 * @author FishingHacks <https://github.com/FishingHacks>
 */
import chalk from 'chalk';
import { lstat, readdir, readlink } from 'fs/promises';
import { createSpinner as _createSpinner } from 'nanospinner';
import { join } from 'path';
import { Module } from './types';
import { version } from '../../package.json';


export const is = {
    exists: (v: any) => v !== undefined,
    set: (v: any) => is.exists(v) && v !== null,
    object: (v: any): v is object => v !== null && typeof v === 'object',
    arr: (v: any): v is any[] => is.object(v) && v instanceof Array,
    str: (v: any): v is string => typeof v === 'string',
    json: (v: any) => {
        if (!is.str(v)) return false;
        try {
            JSON.parse(v);
            return true;
        } catch {
            return false;
        }
    },
    processError: (v: { error?: Error; status: number | null }) =>
        v.error || v.status !== 0,
    boolean: (v: any): v is boolean => typeof v === 'boolean',
};

type CheckerType = Record<keyof typeof is, () => CheckerType> & {
    pipe: (cb: (v: any) => boolean) => CheckerType;
    isValid: boolean;
};

export function isChecker(value: any): CheckerType {
    let valid = true;

    const a: Partial<CheckerType> = {};
    a.pipe = function pipe(cb: (v: any) => boolean) {
        if (valid && !cb(value)) valid = false;
        return a as CheckerType;
    };
    Reflect.defineProperty(a, 'isValid', {
        get() {
            return valid;
        },
        set(v) {
            throw new Error("Can't set isValid");
        },
    });
    for (const k in is) {
        a[k as keyof typeof is] = function () {
            if (valid && !is[k as keyof typeof is](value)) valid = false;
            return a as CheckerType;
        };
    }

    return a as CheckerType;
}

export function deepEqual(obj1: any, obj2: any) {
    if (!is.set(obj1) || !is.set(obj2)) return false;

    const obj1keys = Object.keys(obj1);
    const obj2keys = Object.keys(obj2).filter((el) => !obj1keys.includes(el));

    for (const k of obj1keys) {
        if (typeof obj1[k] !== typeof obj2[k]) return false;
        if (typeof obj1 === 'object') {
            if (obj1 === null) return obj2 === null;
            if (!deepEqual(obj1[k], obj2[k])) return false;
        } else return obj1 === obj2;
    }

    for (const k of obj2keys) {
        if (typeof obj1[k] !== typeof obj2[k]) return false;
        if (typeof obj1 === 'object') {
            if (obj1 === null) return obj2 === null;
            if (!deepEqual(obj1[k], obj2[k])) return false;
        } else return obj1 === obj2;
    }

    return true;
}

export function arrEq(
    arr1: Array<string | number | bigint | boolean>,
    arr2: Array<string | number | bigint | boolean>
): boolean {
    for (const v of arr1) {
        if (!arr2.includes(v)) return false;
    }

    for (const v of arr2) {
        if (!arr1.includes(v)) return false;
    }

    return true;
}

export function uniqueEntries(arr: Array<any>) {
    let _arr: any[] = [];
    return arr.filter((el) => {
        if (_arr.includes(el)) return false;
        else {
            _arr.push(el);
            return true;
        }
    });
}

export function escapeString(
    string: string,
    quotes: Array<string> = ['"']
): string {
    string = string
        .replaceAll('"', '\\"')
        .replaceAll('\r', '\\r')
        .replaceAll('\n', '\\n');
    quotes.forEach((el) => (string = string.replaceAll(el, '\\' + el)));
    return string;
}

export function stringify(value: any): string {
    if (value === undefined) return 'undefined';
    else if (value === null) return 'null';
    else if (typeof value === 'object') {
        try {
            return JSON.stringify(value);
        } catch {}
    }
    return value.toString();
}

export function createTextbox(title: string, contents: string) {
    const lines = contents.split('\n');
    const innerSize = Math.max(
        title.length + 2,
        lines.reduce(
            (acc, el) =>
                Math.max(
                    acc,
                    el.replaceAll(/\x1B\[[0-9]+(;[0-9]+)*m/g, '').length
                ),
            lines[0].length || 0
        )
    );

    let textbox = `┌──${title}${'─'.repeat(innerSize - title.length)}┐\n`;
    textbox += lines
        .map(
            (el) =>
                `${el.startsWith('─') ? '├─' : '│ '}${el}${' '.repeat(
                    innerSize -
                        el.replaceAll(/\x1B\[[0-9]+(;[0-9]+)*m/g, '').length
                )}${el.endsWith('─') ? '─┤' : ' │'}\n`
        )
        .join('');
    textbox += '└' + '─'.repeat(innerSize + 2) + '┘';

    return textbox;
}

export function calculateLengths<T extends string>(
    args: Record<T, any>[],
    names?: T[]
): Record<T, number> {
    const val: Record<string, number> = {};
    if (args.length < 1 && !names)
        throw new Error(
            'A length of at least 1 or the names are required in order to calculate the lengths'
        );
    for (const k in args[0] || names) val[k] = k.length;

    for (const v of args)
        for (const k in v) {
            const value = '' + v[k];
            if (val[k] < value.length) val[k] = value.length;
        }

    return val;
}

export class TextboxBuilder {
    private title: string = '';
    private lines: ({ type: 'divider' } | string)[] = [];
    private minLength = 0;
    private footer: string = '';
    private padl: number = 0;
    private padr: number = 0;

    setTitle(title: string) {
        this.title = title;
        return this;
    }
    setFooter(footer: string) {
        this.footer = footer;
        return this;
    }
    paddingLeft(padding: number) {
        if (padding < 0)
            throw new Error('Invalid padding: negative left padding');
        if (Math.floor(padding) !== padding)
            throw new Error('Invalid padding: non-int left padding');
        this.padl = padding;
        return this;
    }
    paddingRight(padding: number) {
        if (padding < 0)
            throw new Error('Invalid padding: negative right padding');
        if (Math.floor(padding) !== padding)
            throw new Error('Invalid padding: non-int right padding');
        this.padr = padding;
        return this;
    }
    padding(padding: { left?: number; right?: number }) {
        if (padding.left !== undefined) this.paddingLeft(padding.left);
        if (padding.right !== undefined) this.paddingRight(padding.right);
        return this;
    }
    getPaddingLeft() {
        return this.padl;
    }
    getPaddingRight() {
        return this.padr;
    }
    getPadding() {
        return {
            left: this.padl,
            right: this.padr,
        };
    }
    getFooter() {
        return this.footer;
    }
    addLine(line: string) {
        if (line.includes('\n')) throw new Error('Line contains a new line');
        this.lines.push(line);
        return this;
    }
    addLines(lines: string | string[]) {
        if (
            typeof lines === 'object' &&
            lines.find((el) => el.includes('\n') || el.includes('\r'))
        )
            throw new Error('Found a new line in the lines');
        if (typeof lines === 'object') this.lines.push(...lines);
        else this.lines.push(...lines.split('\n'));
        return this;
    }
    setMinLength(length: number) {
        if (length < 0)
            throw new Error('Invalid minlength: negative minlength');
        if (Math.floor(length) !== length)
            throw new Error('Invalid minlength: non-int minlength');
        this.minLength = length;
        return this;
    }
    getMinLength() {
        return this.minLength;
    }
    addDivider() {
        this.lines.push({ type: 'divider' });
        return this;
    }
    getLines() {
        return this.lines;
    }
    getTitle() {
        return this.title;
    }
    removeLine(last: boolean | undefined = true) {
        if (last) this.lines.pop();
        else this.lines.shift();
        return this;
    }
    build() {
        this.minLength -= Math.abs(this.padl);
        this.minLength -= Math.abs(this.padr);
        const stringLines = this.lines.filter(
            (el) => typeof el === 'string'
        ) as string[];
        const innerSize = Math.max(
            this.minLength,
            this.footer.replaceAll(/\x1B\[[0-9]+(;[0-9]+)*m/g, '').length,
            this.title.replaceAll(/\x1B\[[0-9]+(;[0-9]+)*m/g, '').length + 2,
            stringLines.reduce(
                (acc, el) =>
                    Math.max(
                        acc,
                        el.replaceAll(/\x1B\[[0-9]+(;[0-9]+)*m/g, '').length
                    ),
                stringLines[0]?.length || 0
            )
        );

        const buildLines = this.lines
            .map((el) => {
                if (typeof el === 'string')
                    return (
                        el +
                        ' '.repeat(
                            innerSize -
                                el.replaceAll(/\x1B\[[0-9]+(;[0-9]+)*m/g, '')
                                    .length
                        )
                    );
                else if (el.type === 'divider') return '─'.repeat(innerSize);
                else return ' '.repeat(innerSize);
            })

            .map(
                (el) =>
                    (el.startsWith('─')
                        ? '├─' + '─'.repeat(this.padl)
                        : '│ ' + ' '.repeat(this.padl)) +
                    el +
                    (el.endsWith('─')
                        ? '─'.repeat(this.padr) + '─┤\n'
                        : ' '.repeat(this.padr) + ' │\n')
            )
            .join('');
        const footerSize = this.footer.replaceAll(
            /\x1B\[[0-9]+(;[0-9]+)*m/g,
            ''
        ).length;
        const titleSize = this.title.replaceAll(
            /\x1B\[[0-9]+(;[0-9]+)*m/g,
            ''
        ).length;

        return `┌──${'─'.repeat(this.padl)}${titleSize > 0 ? '« ' : '─'}${
            this.title
        }${titleSize > 0 ? ' »' : '─'}${'─'.repeat(
            innerSize - titleSize - (titleSize > 0 ? 4 : 0)
        )}${'─'.repeat(this.padr)}┐\n${buildLines}└──${'─'.repeat(this.padl)}${
            footerSize > 0 ? '« ' : '─'
        }${this.footer}${footerSize > 0 ? ' »' : '─'}${'─'.repeat(
            innerSize - footerSize - (footerSize > 0 ? 4 : 2)
        )}${'─'.repeat(this.padr)}┘`;
    }
    log(loggingFunction?: (message: string) => any) {
        (loggingFunction || console.log)(this.build());
    }
}

/**
 * @param header The header of the table
 * @param keys Supply all entry names, determines the position of the entry name
 * @param data The tabledata
 * @param differentiateLines Determines if there's a line between every value
 * @returns The constructed table
 */
export function createTable<T extends string>(
    header: string,
    keys: T[],
    data: { [Key in T]: string | number | boolean }[],
    differentiateLines: boolean | undefined = false
): string {
    const rowKeys = Object.keys(data);
    if (rowKeys.length < 1 || keys.length < 1) return '┌──┐\n└──┘';
    const rows = Object.values(data);
    const columns: { [P in T]?: string[] } = {};
    for (const c of keys) columns[c] = rows.map((el) => el[c].toString());
    const columnLengths: { [P in T]?: number } = {};
    for (const c of keys)
        columnLengths[c] =
            columns[c]?.reduce(
                (a, b) => (a > b.length ? a : b.length),
                Math.max(columns[c]?.[0].length || 0, c.length)
            ) || 0;
    let str = '┌──« ' + header + ' »──';
    for (const c of keys)
        str += '─'.repeat(
            ((columnLengths[c] as number | undefined) || 0) +
                3 -
                (c === keys[0] ? str.length : 0)
        );
    str += '┐\n';
    let i = 0;
    for (const c of keys) {
        const length = (columnLengths[c] as number | undefined) || 0;
        if (str[i] === '─') str = (str as any)[i] = '┬';
        i += 3 + length;
    }

    str += '│ ';
    for (const c of keys) {
        str += c;
        str += ' '.repeat(
            ((columnLengths[c] as number | undefined) || 1) - c.length
        );
        str += ' │ ';
    }
    str += '\n';

    if (!differentiateLines) {
        str += '├';
        for (const c of keys) {
            str +=
                '─'.repeat(
                    ((columnLengths[c] as number | undefined) || 1) + 2
                ) + '┼';
        }
        str = str.substring(0, str.length - 1);
        str += '┤\n';
    }

    for (const i in rowKeys) {
        if (differentiateLines) {
            str += '├';
            for (const c of keys) {
                str +=
                    '─'.repeat(
                        ((columnLengths[c] as number | undefined) || 1) + 2
                    ) + '┼';
            }
            str = str.substring(0, str.length - 1);
            str += '┤\n';
        }
        str += columns[keys[0]]?.[i].startsWith('─') ? '├─' : '│ ';
        for (const j in keys) {
            const c = keys[j];
            str +=
                (columns[c]?.[i] || '') +
                ' '.repeat(
                    ((columnLengths[c] as number | undefined) || 0) -
                        (columns[c]?.[i] || '').length
                ) +
                `${resolveDelimiter(
                    columns[c]?.[i],
                    columns[keys[Number(j) + 1]]?.[
                        j === (keys.length - 1).toString()
                            ? Number(i) + 1
                            : Number(i)
                    ]
                )}`;
        }
        str += '\n';
    }
    str += '└';
    for (const c of keys) str += '─' + '─'.repeat(columnLengths[c] || 0) + '─┴';
    str = str.substring(0, str.length - 2);
    str += '─┘';

    return str;
}

export function anyToStringObj(
    obj: Record<string, any>
): Record<string, string> {
    const newObject = { ...obj };
    for (const k in obj) newObject[k] = stringify(obj[k]);
    return newObject;
}

function resolveDelimiter(a: string | undefined, b: string | undefined) {
    let str = '';
    if (a?.endsWith('─')) str = '─┤';
    else str += ' │';

    if (b?.startsWith('─')) return str[0] + (str[1] === '│' ? '├─' : '┼─');
    else return str + ' ';
}

// ┌ ┬ ┐
// ├ ─ ┤
// └ ┴ ┘
// │

export function createSpinner(message: string) {
    const sp = _createSpinner(message);
    sp.error = (
        opts?:
            | {
                  text?: string | undefined;
                  mark?: string | undefined;
              }
            | undefined
    ) => {
        throw new Error(opts?.text || 'Error');
    };
    return sp;
}

export function describe<T = void>(
    start: (name: string) => () => void,
    name: string,
    callback: () => T
): T {
    const end = start(name);
    try {
        const returnValue = callback();
        end();
        return returnValue;
    } catch (e) {
        end();
        throw e;
    }
}

export async function describePromise<T = void>(
    start: (name: string) => () => void,
    name: string,
    callback: () => T | Promise<T>
): Promise<T> {
    const end = start(name);
    try {
        const returnValue = await callback();
        end();
        return returnValue;
    } catch (e) {
        end();
        throw e;
    }
}

export function describeProvider(start: (name: string) => () => void): {
    describePromise: <T = void>(
        name: string,
        callback: () => T | Promise<T>
    ) => Promise<T>;
    describe: <T = void>(name: string, callback: () => T) => T;
} {
    return {
        describe(name, callback) {
            return describe(start, name, callback);
        },
        describePromise(name, callback) {
            return describePromise(start, name, callback);
        },
    };
}

export interface PaddingOptions {
    top?: number;
    left?: number;
    right?: number;
    bottom?: number;
}

/**
 * Apply some padding to a string
 *
 * @param str The string to apply the padding to
 * @param padding The padding
 * @returns the padding-applied string
 */
export function applyPadding(str: string, padding?: PaddingOptions) {
    return (
        '\n'.repeat(padding?.top || 0) +
        str
            .split('\n')
            .map(
                (el) =>
                    ' '.repeat(padding?.left || 0) +
                    el +
                    ' '.repeat(padding?.right || 0)
            )
            .join('\n') +
        '\n'.repeat(padding?.bottom || 0)
    );
}

export async function tree(directory: string): Promise<string[]> {
    const to_scan = [directory];
    const discovered_files: string[] = [];
    while (to_scan.length > 0) {
        const dir = to_scan.pop();
        if (!dir) break;
        for (let f of await readdir(dir, { withFileTypes: true })) {
            try {
                if (f.isSymbolicLink()) {
                    const filepath = await resolveSymlink(join(dir, f.name));
                    if (filepath !== null) {
                        const stat = await await lstat(filepath);
                        if (stat.isDirectory()) to_scan.push(filepath);
                        if (stat.isFile()) discovered_files.push(filepath);
                    }
                } else if (f.isFile()) discovered_files.push(join(dir, f.name));
                else if (f.isDirectory()) to_scan.push(join(dir, f.name));
            } catch {}
        }
    }

    return discovered_files;
}
export async function resolveSymlink(file: string): Promise<string | null> {
    let symlink: string | null = file;
    while (symlink !== null) {
        if (!(await lstat(symlink)).isSymbolicLink()) return symlink;
        else symlink = await readlink(symlink);
    }
    return null;
}

export function generateUsages(module: Module, name: string) {
    const builder = new TextboxBuilder()
        .setTitle(chalk.yellow(chalk.bold(name)))
        .setMinLength(100)
        .setFooter(
            `${chalk.redBright('Redstart')} v${chalk.blueBright(version)}`
        )
        .addLines(module.description.split('\n'))
        .addLine('')
        .paddingLeft(2)
        .paddingRight(2);

    if (module.requiredFields.length > 0) {
        builder.addLine(chalk.bold('Required Fields'));
        for (const o of module.requiredFields) {
            builder.addLine(chalk.cyan(o.name));
            builder.addLines(
                o.description.split('\n').map((el) => '  ' + chalk.gray(el))
            );
            builder.addLine('');
        }
    }

    if (module.optionalFields.length > 0) {
        builder.addLine(chalk.bold('Optional Fields'));
        for (const o of module.optionalFields) {
            builder.addLine(chalk.cyan(o.name));
            builder.addLines(
                o.description.split('\n').map((el) => '  ' + chalk.gray(el))
            );
            builder.addLine('');
        }
    }
    builder.removeLine(true);
    return applyPadding(builder.build(), {
        left: 1,
        right: 2,
    });
}
