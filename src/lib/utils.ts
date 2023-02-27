import { lstat, readdir, readlink } from 'fs/promises';
import { createSpinner as _createSpinner } from 'nanospinner';
import { join } from 'path';

/**
 * @license GPL3
 * @author FishingHacks <https://github.com/FishingHacks>
 */

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
            const value = stringify(v[k]);
            if (val[k] < value.length) val[k] = value.length;
        }

    return val;
}

export function strMul(s: string, i: number) {
    let str = '';
    for (let j = 0; j < i; j++) str += s;
    return str;
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

    let textbox = `┌──${title}${strMul('─', innerSize - title.length)}┐\n`;
    textbox += lines
        .map(
            (el) =>
                `${el.startsWith('─') ? '├─' : '│ '}${el}${strMul(
                    ' ',
                    innerSize -
                        el.replaceAll(/\x1B\[[0-9]+(;[0-9]+)*m/g, '').length
                )}${el.endsWith('─') ? '─┤' : ' │'}\n`
        )
        .join('');
    textbox += '└' + strMul('─', innerSize + 2) + '┘';

    return textbox;
}

export class TextboxBuilder {
    private title: string = '';
    private lines: ({ type: 'divider' } | string)[] = [];
    private minLength = 0;
    private footer: string = '';

    setTitle(title: string) {
        this.title = title;
        return this;
    }
    setFooter(footer: string) {
        this.footer = footer;
        return this;
    }
    getFooter() {
        return this.footer;
    }
    addLine(line: string) {
        if (line.includes('\n')) return this;
        this.lines.push(line);
        return this;
    }
    addLines(lines: string | string[]) {
        if (typeof lines === 'object') this.lines.push(...lines);
        else this.lines.push(...lines.split('\n'));
        return this;
    }
    setMinLength(length: number) {
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
                        strMul(
                            ' ',
                            innerSize -
                                el.replaceAll(/\x1B\[[0-9]+(;[0-9]+)*m/g, '')
                                    .length
                        )
                    );
                else if (el.type === 'divider') return strMul('─', innerSize);
                else return strMul(' ', innerSize);
            })

            .map(
                (el) =>
                    (el.startsWith('─') ? '├─' : '│ ') +
                    el +
                    (el.endsWith('─') ? '─┤\n' : ' │\n')
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

        return `┌──${titleSize > 0 ? '« ' : '─'}${this.title}${
            titleSize > 0 ? ' »' : '─'
        }${strMul(
            '─',
            innerSize - titleSize - (titleSize > 0 ? 4 : 0)
        )}┐\n${buildLines}└──${footerSize > 0 ? '« ' : '─'}${this.footer}${
            footerSize > 0 ? ' »' : '─'
        }${strMul('─', innerSize - footerSize - (footerSize > 0 ? 4 : 2))}┘`;
    }
    log() {
        return console.log(this.build());
    }
}

function setStrAtPos(str: string, pos: number, char: string) {
    if (char.length < 1) return str;
    char = char[0];
    return str.substring(0, pos) + char + str.substring(pos + 1);
}

export function createTable<T extends string>(
    header: string,
    keys: T[],
    data: { [Key in T]: string | number | boolean }[],
    differentiateLines: boolean | undefined = false
) {
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
        str += strMul(
            '─',
            ((columnLengths[c] as number | undefined) || 0) +
                3 -
                (c === keys[0] ? str.length : 0)
        );
    str += '┐\n';
    let i = 0;
    for (const c of keys) {
        const length = (columnLengths[c] as number | undefined) || 0;
        if (str[i] === '─') str = setStrAtPos(str, i, '┬');
        i += 3 + length;
    }

    str += '│ ';
    for (const c of keys) {
        str += c;
        str += strMul(
            ' ',
            ((columnLengths[c] as number | undefined) || 1) - c.length
        );
        str += ' │ ';
    }
    str += '\n';

    if (!differentiateLines) {
        str += '├';
        for (const c of keys) {
            str +=
                strMul(
                    '─',
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
                    strMul(
                        '─',
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
                strMul(
                    ' ',
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
    for (const c of keys)
        str += '─' + strMul('─', columnLengths[c] || 0) + '─┴';
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

export function applyPadding(str: string, padding?: PaddingOptions) {
    return (
        strMul('\n', padding?.top || 0) +
        str
            .split('\n')
            .map(
                (el) =>
                    strMul(' ', padding?.left || 0) +
                    el +
                    strMul(' ', padding?.right || 0)
            )
            .join('\n') +
        strMul('\n', padding?.bottom || 0)
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
