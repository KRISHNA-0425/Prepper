/**
 * @file validateRealExecution.js
 * Comprehensive validation of genuine compilation and execution across all 5 target languages:
 * 1. C (GCC)
 * 2. C++ (G++)
 * 3. Python 3
 * 4. Java (OpenJDK)
 * 5. JavaScript (Node.js)
 *
 * Tests the 8 required test cases:
 * - TC1: Hello World
 * - TC2: Addition using stdin
 * - TC3: Array processing
 * - TC4: Multiple test cases
 * - TC5: Compilation failure
 * - TC6: Runtime exception
 * - TC7: Infinite loop (timeout enforcement)
 * - TC8: Excessive memory allocation
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';

const GCC = 'C:\\MinGW\\bin\\gcc.exe';
const GPP = 'C:\\MinGW\\bin\\g++.exe';
const PYTHON = 'C:\\Users\\263237\\AppData\\Local\\Programs\\Python\\Python310\\python.exe';
const JAVAC = 'C:\\Program Files\\Microsoft\\jdk-17.0.17.10-hotspot\\bin\\javac.exe';
const JAVA = 'C:\\Program Files\\Microsoft\\jdk-17.0.17.10-hotspot\\bin\\java.exe';
const NODE = 'C:\\nvm4w\\nodejs\\node.exe';

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'prepper-real-exec-'));

function norm(s) {
  return String(s || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
}

function runProcess(cmd, args, { stdin = '', timeoutMs = 5000, cwd = tempDir } = {}) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    let stdout = '';
    let stderr = '';
    let timedOut = false;

    const proc = spawn(cmd, args, { cwd });

    const timer = setTimeout(() => {
      timedOut = true;
      try {
        proc.kill('SIGKILL');
      } catch (e) {}
    }, timeoutMs);

    if (stdin) {
      proc.stdin.write(stdin);
      proc.stdin.end();
    } else {
      proc.stdin.end();
    }

    proc.stdout.on('data', (d) => { stdout += d.toString(); });
    proc.stderr.on('data', (d) => { stderr += d.toString(); });

    proc.on('close', (exitCode) => {
      clearTimeout(timer);
      const durationMs = Date.now() - startTime;
      resolve({
        exitCode: timedOut ? 124 : (exitCode ?? 0),
        stdout: norm(stdout),
        stderr: norm(stderr),
        durationMs,
        timedOut
      });
    });

    proc.on('error', (err) => {
      clearTimeout(timer);
      resolve({
        exitCode: 1,
        stdout: '',
        stderr: err.message,
        durationMs: Date.now() - startTime,
        timedOut: false
      });
    });
  });
}

async function runTest(lang, testName, fn) {
  process.stdout.write(`  [${lang.toUpperCase()}] ${testName}... `);
  try {
    const result = await fn();
    if (result.success) {
      console.log(`PASS (${result.durationMs}ms) -> ${result.summary}`);
    } else {
      console.log(`FAIL -> ${result.summary}`);
    }
    return result;
  } catch (err) {
    console.log(`ERROR -> ${err.message}`);
    return { success: false, summary: err.message };
  }
}

async function main() {
  console.log('========================================================================');
  console.log('PREPPER AI — PHASE 2: REAL COMPILER & RUNTIME VALIDATION (5 LANGUAGES)');
  console.log(`Temp Execution Directory: ${tempDir}`);
  console.log('========================================================================\n');

  const report = {};

  for (const lang of ['c', 'cpp', 'python', 'java', 'javascript']) {
    console.log(`>>> TESTING LANGUAGE: ${lang.toUpperCase()}`);
    report[lang] = [];

    // --- TC1: Hello World ---
    report[lang].push(await runTest(lang, 'TC1: Hello World', async () => {
      if (lang === 'c') {
        const file = path.join(tempDir, 'tc1.c');
        const exe = path.join(tempDir, 'tc1.exe');
        fs.writeFileSync(file, '#include <stdio.h>\nint main() { printf("Hello, World!\\n"); return 0; }');
        const comp = await runProcess(GCC, [file, '-o', exe]);
        if (comp.exitCode !== 0) return { success: false, summary: `Comp fail: ${comp.stderr}` };
        const run = await runProcess(exe, []);
        return { success: run.stdout === 'Hello, World!', durationMs: run.durationMs, summary: run.stdout };
      }
      if (lang === 'cpp') {
        const file = path.join(tempDir, 'tc1.cpp');
        const exe = path.join(tempDir, 'tc1_cpp.exe');
        fs.writeFileSync(file, '#include <iostream>\nint main() { std::cout << "Hello, World!" << std::endl; return 0; }');
        const comp = await runProcess(GPP, [file, '-o', exe]);
        if (comp.exitCode !== 0) return { success: false, summary: `Comp fail: ${comp.stderr}` };
        const run = await runProcess(exe, []);
        return { success: run.stdout === 'Hello, World!', durationMs: run.durationMs, summary: run.stdout };
      }
      if (lang === 'python') {
        const file = path.join(tempDir, 'tc1.py');
        fs.writeFileSync(file, 'print("Hello, World!")');
        const run = await runProcess(PYTHON, [file]);
        return { success: run.stdout === 'Hello, World!', durationMs: run.durationMs, summary: run.stdout };
      }
      if (lang === 'java') {
        const file = path.join(tempDir, 'TC1Hello.java');
        fs.writeFileSync(file, 'public class TC1Hello { public static void main(String[] args) { System.out.println("Hello, World!"); } }');
        const comp = await runProcess(JAVAC, [file]);
        if (comp.exitCode !== 0) return { success: false, summary: `Comp fail: ${comp.stderr}` };
        const run = await runProcess(JAVA, ['-cp', tempDir, 'TC1Hello']);
        return { success: run.stdout === 'Hello, World!', durationMs: run.durationMs, summary: run.stdout };
      }
      if (lang === 'javascript') {
        const file = path.join(tempDir, 'tc1.js');
        fs.writeFileSync(file, 'console.log("Hello, World!");');
        const run = await runProcess(NODE, [file]);
        return { success: run.stdout === 'Hello, World!', durationMs: run.durationMs, summary: run.stdout };
      }
    }));

    // --- TC2: Addition using stdin ---
    report[lang].push(await runTest(lang, 'TC2: Addition using stdin', async () => {
      const stdinData = '17 25\n';
      const expected = '42';
      if (lang === 'c') {
        const file = path.join(tempDir, 'tc2.c');
        const exe = path.join(tempDir, 'tc2.exe');
        fs.writeFileSync(file, '#include <stdio.h>\nint main() { int a, b; if (scanf("%d %d", &a, &b) == 2) { printf("%d\\n", a + b); } return 0; }');
        await runProcess(GCC, [file, '-o', exe]);
        const run = await runProcess(exe, [], { stdin: stdinData });
        return { success: run.stdout === expected, durationMs: run.durationMs, summary: `Output: ${run.stdout}` };
      }
      if (lang === 'cpp') {
        const file = path.join(tempDir, 'tc2.cpp');
        const exe = path.join(tempDir, 'tc2_cpp.exe');
        fs.writeFileSync(file, '#include <iostream>\nint main() { int a, b; std::cin >> a >> b; std::cout << (a + b) << std::endl; return 0; }');
        await runProcess(GPP, [file, '-o', exe]);
        const run = await runProcess(exe, [], { stdin: stdinData });
        return { success: run.stdout === expected, durationMs: run.durationMs, summary: `Output: ${run.stdout}` };
      }
      if (lang === 'python') {
        const file = path.join(tempDir, 'tc2.py');
        fs.writeFileSync(file, 'import sys\na, b = map(int, sys.stdin.read().split())\nprint(a + b)');
        const run = await runProcess(PYTHON, [file], { stdin: stdinData });
        return { success: run.stdout === expected, durationMs: run.durationMs, summary: `Output: ${run.stdout}` };
      }
      if (lang === 'java') {
        const file = path.join(tempDir, 'TC2Add.java');
        fs.writeFileSync(file, 'import java.util.Scanner;\npublic class TC2Add { public static void main(String[] args) { Scanner s = new Scanner(System.in); int a = s.nextInt(); int b = s.nextInt(); System.out.println(a + b); } }');
        await runProcess(JAVAC, [file]);
        const run = await runProcess(JAVA, ['-cp', tempDir, 'TC2Add'], { stdin: stdinData });
        return { success: run.stdout === expected, durationMs: run.durationMs, summary: `Output: ${run.stdout}` };
      }
      if (lang === 'javascript') {
        const file = path.join(tempDir, 'tc2.js');
        fs.writeFileSync(file, 'const fs = require("fs");\nconst [a, b] = fs.readFileSync(0, "utf-8").trim().split(/\\s+/).map(Number);\nconsole.log(a + b);');
        const run = await runProcess(NODE, [file], { stdin: stdinData });
        return { success: run.stdout === expected, durationMs: run.durationMs, summary: `Output: ${run.stdout}` };
      }
    }));

    // --- TC3: Array Processing ---
    report[lang].push(await runTest(lang, 'TC3: Array processing (Max & Sum)', async () => {
      const stdinData = '5\n10 50 20 5 15\n';
      const expected = '100 50'; // sum, max
      if (lang === 'c') {
        const file = path.join(tempDir, 'tc3.c');
        const exe = path.join(tempDir, 'tc3.exe');
        fs.writeFileSync(file, `
#include <stdio.h>
int main() {
    int n, sum = 0, max = -1e9, val;
    if (scanf("%d", &n) != 1) return 1;
    for (int i = 0; i < n; i++) {
        scanf("%d", &val);
        sum += val;
        if (val > max) max = val;
    }
    printf("%d %d\\n", sum, max);
    return 0;
}`);
        await runProcess(GCC, [file, '-o', exe]);
        const run = await runProcess(exe, [], { stdin: stdinData });
        return { success: run.stdout === expected, durationMs: run.durationMs, summary: `Output: ${run.stdout}` };
      }
      if (lang === 'cpp') {
        const file = path.join(tempDir, 'tc3.cpp');
        const exe = path.join(tempDir, 'tc3_cpp.exe');
        fs.writeFileSync(file, `
#include <iostream>
#include <vector>
#include <numeric>
#include <algorithm>
int main() {
    int n; if (!(std::cin >> n)) return 0;
    std::vector<int> a(n);
    int sum = 0, mx = -1e9;
    for (int i = 0; i < n; i++) {
        std::cin >> a[i];
        sum += a[i];
        if (a[i] > mx) mx = a[i];
    }
    std::cout << sum << " " << mx << std::endl;
    return 0;
}`);
        await runProcess(GPP, [file, '-o', exe]);
        const run = await runProcess(exe, [], { stdin: stdinData });
        return { success: run.stdout === expected, durationMs: run.durationMs, summary: `Output: ${run.stdout}` };
      }
      if (lang === 'python') {
        const file = path.join(tempDir, 'tc3.py');
        fs.writeFileSync(file, 'import sys\ndata = list(map(int, sys.stdin.read().split()))\nn, arr = data[0], data[1:]\nprint(f"{sum(arr)} {max(arr)}")');
        const run = await runProcess(PYTHON, [file], { stdin: stdinData });
        return { success: run.stdout === expected, durationMs: run.durationMs, summary: `Output: ${run.stdout}` };
      }
      if (lang === 'java') {
        const file = path.join(tempDir, 'TC3Arr.java');
        fs.writeFileSync(file, `
import java.util.Scanner;
public class TC3Arr {
    public static void main(String[] args) {
        Scanner s = new Scanner(System.in);
        int n = s.nextInt();
        int sum = 0, max = Integer.MIN_VALUE;
        for (int i = 0; i < n; i++) {
            int v = s.nextInt();
            sum += v;
            if (v > max) max = v;
        }
        System.out.println(sum + " " + max);
    }
}`);
        await runProcess(JAVAC, [file]);
        const run = await runProcess(JAVA, ['-cp', tempDir, 'TC3Arr'], { stdin: stdinData });
        return { success: run.stdout === expected, durationMs: run.durationMs, summary: `Output: ${run.stdout}` };
      }
      if (lang === 'javascript') {
        const file = path.join(tempDir, 'tc3.js');
        fs.writeFileSync(file, `
const fs = require('fs');
const nums = fs.readFileSync(0, 'utf-8').trim().split(/\\s+/).map(Number);
const n = nums[0];
const arr = nums.slice(1, n + 1);
const sum = arr.reduce((acc, v) => acc + v, 0);
const max = Math.max(...arr);
console.log(sum + " " + max);`);
        const run = await runProcess(NODE, [file], { stdin: stdinData });
        return { success: run.stdout === expected, durationMs: run.durationMs, summary: `Output: ${run.stdout}` };
      }
    }));

    // --- TC4: Multiple Test Cases ---
    report[lang].push(await runTest(lang, 'TC4: Multiple test cases', async () => {
      const stdinData = '3\n2 5\n10 20\n-5 5\n';
      const expected = '7\n30\n0';
      if (lang === 'c') {
        const file = path.join(tempDir, 'tc4.c');
        const exe = path.join(tempDir, 'tc4.exe');
        fs.writeFileSync(file, `
#include <stdio.h>
int main() {
    int t, a, b;
    if (scanf("%d", &t) != 1) return 0;
    while (t--) {
        scanf("%d %d", &a, &b);
        printf("%d\\n", a + b);
    }
    return 0;
}`);
        await runProcess(GCC, [file, '-o', exe]);
        const run = await runProcess(exe, [], { stdin: stdinData });
        return { success: run.stdout === expected, durationMs: run.durationMs, summary: `Output lines: ${run.stdout.split('\n').length}` };
      }
      if (lang === 'cpp') {
        const file = path.join(tempDir, 'tc4.cpp');
        const exe = path.join(tempDir, 'tc4_cpp.exe');
        fs.writeFileSync(file, `
#include <iostream>
int main() {
    int t, a, b;
    if (!(std::cin >> t)) return 0;
    while (t--) {
        std::cin >> a >> b;
        std::cout << (a + b) << std::endl;
    }
    return 0;
}`);
        await runProcess(GPP, [file, '-o', exe]);
        const run = await runProcess(exe, [], { stdin: stdinData });
        return { success: run.stdout === expected, durationMs: run.durationMs, summary: `Output lines: ${run.stdout.split('\n').length}` };
      }
      if (lang === 'python') {
        const file = path.join(tempDir, 'tc4.py');
        fs.writeFileSync(file, `
import sys
input_data = sys.stdin.read().split()
if input_data:
    t = int(input_data[0])
    idx = 1
    for _ in range(t):
        a, b = int(input_data[idx]), int(input_data[idx+1])
        idx += 2
        print(a + b)`);
        const run = await runProcess(PYTHON, [file], { stdin: stdinData });
        return { success: run.stdout === expected, durationMs: run.durationMs, summary: `Output lines: ${run.stdout.split('\n').length}` };
      }
      if (lang === 'java') {
        const file = path.join(tempDir, 'TC4Multi.java');
        fs.writeFileSync(file, `
import java.util.Scanner;
public class TC4Multi {
    public static void main(String[] args) {
        Scanner s = new Scanner(System.in);
        if (!s.hasNextInt()) return;
        int t = s.nextInt();
        while (t-- > 0) {
            int a = s.nextInt();
            int b = s.nextInt();
            System.out.println(a + b);
        }
    }
}`);
        await runProcess(JAVAC, [file]);
        const run = await runProcess(JAVA, ['-cp', tempDir, 'TC4Multi'], { stdin: stdinData });
        return { success: run.stdout === expected, durationMs: run.durationMs, summary: `Output lines: ${run.stdout.split('\n').length}` };
      }
      if (lang === 'javascript') {
        const file = path.join(tempDir, 'tc4.js');
        fs.writeFileSync(file, `
const fs = require('fs');
const tokens = fs.readFileSync(0, 'utf-8').trim().split(/\\s+/).map(Number);
const t = tokens[0];
let idx = 1;
const out = [];
for (let i = 0; i < t; i++) {
    out.push(tokens[idx] + tokens[idx + 1]);
    idx += 2;
}
console.log(out.join('\\n'));`);
        const run = await runProcess(NODE, [file], { stdin: stdinData });
        return { success: run.stdout === expected, durationMs: run.durationMs, summary: `Output lines: ${run.stdout.split('\n').length}` };
      }
    }));

    // --- TC5: Compilation Failure ---
    report[lang].push(await runTest(lang, 'TC5: Compilation Failure', async () => {
      if (lang === 'c') {
        const file = path.join(tempDir, 'tc5_err.c');
        fs.writeFileSync(file, '#include <stdio.h>\nint main() { int x = ; return 0; }');
        const comp = await runProcess(GCC, [file]);
        return { success: comp.exitCode !== 0 && comp.stderr.length > 0, durationMs: comp.durationMs, summary: `Compilation rejected as expected (Exit ${comp.exitCode})` };
      }
      if (lang === 'cpp') {
        const file = path.join(tempDir, 'tc5_err.cpp');
        fs.writeFileSync(file, '#include <iostream>\nint main() { undeclared_identifier = 10; return 0; }');
        const comp = await runProcess(GPP, [file]);
        return { success: comp.exitCode !== 0 && comp.stderr.length > 0, durationMs: comp.durationMs, summary: `Compilation rejected as expected (Exit ${comp.exitCode})` };
      }
      if (lang === 'python') {
        const file = path.join(tempDir, 'tc5_err.py');
        fs.writeFileSync(file, 'def invalid syntax: pass');
        const run = await runProcess(PYTHON, [file]);
        return { success: run.exitCode !== 0 && (run.stderr.includes('SyntaxError') || run.stderr.length > 0), durationMs: run.durationMs, summary: `Syntax error detected (Exit ${run.exitCode})` };
      }
      if (lang === 'java') {
        const file = path.join(tempDir, 'TC5Err.java');
        fs.writeFileSync(file, 'public class TC5Err { public static void main(String[] args) { int missingSemicolon = 5 } }');
        const comp = await runProcess(JAVAC, [file]);
        return { success: comp.exitCode !== 0 && comp.stderr.length > 0, durationMs: comp.durationMs, summary: `Javac compilation rejected (Exit ${comp.exitCode})` };
      }
      if (lang === 'javascript') {
        const file = path.join(tempDir, 'tc5_err.js');
        fs.writeFileSync(file, 'function () { invalid syntax }');
        const run = await runProcess(NODE, [file]);
        return { success: run.exitCode !== 0 && (run.stderr.includes('SyntaxError') || run.stderr.length > 0), durationMs: run.durationMs, summary: `Node syntax error caught (Exit ${run.exitCode})` };
      }
    }));

    // --- TC6: Runtime Exception ---
    report[lang].push(await runTest(lang, 'TC6: Runtime Exception', async () => {
      if (lang === 'c') {
        const file = path.join(tempDir, 'tc6.c');
        const exe = path.join(tempDir, 'tc6.exe');
        fs.writeFileSync(file, '#include <stdio.h>\n#include <stdlib.h>\nint main() { int *p = NULL; *p = 42; return 0; }'); // SIGSEGV
        await runProcess(GCC, [file, '-o', exe]);
        const run = await runProcess(exe, []);
        return { success: run.exitCode !== 0, durationMs: run.durationMs, summary: `Segmentation fault caught (Exit code ${run.exitCode})` };
      }
      if (lang === 'cpp') {
        const file = path.join(tempDir, 'tc6.cpp');
        const exe = path.join(tempDir, 'tc6_cpp.exe');
        fs.writeFileSync(file, '#include <stdexcept>\nint main() { throw std::runtime_error("Simulated Fatal Exception"); return 0; }');
        await runProcess(GPP, [file, '-o', exe]);
        const run = await runProcess(exe, []);
        return { success: run.exitCode !== 0, durationMs: run.durationMs, summary: `Exception caught (Exit code ${run.exitCode})` };
      }
      if (lang === 'python') {
        const file = path.join(tempDir, 'tc6.py');
        fs.writeFileSync(file, 'x = 1 / 0');
        const run = await runProcess(PYTHON, [file]);
        return { success: run.exitCode !== 0 && run.stderr.includes('ZeroDivisionError'), durationMs: run.durationMs, summary: `ZeroDivisionError caught (Exit ${run.exitCode})` };
      }
      if (lang === 'java') {
        const file = path.join(tempDir, 'TC6Ex.java');
        fs.writeFileSync(file, 'public class TC6Ex { public static void main(String[] args) { int[] arr = new int[2]; System.out.println(arr[10]); } }');
        await runProcess(JAVAC, [file]);
        const run = await runProcess(JAVA, ['-cp', tempDir, 'TC6Ex']);
        return { success: run.exitCode !== 0 && run.stderr.includes('ArrayIndexOutOfBoundsException'), durationMs: run.durationMs, summary: `ArrayIndexOutOfBounds caught (Exit ${run.exitCode})` };
      }
      if (lang === 'javascript') {
        const file = path.join(tempDir, 'tc6.js');
        fs.writeFileSync(file, 'throw new Error("Simulated Runtime Exception in Node");');
        const run = await runProcess(NODE, [file]);
        return { success: run.exitCode !== 0 && run.stderr.includes('Simulated Runtime Exception'), durationMs: run.durationMs, summary: `Node unhandled error caught (Exit ${run.exitCode})` };
      }
    }));

    // --- TC7: Infinite Loop (Timeout Enforcement) ---
    report[lang].push(await runTest(lang, 'TC7: Infinite Loop (Timeout Enforcement)', async () => {
      const timeoutLimitMs = 1500;
      if (lang === 'c') {
        const file = path.join(tempDir, 'tc7.c');
        const exe = path.join(tempDir, 'tc7.exe');
        fs.writeFileSync(file, 'int main() { while (1) {} return 0; }');
        await runProcess(GCC, [file, '-o', exe]);
        const run = await runProcess(exe, [], { timeoutMs: timeoutLimitMs });
        return { success: run.timedOut, durationMs: run.durationMs, summary: `Timeout killed after ${run.durationMs}ms (Limit: ${timeoutLimitMs}ms)` };
      }
      if (lang === 'cpp') {
        const file = path.join(tempDir, 'tc7.cpp');
        const exe = path.join(tempDir, 'tc7_cpp.exe');
        fs.writeFileSync(file, 'int main() { volatile int x = 0; while (1) { x++; } return 0; }');
        await runProcess(GPP, [file, '-o', exe]);
        const run = await runProcess(exe, [], { timeoutMs: timeoutLimitMs });
        return { success: run.timedOut, durationMs: run.durationMs, summary: `Timeout killed after ${run.durationMs}ms (Limit: ${timeoutLimitMs}ms)` };
      }
      if (lang === 'python') {
        const file = path.join(tempDir, 'tc7.py');
        fs.writeFileSync(file, 'while True: pass');
        const run = await runProcess(PYTHON, [file], { timeoutMs: timeoutLimitMs });
        return { success: run.timedOut, durationMs: run.durationMs, summary: `Timeout killed after ${run.durationMs}ms (Limit: ${timeoutLimitMs}ms)` };
      }
      if (lang === 'java') {
        const file = path.join(tempDir, 'TC7Loop.java');
        fs.writeFileSync(file, 'public class TC7Loop { public static void main(String[] args) { while(true) {} } }');
        await runProcess(JAVAC, [file]);
        const run = await runProcess(JAVA, ['-cp', tempDir, 'TC7Loop'], { timeoutMs: timeoutLimitMs });
        return { success: run.timedOut, durationMs: run.durationMs, summary: `Timeout killed after ${run.durationMs}ms (Limit: ${timeoutLimitMs}ms)` };
      }
      if (lang === 'javascript') {
        const file = path.join(tempDir, 'tc7.js');
        fs.writeFileSync(file, 'while (true) {}');
        const run = await runProcess(NODE, [file], { timeoutMs: timeoutLimitMs });
        return { success: run.timedOut, durationMs: run.durationMs, summary: `Timeout killed after ${run.durationMs}ms (Limit: ${timeoutLimitMs}ms)` };
      }
    }));

    // --- TC8: Excessive Memory Allocation ---
    report[lang].push(await runTest(lang, 'TC8: Excessive Memory Allocation', async () => {
      if (lang === 'c') {
        const file = path.join(tempDir, 'tc8.c');
        const exe = path.join(tempDir, 'tc8.exe');
        fs.writeFileSync(file, `
#include <stdlib.h>
#include <stdio.h>
int main() {
    size_t huge = 2147483648UL; // 2 GB
    void *ptr = malloc(huge);
    if (!ptr) {
        printf("ALLOC_FAILED\\n");
        return 0;
    }
    printf("ALLOC_OK\\n");
    return 0;
}`);
        await runProcess(GCC, [file, '-o', exe]);
        const run = await runProcess(exe, []);
        return { success: run.stdout === 'ALLOC_FAILED' || run.exitCode !== 0, durationMs: run.durationMs, summary: `Excess memory allocation guarded (${run.stdout || 'killed'})` };
      }
      if (lang === 'cpp') {
        const file = path.join(tempDir, 'tc8.cpp');
        const exe = path.join(tempDir, 'tc8_cpp.exe');
        fs.writeFileSync(file, `
#include <iostream>
#include <vector>
int main() {
    try {
        std::vector<int> huge(1000000000000ULL);
        std::cout << "ALLOC_OK" << std::endl;
    } catch (const std::exception &e) {
        std::cout << "BAD_ALLOC_CAUGHT" << std::endl;
    }
    return 0;
}`);
        await runProcess(GPP, [file, '-o', exe]);
        const run = await runProcess(exe, []);
        return { success: run.stdout === 'BAD_ALLOC_CAUGHT' || run.exitCode !== 0, durationMs: run.durationMs, summary: `Memory allocation guarded: ${run.stdout}` };
      }
      if (lang === 'python') {
        const file = path.join(tempDir, 'tc8.py');
        fs.writeFileSync(file, `
try:
    arr = [0] * (10 ** 12)
    print("ALLOC_OK")
except (MemoryError, OverflowError):
    print("MEMORY_LIMIT_CAUGHT")`);
        const run = await runProcess(PYTHON, [file]);
        return { success: run.stdout === 'MEMORY_LIMIT_CAUGHT' || run.exitCode !== 0, durationMs: run.durationMs, summary: `Memory exception guarded: ${run.stdout}` };
      }
      if (lang === 'java') {
        const file = path.join(tempDir, 'TC8Mem.java');
        fs.writeFileSync(file, `
import java.util.ArrayList;
public class TC8Mem {
    public static void main(String[] args) {
        try {
            ArrayList<byte[]> list = new ArrayList<>();
            while (true) {
                list.add(new byte[10 * 1024 * 1024]); // 10MB chunks
            }
        } catch (OutOfMemoryError e) {
            System.out.println("OOM_CAUGHT");
        }
    }
}`);
        await runProcess(JAVAC, [file]);
        const run = await runProcess(JAVA, ['-Xmx64m', '-cp', tempDir, 'TC8Mem']);
        return { success: run.stdout === 'OOM_CAUGHT' || run.stderr.includes('OutOfMemoryError'), durationMs: run.durationMs, summary: `Java OOM bounded by -Xmx64m: ${run.stdout || 'OOM'}` };
      }
      if (lang === 'javascript') {
        const file = path.join(tempDir, 'tc8.js');
        fs.writeFileSync(file, `
try {
    const arr = new Array(1e10);
    console.log("ALLOC_OK");
} catch (e) {
    console.log("RANGE_ERROR_CAUGHT");
}`);
        const run = await runProcess(NODE, [file]);
        return { success: run.stdout === 'RANGE_ERROR_CAUGHT' || run.exitCode !== 0, durationMs: run.durationMs, summary: `Allocation bound caught: ${run.stdout}` };
      }
    }));

    console.log('');
  }

  // Summary
  let totalTests = 0;
  let passedTests = 0;
  for (const lang of Object.keys(report)) {
    for (const res of report[lang]) {
      totalTests++;
      if (res.success) passedTests++;
    }
  }

  console.log('========================================================================');
  console.log(`FINAL RESULT: ${passedTests} / ${totalTests} REAL EXECUTION TESTS PASSED`);
  console.log('========================================================================');

  // Clean up
  try {
    fs.rmSync(tempDir, { recursive: true, force: true });
  } catch (e) {}

  if (passedTests === totalTests) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

main();
