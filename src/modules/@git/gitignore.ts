/**
 * @license GPL3
 * @author FishingHacks <https://github.com/FishingHacks>
 */

import chalk from 'chalk';
import { existsSync, writeFileSync } from 'fs';
import { join } from 'path';
import { Module } from '../../lib/types';
import { is } from '../../lib/utils';

export default {
    validate({ config }) {
        return (
            is.set(config.language) &&
            ['javascript', 'js', 'ts', 'typescript', ''].includes(
                config.language.toString()
            ) &&
            (!is.set || is.arr(config.additional))
        );
    },
    initiate({ config, cwd }) {
        if (existsSync(join(cwd, '.gitignore')))
            return console.warn(
                chalk.yellowBright('[/] .gitignore already found. aborting')
            );
        const gitignore = getGitIgnoreForLanguage(config.language as string);
        if (config.additional) {
            gitignore.push(
                ...(config.additional as any[])
                    .map((el) => el.toString().trim())
                    .filter((el) => el.length > 0)
                    .filter((el) => !gitignore.includes(el))
            );
        }
        writeFileSync(join(cwd, '.gitignore'), gitignore.join('\n'));
    },
    description: 'Configure the .gitignore file',
    requiredFields: [
        {
            name: 'language',
            description:
                'The language you intent on writing your program in. It will select the preset for the language. Leave empty to use none.\nSupported values: javascript, js, typescript, ts',
            type: 'string',
            choices: ['', 'javascript', 'typescript'],
        },
    ],
    optionalFields: [
        {
            name: 'additional',
            description:
                'The additional .gitignore values. Type: Array\nExample:\nadditional: "*.mjs" ".rscache"',
            type: 'string',
        },
    ],
} as Module;

function getGitIgnoreForLanguage(language: string) {
    if (language === 'js' || language === 'javascript')
        return [
            'node_modules/',
            'npm-debug.log*',
            'yarn-debug.log*',
            'yarn-error.log*',
            'lerna-debug.log*',
            '.pnpm-debug-lock*',
            'report.[0-9]*.[0-9]*.[0-9]*.[0-9]*.json',
            'pids',
            '*.pid',
            '*.seed',
            '*.pid.lock',
            'build/',
            'jspm_packages/',
            'web_modules/',
            '*.tsbuildinfo',
            '.npm',
            '.eslintcache',
            '.node_repl_history',
            '*.tgz',
            '.env',
            '.env.development.local',
            '.env.test.local',
            '.env.production.local',
            '.env.local',
            '.next',
            'out',
            '.nuxt',
            'dist',
            '.cache/',
            '.vuepress/dist',
            '.temp',
            '.cache',
            '.serverless/',
            '.fusebox/',
        ];
    else if (language === 'typescript' || language === 'ts')
        return [
            'node_modules/',
            'npm-debug.log*',
            'yarn-debug.log*',
            'yarn-error.log*',
            'lerna-debug.log*',
            '.pnpm-debug-lock*',
            'report.[0-9]*.[0-9]*.[0-9]*.[0-9]*.json',
            'pids',
            '*.pid',
            '*.seed',
            '*.pid.lock',
            'build/',
            'jspm_packages/',
            'web_modules/',
            '*.tsbuildinfo',
            '.npm',
            '.eslintcache',
            '.node_repl_history',
            '*.tgz',
            '.env',
            '.env.development.local',
            '.env.test.local',
            '.env.production.local',
            '.env.local',
            '.next',
            'out',
            '.nuxt',
            'dist',
            '.cache/',
            '.vuepress/dist',
            '.temp',
            '.cache',
            '.serverless/',
            '.fusebox/',
            '*.js',
        ];
    else return [];
}
