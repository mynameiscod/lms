import json, urllib.request
B = "http://localhost:2000/api/v2/execute"

def run(lang, ver, files, stdin=""):
    body = json.dumps({"language": lang, "version": ver, "files": files, "stdin": stdin,
                       "run_timeout": 30000, "run_cpu_time": 30000,
                       "compile_timeout": 20000, "compile_cpu_time": 20000}).encode()
    req = urllib.request.Request(B, body, {"Content-Type": "application/json"})
    return json.load(urllib.request.urlopen(req, timeout=180))

fails = 0

print("=== output ceiling (production default was 1024; 1025 was SIGKILL) ===")
for n in (1024, 1025, 2048, 32768, 1048576):
    j = run("python", "3.10.0", [{"name": "m.py", "content": 'import sys\nsys.stdout.write("X"*%d)' % n}])
    got = len(j["run"]["stdout"]); sig = j["run"].get("signal"); code = j["run"]["code"]
    ok = (got == n and not sig)
    fails += 0 if ok else 1
    print("  %8d -> %8d bytes  exit=%s signal=%s  %s" % (n, got, code, sig, "PASS" if ok else "FAIL"))

print("\n=== Java bubble sort (Phase 1 acceptance program) ===")
java = ('public class Main {\n'
        '  public static void main(String[] a){\n'
        '    int[] arr = {8,3,12,5,10,2};\n'
        '    for (int i=0;i<arr.length-1;i++)\n'
        '      for (int j=0;j<arr.length-i-1;j++)\n'
        '        if (arr[j]>arr[j+1]){int t=arr[j];arr[j]=arr[j+1];arr[j+1]=t;}\n'
        '    for (int v: arr) System.out.print(v+" ");\n'
        '  }\n}')
j = run("java", "15.0.2", [{"name": "Main", "content": java}])
out = j["run"]["stdout"].strip(); ok = out == "2 3 5 8 10 12"
fails += 0 if ok else 1
print("  output: %r  %s" % (out, "PASS" if ok else "FAIL"))

# Piston compiles files[0] ONLY for Java, and appends ".java" to the name itself — a
# second .java file is written to the job directory and never compiled. So the trace
# harness is APPENDED to the same file as a second top-level class. Order is
# load-bearing: Java's single-file launcher runs the first class declared, so putting
# the harness first fails with "can't find main".
print("\n=== trace harness appended to the student's file ===")
j = run("java", "15.0.2", [{"name": "Main", "content":
        'public class Main{public static void main(String[] a){CBTrace.hello();}}\n'
        'class CBTrace{static void hello(){System.out.print("harness-ok");}}'}])
out = j["run"]["stdout"].strip(); ok = out == "harness-ok"
fails += 0 if ok else 1
print("  output: %r  %s" % (out, "PASS" if ok else "FAIL"))

print("\n=== stdin, and the other languages ===")
cases = [("python", "3.10.0", "m.py", "print(int(input())*2)", "21", "42"),
         ("javascript", "18.15.0", "m.js", "console.log(6*7)", "", "42"),
         ("c++", "10.2.0", "m.cpp", "#include <iostream>\nint main(){std::cout<<6*7;}", "", "42"),
         ("go", "1.16.2", "m.go", 'package main\nimport "fmt"\nfunc main(){fmt.Print(6*7)}', "", "42")]
for lang, ver, fn, src, stdin, exp in cases:
    j = run(lang, ver, [{"name": fn, "content": src}], stdin)
    o = j["run"]["stdout"].strip(); ok = o == exp
    fails += 0 if ok else 1
    print("  %-12s %-8r %s" % (lang, o, "PASS" if ok else "FAIL"))

print("\n=== compile error is reported, not swallowed ===")
# Java compile errors surface in run.stderr, not compile.stderr: Piston uses the
# single-file source launcher, so compilation happens inside the run stage.
j = run("java", "15.0.2", [{"name": "Main", "content": "public class Main{ oops }"}])
comp = j["run"].get("stderr", "")
ok = bool(comp.strip())
fails += 0 if ok else 1
print("  compiler said: %r  %s" % (comp.strip()[:70], "PASS" if ok else "FAIL"))

print("\n%s" % ("ALL CHECKS PASSED" if fails == 0 else "%d CHECK(S) FAILED" % fails))
