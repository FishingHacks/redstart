const redstartConfig = `[<- Back](./index.md)

# RedStart Configuration

- dbgprint
> Print debuginformations about the execution of redstart

- cwd
> Change the cwd (Current working directory), relative to the directory, the .rsproj file is in`;

import { mkdir, writeFile as _writeFile } from 'fs/promises';
import { extname, join, sep } from 'path';
import { Module } from './src/lib/types';
import { tree } from './src/lib/utils';

function generateMarkdown(module: Module, nesting: number, name: string) {
    let str = `[<- Back](`;
    for (let i = 0; i < nesting; i++) str += '../';
    if (nesting === 0) str += './';
    str += 'index.md)\n\n';
    str += `## ${name}\n\n${module.description.replaceAll('\n', '\n\n')}`;
    if (module.optionalFields.length < 1 && module.requiredFields.length < 1)
        return str;
    str += `\n\n### Usage`;
    if (module.requiredFields.length > 0) {
        str +=
            '\n\n**Required Fields**\n\n' +
            module.requiredFields
                .map(
                    (el) =>
                        `-   ${el.name}\n\n${el.description
                            .split('\n')
                            .map((el) => '    > ' + el)
                            .join('\n    > \n')}`
                )
                .join('\n\n');
    }
    if (module.optionalFields.length > 0) {
        str +=
            '\n\n**Optional Fields**\n\n' +
            module.optionalFields
                .map(
                    (el) =>
                        `-   ${el.name}\n\n${el.description
                            .split('\n')
                            .map((el) => '    > ' + el)
                            .join('\n    > \n')}`
                )
                .join('\n\n');
    }
    return str;
}

function generateIndex(files: string[]) {
    const sorted: Record<string, string[]> = {};

    for (const f of files.map((el) =>
        el.startsWith('/')
            ? el.substring(1)
            : el.startsWith('./')
            ? el.substring(2)
            : el
    )) {
        let folder = join(f, '..');
        if (folder === '.') folder = '';        
        if (sorted[folder] === undefined) sorted[folder] = [f];
        else sorted[folder].push(f);
    }

    let str = '[<- Back](../README.md)\n\n# Usage\n\n';

    for (const k in sorted) {
        for (const f of sorted[k])
            str += `- [${f}](./${encodeURIComponent(
                f
            )}.md)\n`;
        str += '---\n';
    }
    str += '- [RedStart Configuration](./redstartConfig.md)';
    return str;
}

async function writeFile(path: string, content: string) {
    await mkdir(join(path, '..'), { recursive: true });
    await _writeFile(path, content);
    console.log('Written', path);
}

async function main() {
    const modules = join(__filename, `..${sep}src${sep}modules`);
    const files = await tree(modules);
    const md = files
        .filter((el) => el.endsWith(extname(__filename))) // if you use tsx, this is going to be ts, and the files are not compiled, if you are using tsc, this is going to be js
        .map((el) => [
            require.resolve(el),
            el.replace(modules, '').replaceAll(new RegExp(`[^${sep}]`, 'g'), '')
                .length - 1,
            el.replace(modules, '').substring(1),
        ])
        .map((el) => {
            try {
                return [require(el[0] as string)?.default, el[1], el[2]];
            } catch {
                return [undefined, 0, ''];
            }
        })
        .filter((el) => el[0] !== undefined)
        .map((el) => [
            generateMarkdown(...(el as [Module, number, string])),
            el[2],
        ]);
    await Promise.allSettled(
        md.map((el) =>
            writeFile(
                join(
                    __filename,
                    '../generated',
                    el[1].substring(0, el[1].length - extname(el[1]).length) +
                        '.md'
                ),
                el[0]
            )
        )
    );
    await writeFile(
        join(__filename, '../generated/redstartConfig.md'),
        redstartConfig
    );
    await writeFile(
        join(__filename, '../generated/index.md'),
        generateIndex(
            md.map((el) =>
                el[1].substring(0, el[1].length - extname(el[1]).length)
            )
        )
    );
}
main();
