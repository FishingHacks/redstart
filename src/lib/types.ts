export type ConfigValueNoArray = string | number | boolean;
export type ConfigValue = ConfigValueNoArray | ConfigValueNoArray[];
export type Config = Record<string, ConfigValue>;
export type RedstartConfig = Config;
export interface CompilationStep {
    type: string;
    options: Config;
    cwd: string;
}
export type Job = CompilationStep[];
export type Jobs = Record<string, Job>;

export interface FileOptions {
    jobs: Jobs;
    settings: RedstartConfig;
    modules: string[];
}

export interface Module {
    validate: (value: {
        config: Config;
        cwd: string;
        redstartConfig: RedstartConfig;
    }) => boolean | Promise<boolean>;
    initiate: (value: {
        start: (name: string, last?: boolean) => () => void;
        config: Config;
        cwd: string;
        redstartConfig: RedstartConfig;
    }) => void | Promise<void>;
    description: string;
    requiredFields: {
        name: string;
        description: string;
        type: 'number' | 'boolean' | 'string';
        choices?: string[];
    }[];
    optionalFields: {
        name: string;
        description: string;
        type: 'number' | 'boolean' | 'string';
        choices?: string[];
    }[];
}
