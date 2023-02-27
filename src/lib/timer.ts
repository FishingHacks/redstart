/**
 * @author FishingHacks <fishinghacks@protonme>
 * @repository https://github.com/FishingHacks/simple-profiler
 * @license MIT
 * MIT License
 *
 * Copyright (c) 2022 FishingHacks
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
import { writeFileSync } from 'fs';
import { join } from 'path';
import { applyPadding, calculateLengths, createTable, strMul } from './utils';

class Timer {
    private _values: {
        start: number;
        end: number;
        name: string;
    }[] = [];
    private _start: number = -1;

    start(name: string): () => void {
        if (this._start === -1) this._start = Date.now();
        const obj = {
            start: Date.now(),
            end: -1,
            name,
        };
        this._values.push(obj);
        function end() {
            if (obj.end !== -1) throw new Error(name + ' was already ended');
            obj.end = Date.now();
        }

        return end;
    }

    print() {
        const end = new Date();
        const start = new Date(this._start);

        const _newValues: Record<
            string,
            {
                start: number;
                end: number;
                length: number;
                name: string;
                calledBy: {
                    name: string;
                    location: string;
                };
                id: number;
            }[]
        > = {};

        let i = 0;

        function addProfiling(name: string, start: number, end: number) {
            if (_newValues[name] === undefined) _newValues[name] = [];
            _newValues[name].push({
                end,
                start,
                length: end === -1 ? -1 : end - start,
                name,
                calledBy: {
                    location: '',
                    name: 'unknown function',
                },
                id: ++i,
            });
        }

        for (const { name, start, end } of this._values)
            addProfiling(name, start, end);

        const args: Record<'name' | 'start' | 'end' | 'length', string>[] = [];
        for (const v of this._values)
            args.push({
                end: new Date(v.end).toLocaleTimeString(),
                start: new Date(v.start).toLocaleTimeString(),
                name: v.name,
                length: formatTimelength(v.end - v.start),
            });
        const lengths = calculateLengths(args);
        args.push({ name: '', end: '', length: '', start: '' });
        args.push({
            name: 'Time Taken',
            end: end.toLocaleTimeString(),
            start: start.toLocaleTimeString(),
            length: formatTimelength(end.getTime() - this._start),
        });
        args[args.length - 2] = {
            name: strMul('─', lengths.name),
            end: strMul('─', lengths.end),
            start: strMul('─', lengths.start),
            length: strMul('─', lengths.length),
        };

        console.log(
            applyPadding(
                createTable(
                    'Timings',
                    ['name', 'length', 'start', 'end'],
                    args
                ),
                {
                    bottom: 1,
                    top: 1,
                    left: 3,
                }
            )
        );

        writeFileSync(
            join(process.cwd(), 'profiling-redstart-' + makeDate() + '.json'),
            JSON.stringify(_newValues)
        );
    }
}

class FakeTimer extends Timer {
    start(name: string): () => void {
        return () => {};
    }
    print(): void {}
}

// export const timer = new FakeTimer();
export const timer = new Timer();

function formatTimelength(length: number) {
    if (length < 2000) return length + 'ms';
    else if (length < 120000) return (length / 1000).toFixed(3) + 's';
    else if (length < 7200000) return (length / 60000).toFixed(3) + 'm';
    else return (length / 3600000).toFixed(3) + 'hr';
}

function makeDate() {
    const date = new Date();
    return `${date.getDate()}-${
        date.getMonth() + 1
    }-${date.getFullYear()}-${date.getHours()}-${date.getMinutes()}-${date.getSeconds()}`;
}
