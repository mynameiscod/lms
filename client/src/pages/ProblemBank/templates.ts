/**
 * Starter skeletons per language: read stdin, leave a TODO. Used when an author enables a
 * language, so every problem starts from a program that compiles on the judge as-is.
 */
export const STARTER_TEMPLATES: Record<string, string> = {
  python: `import sys


def main():
    data = sys.stdin.read().split()
    # TODO: solve and print the answer


if __name__ == "__main__":
    main()
`,
  java: `import java.util.*;
import java.io.*;

public class Main {
    public static void main(String[] args) throws IOException {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        // TODO: read the input and print the answer
    }
}
`,
  cpp: `#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    // TODO: read the input and print the answer
    return 0;
}
`,
  c: `#include <stdio.h>

int main(void) {
    // TODO: read the input and print the answer
    return 0;
}
`,
  javascript: `const lines = require('fs').readFileSync(0, 'utf8').trim().split('\\n');
// TODO: read the input from lines and print the answer
`,
  typescript: `declare const require: any;
const lines: string[] = require('fs').readFileSync(0, 'utf8').trim().split('\\n');
// TODO: read the input from lines and print the answer
`,
  csharp: `using System;
using System.Linq;

public class Program {
    public static void Main() {
        // TODO: read the input with Console.ReadLine() and print the answer
    }
}
`,
  go: `package main

import (
\t"bufio"
\t"fmt"
\t"os"
)

func main() {
\treader := bufio.NewReader(os.Stdin)
\t_ = reader
\t// TODO: read the input and print the answer
\tfmt.Print("")
}
`,
  rust: `use std::io::{self, Read};

fn main() {
    let mut input = String::new();
    io::stdin().read_to_string(&mut input).unwrap();
    // TODO: parse the input and print the answer
}
`,
  sql: `-- Write the query that returns the required rows
SELECT 1;
`,
};

export const MONACO_LANG: Record<string, string> = {
  python: 'python', java: 'java', cpp: 'cpp', c: 'c', javascript: 'javascript', typescript: 'typescript',
  csharp: 'csharp', go: 'go', rust: 'rust', sql: 'sql',
};
