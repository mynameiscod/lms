/**
 * T_LINUX, T_PROCESSES, T_OS_MEMORY — the operating system underneath every program.
 *
 * ── WHY THESE TOPICS, AND WHO THEY ARE FOR ────────────────────────────────────────────────
 *
 * UNIVERSAL. Whatever direction a first-year takes, their code will run as a process, as some
 * user, with an environment, inside a virtual address space, on a machine that writes logs. The
 * errors they will meet most often in their first internship — "Permission denied", "command not
 * found", "Address already in use", "Killed" — are the operating system talking, and these three
 * topics teach them to hear which part of the system is speaking.
 *
 * ── THE LINE THESE TOPICS HOLD ────────────────────────────────────────────────────────────
 *
 * This is working knowledge of a real Linux machine, not an operating-systems theory course.
 * Every idea is attached to a command the learner can run and an output they can read: `id` and
 * /etc/passwd for identity, `echo $PATH` for "command not found", `ps`, `top` and `kill` for
 * processes, `free` and RSS for memory. Scheduling algorithms, page-replacement policies and
 * kernel internals are left to the degree; fork, exec, pages and page tables appear only as far
 * as they explain something the learner will actually see.
 *
 * What these topics deliberately do NOT re-teach, because other units own it: pipelines,
 * redirection and grep (T_SHELL_PIPELINES), and reading or changing rwx permission bits
 * (T_FILES_PERMISSIONS). Users and groups here explains who the kernel thinks you are; it refers
 * to permissions rather than teaching them again. What any operating system is for — scheduling,
 * memory protection, drivers, system calls — is T_HARDWARE_OS_ROLE's, so T_LINUX_WHAT_AN_OS_DOES
 * builds on it with what is particular to Linux: kernel versus distribution, the boot path to
 * PID 1, the shell as an ordinary program, /proc and strace.
 *
 * Each topic declares a single skill (OPERATING_SYSTEMS, OS_PROCESSES, OS_MEMORY), so checkpoint
 * questions carry no per-question skillKey.
 */

import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (
  question: string, options: [string, boolean][], explanation: string, skillKey?: string,
): PilotMcq => ({
  question,
  options: options.map(([text, isCorrect]) => ({ text, isCorrect })),
  explanation,
  ...(skillKey ? { skillKey } : {}),
});

export const OPERATING_SYSTEMS_BUNDLES: PilotBundle[] = [
  /* ── T_LINUX ─────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'T_LINUX_WHAT_AN_OS_DOES',
    notes: `"What the Operating System Is For" covered what every operating system does: share the
processor, keep programs' memory apart, turn blocks into files, drive devices, and answer
programs through system calls. This unit is about the operating system you will actually meet on
servers, in the cloud and in most programming jobs — Linux — and how to see those jobs happening.

**Linux is a kernel. What you install is a distribution.** Strictly, "Linux" is only the kernel.
Ubuntu, Fedora and Debian are **distributions**: the same kernel packaged with the GNU tools
(\`ls\`, \`cp\`, \`grep\`), a package manager, a start-up system and defaults. Two commands tell
them apart:

    $ uname -r
    6.8.0-45-generic
    $ grep PRETTY_NAME /etc/os-release
    PRETTY_NAME="Ubuntu 24.04.1 LTS"

The first is the kernel's version, the second the distribution's. Android also runs the Linux
kernel, with its own software above it instead of a desktop distribution's tools.

**From the power button to your prompt:**

1. **Firmware** (UEFI) checks the hardware and finds a bootloader.
2. **The bootloader** (usually GRUB) loads the kernel into memory.
3. **The kernel** detects the hardware, loads drivers and mounts the root file system.
4. **The first process, PID 1**, is started — on most distributions this is **systemd**, which
   starts every service: networking, logging, the SSH server.
5. **A login** hands you a **shell**, such as bash, running as your user.

When a machine "does not boot", knowing these stages is how you say where it stopped.

**The shell is just a program.** bash is an ordinary process. When you type \`ls\`, the shell asks
the kernel to start another ordinary program, \`/usr/bin/ls\`, and waits for it. \`which ls\`
shows where it lives. Swap bash for zsh and the operating system has not changed at all.

**Looking inside with /proc.** The kernel publishes its live state as files that are generated
the moment you read them: \`cat /proc/cpuinfo\` for the processor, \`cat /proc/meminfo\` for memory,
and a folder \`/proc/<PID>\` for every running process. Nothing there is stored on disk.

**Watching system calls.** \`strace\` prints every request a program makes to the kernel:

    $ strace -e trace=openat,read cat marks.csv
    openat(AT_FDCWD, "marks.csv", O_RDONLY) = 3
    read(3, "roll,name,marks\\n101,Asha,78\\n", 131072) = 28

(The real output has a few more lines from \`cat\` starting up.) \`cat\` asked the kernel to open
the file, was given the number 3 to refer to it, then asked to read it and received 28 bytes.

**A common misconception: commands are part of Linux.** \`ls\`, \`cp\` and \`grep\` are separate
programs a distribution happens to include. The kernel has no idea what \`ls\` is; it only knows a
program asked to list a directory.

**Why this matters.** Each layer has its own evidence. Firmware and bootloader problems appear
before the kernel starts; a failed service is systemd's to report; "command not found" is the
shell; "Permission denied" is the kernel answering a system call. Naming the layer tells you which
tool and which log to reach for.`,
    mcqs: [
      mcq('Which command reports the version of the Linux kernel itself, rather than the distribution?',
        [['uname -r', true], ['cat /etc/os-release', false], ['ls /boot/grub', false], ['echo $SHELL', false]],
        'uname -r prints the running kernel\'s release. /etc/os-release describes the distribution packaged around it, which is a different thing with a different version.'),
      mcq('On most modern distributions, which program runs as PID 1 and starts the system\'s services?',
        [['systemd', true], ['bash', false], ['GRUB', false], ['sshd', false]],
        'The kernel starts exactly one process, PID 1, and on most distributions that is systemd. GRUB runs before the kernel, bash is started much later for a user, and sshd is one of the services systemd starts.'),
      mcq('Typing `ls` lists the files in a folder. Where does the code that does the listing actually live?',
        [['In an ordinary program file such as /usr/bin/ls', true],
          ['Inside the kernel, as one of its built-in commands', false],
          ['Inside the shell, which contains every Linux command', false],
          ['In the bootloader, which loads commands at start-up', false]],
        'ls is a separate program the distribution includes; which ls shows its path. The shell starts it and the kernel runs it, but neither contains it.'),
      mcq('You run `cat /proc/meminfo` and see memory figures that change every time. What is /proc?',
        [['Files the kernel generates on demand to show its current state', true],
          ['A folder of log files that the kernel writes to the disk hourly', false],
          ['A backup of the settings the machine was installed with', false],
          ['A cache of recently opened programs kept for fast start-up', false]],
        'Nothing in /proc is stored on disk. Each read asks the kernel for its live state, which is why the figures change between reads.'),
    ],
    checkpoint: [
      mcq('A server shows the kernel loading and then a list of failed services, and never reaches a login prompt. Where should the investigation start?',
        [['The services PID 1 (systemd) tried to start after the kernel', true],
          ['The firmware, since the machine clearly never started up', false],
          ['The shell configuration file in your own home directory', false],
          ['The bootloader, since it must have loaded the wrong disk', false]],
        'The kernel loaded, so firmware and bootloader did their jobs. Services are started by PID 1, so the failure belongs to that stage, and systemd records why each one failed.'),
      mcq('A classmate changes their login shell from bash to zsh and asks whether Linux itself has changed. What is the accurate answer?',
        [['No; the shell is an ordinary program the kernel runs', true],
          ['Yes; the shell is part of the kernel, so it was replaced', false],
          ['Yes; every shell ships with its own copy of the kernel', false],
          ['No, but every program must be reinstalled to match it', false]],
        'A shell is a user program that reads commands and starts other programs. Replacing it changes the prompt and syntax, not the kernel or the distribution.'),
      mcq('Why is Android described as running Linux, although it has no apt and none of the usual GNU tools?',
        [['It runs the Linux kernel with its own software layer above it', true],
          ['It was written by the same organisation that maintains Ubuntu', false],
          ['Its apps are compiled from the same source code as the GNU tools', false],
          ['It uses a Linux desktop environment adapted for touchscreens', false]],
        'Linux strictly names the kernel. A distribution\'s tools are optional, and Android replaces them with its own runtime and apps while keeping the kernel.'),
    ],
  },
  {
    unitCode: 'T_LINUX_USERS_AND_GROUPS',
    notes: `Every process on a Linux machine runs as some user, and the kernel decides what it may do
from that identity. Find out who you are:

    $ id
    uid=1000(asha) gid=1000(asha) groups=1000(asha),27(sudo),998(docker)

The kernel works with the numbers: a **UID** for the user and **GIDs** for groups. The names are
for humans, looked up in two text files.

**/etc/passwd** has one line per account:

    asha:x:1000:1000:Asha Rao:/home/asha:/bin/bash

The fields are: username, \`x\`, UID, primary GID, full name, home directory, login shell. The
\`x\` says the password hash is kept in **/etc/shadow**, which only root can read. /etc/passwd
itself is readable by everyone, because programs such as \`ls -l\` need to turn UIDs into names.

**System accounts.** You will also see \`www-data\`, \`postgres\` and \`systemd-network\`, usually
with UIDs below 1000 and the shell \`/usr/sbin/nologin\`. Nobody logs in as them. Services run as
these accounts so that a web server which is broken into can only damage what \`www-data\` is
allowed to touch.

**Groups** let several users share access. /etc/group lists members, as in \`docker:x:998:asha\`.
A directory owned by group \`analysts\` with group write permission can be written by every member
(how those permission bits are read is in Permissions and Ownership). To add a user to a group:

    $ sudo usermod -aG docker asha

The \`-a\` is essential: without it, \`-G docker\` **replaces** her supplementary groups, removing
\`sudo\` too. Membership is read at login, so the change appears only in a new session.

**root** is UID 0, and the kernel skips almost every permission check for it. That is exactly why
you do not work as root: every typo and every script you run has the power to destroy the system.

**sudo** runs one command as root. It asks for **your** password, checks that you are allowed (on
Ubuntu, members of group \`sudo\`; on Fedora, \`wheel\`) and records the command in the auth log.
\`su\`, by contrast, switches to another user and wants that user's password.

**The misconception: "Permission denied, so add sudo."** \`sudo git clone\` into your home folder
creates files owned by root, and later your own \`git pull\` fails. First ask why you were refused:
wrong owner? Should you be in a group? sudo is for changing the system, not for silencing errors.

**A trap worth knowing.** \`sudo echo "x" > /etc/motd\` still fails, because your own unprivileged
shell opens the file for the redirect before sudo runs. \`echo "x" | sudo tee /etc/motd\` works.`,
    mcqs: [
      mcq('In `asha:x:1000:1000:Asha Rao:/home/asha:/bin/bash`, what does the third field record?',
        [['Her user ID, the number the kernel actually checks', true],
          ['Her primary group ID, which sets her default group', false],
          ['The number of days until her password must change', false],
          ['The largest number of processes she may run at once', false]],
        'The fields are name, x, UID, GID, full name, home and shell. The third is the UID; the fourth, also 1000 here, is the primary group.'),
      mcq('Why is the `x` in the second field of /etc/passwd not a real password?',
        [['The hashes are kept in /etc/shadow, which only root can read', true],
          ['The account is disabled, and x marks it as unable to log in', false],
          ['Linux stores each password in a hidden file in the home folder', false],
          ['The password shows as x until the user next logs in and sets it', false]],
        '/etc/passwd must be readable by everyone so programs can map UIDs to names. Keeping hashes in /etc/shadow stops ordinary users copying them to crack offline.'),
      mcq('`sudo usermod -G docker asha` is run without `-a`. What happens to her groups?',
        [['Her other supplementary groups, sudo included, are replaced by docker', true],
          ['Nothing changes, because -a is only needed when creating an account', false],
          ['docker is added, and the old groups stay until her next logout', false],
          ['The command is refused, since groups can only be changed with -a', false]],
        'Without -a (append), -G sets the complete list of supplementary groups. It is a common way to lock yourself out of sudo.'),
      mcq('After being added to the `docker` group, running `id` in her already-open terminal still does not list it. Why?',
        [['Group membership is read at login, and that shell started before the change', true],
          ['The kernel re-reads /etc/group only once an hour, on a fixed schedule', false],
          ['usermod needs a reboot before it writes the change to /etc/group', false],
          ['id lists primary groups only, and docker is a supplementary group', false]],
        'A process keeps the group list it started with. Logging out and back in, or opening a new login session, picks up the new membership.'),
    ],
    checkpoint: [
      mcq('A web server running as the unprivileged user www-data is broken into. What does that design choice limit?',
        [['The attacker can only change what www-data is permitted to change', true],
          ['The attacker cannot read any files at all, as www-data has no home', false],
          ['The attacker is logged out automatically when the server restarts', false],
          ['Nothing, because services are always given root access underneath', false]],
        'The intruder inherits the identity of the process they took over. A service account with narrow rights keeps the damage narrow; the same compromise as root would own the machine.'),
      mcq('`sudo echo \'welcome\' > /etc/motd` still says Permission denied. Why?',
        [['Your own shell opens the file for the redirect, before sudo runs', true],
          ['echo is a shell builtin, and sudo refuses to run builtins as root', false],
          ['Files in /etc can only be changed by logging in directly as root', false],
          ['sudo needs the -s flag before it will write to any file in /etc', false]],
        'The redirect is part of your unprivileged shell\'s work, done before the sudo command starts. Piping into sudo tee makes the privileged process do the writing.'),
      mcq('A student ran `sudo git clone` into their home folder, and now `git pull` fails with Permission denied. What is the cause?',
        [['The cloned files are owned by root, so their user cannot write to them', true],
          ['git refuses to update any repository that was first cloned with sudo', false],
          ['sudo cached their password, and the cache expired before the pull ran', false],
          ['The home folder became read-only once a root command had written to it', false]],
        'Files are owned by the user who created them, and sudo made that root. Fixing ownership, and cloning without sudo next time, is the real repair.'),
    ],
  },
  {
    unitCode: 'T_LINUX_PACKAGES',
    notes: `On Linux, installing software is normally one command, and that command does far more than
download a file.

    $ sudo apt update
    $ sudo apt install tree

**The package manager** is \`apt\` on Debian and Ubuntu, \`dnf\` on Fedora and Red Hat, \`pacman\`
on Arch, and Homebrew (\`brew\`) on a Mac. A **package** is an archive of files plus metadata: its
version, the other packages it depends on, and scripts to run when it is installed.

**What each command actually does:**

- \`apt update\` downloads the latest **list** of available packages from the repositories. It
  installs and upgrades nothing.
- \`apt install tree\` works out dependencies, downloads the packages, checks their signatures and
  unpacks the files into system directories.
- \`apt upgrade\` installs newer versions of packages you already have.
- \`apt remove tree\` removes the program but leaves its system-wide configuration in /etc;
  \`apt purge tree\` removes that too; \`apt autoremove\` removes dependencies nothing needs now.

**Where the files go.** Ask the package manager:

    $ dpkg -L tree
    /usr/bin/tree
    /usr/share/doc/tree/copyright
    /usr/share/man/man1/tree.1.gz

(trimmed to the files). Programs go in /usr/bin, libraries in /usr/lib, configuration in /etc and
documentation in /usr/share. Those directories belong to root, which is why installing needs sudo.
Because apt recorded every file, it can later remove them cleanly.

**Trust.** Repositories are signed by the distribution, and apt refuses packages whose signature
does not check. Compare \`curl https://example.com/install.sh | sudo bash\`: that runs whatever the
server sends, as root, and apt knows nothing about what it installed, so there are no updates and
no clean removal. Some vendors genuinely ship software that way; read the script before running it.

**Language package managers are a separate world.** \`pip\` and \`npm\` install libraries for one
language, not programs for the system. On recent Ubuntu and Debian, \`pip install requests\`
outside a virtual environment stops with \`externally-managed-environment\`, protecting the system
Python that apt's own tools depend on. The fix is a virtual environment, not sudo.

**A common misconception: "apt update updates my software."** It only refreshes the list. The
related surprise is \`E: Unable to locate package\` in a fresh Docker container: the image ships
with no package lists at all, so \`apt update\` must come first.`,
    mcqs: [
      mcq('`sudo apt update` has just finished. What has changed on the machine?',
        [['The local list of available packages and versions is refreshed', true],
          ['Every installed package has been upgraded to its newest version', false],
          ['The kernel has been replaced with the latest one the repository has', false],
          ['Packages that nothing depends on any more have been removed', false]],
        'update only refreshes the index. Upgrading is apt upgrade, and removing unused dependencies is apt autoremove.'),
      mcq('In a fresh Ubuntu Docker container, `apt install curl` says `Unable to locate package curl`. What is the likely fix?',
        [['Run apt update first, since the container has no package lists yet', true],
          ['Download curl from its website, because apt does not include it', false],
          ['Use pip install curl, since command-line tools come from pip now', false],
          ['Run the same command with sudo, because the package list is private', false]],
        'Container images are shipped with the package lists removed to keep them small. apt cannot find any package until update has fetched the lists.'),
      mcq('Why does installing a package with apt need sudo?',
        [['It writes into directories such as /usr/bin that root owns', true],
          ['Downloading from the internet is restricted to the root user', false],
          ['Packages are encrypted, and only root holds the decryption key', false],
          ['apt must restart the computer, and only root is allowed to', false]],
        'The download itself needs no privilege. Unpacking into system directories does, because those directories belong to root.'),
      mcq('What does `apt purge nginx` do that `apt remove nginx` does not?',
        [['It also deletes the system-wide configuration files nginx has in /etc', true],
          ['It also deletes every website file that nginx has ever served to users', false],
          ['It removes nginx from every other computer on the same local network', false],
          ['It stops the running nginx, which remove leaves running in memory', false]],
        'remove keeps configuration in case you reinstall. purge removes that too; neither touches your own website files.'),
    ],
    checkpoint: [
      mcq('A tutorial says to run `curl https://get.example.dev | sudo bash`. Compared with apt install, what is the real risk?',
        [['Unreviewed code runs as root, and apt cannot track what it installs', true],
          ['curl downloads are slower, so the install may time out part way', false],
          ['bash scripts cannot install programs, so the command quietly fails', false],
          ['The script is written for Fedora and damages any Ubuntu machine', false]],
        'Whatever the server returns runs with full privileges, with no signature check, and leaves files apt has no record of, so they are never updated or cleanly removed.'),
      mcq('On Ubuntu 24.04, `pip install requests` stops with `externally-managed-environment`. What is the right response?',
        [['Create a virtual environment for the project and install into it', true],
          ['Add sudo, so pip has permission to write into the system Python', false],
          ['Remove the system Python, since it is blocking pip from working', false],
          ['Reinstall pip from its website, since the apt copy is out of date', false]],
        'The error exists to protect the system Python that apt-managed tools rely on. A virtual environment gives the project its own Python packages without touching it.'),
      mcq('After `sudo apt install tree`, the shell runs `tree` without being told where it is. Why?',
        [['The package put it in /usr/bin, a directory the shell already searches', true],
          ['apt adds an alias to your .bashrc for every program that it installs', false],
          ['The shell asks apt for the location each time a command is typed in', false],
          ['Installed programs are copied into whichever directory you are in', false]],
        'Packages install programs into standard directories, and the shell searches a list of those directories for every command name, which is the subject of the next unit.'),
    ],
  },
  {
    unitCode: 'T_LINUX_ENVIRONMENT',
    notes: `Every process carries a small set of named text values called its **environment**. Programs
read them for settings that should not be written into the code.

    $ echo $HOME
    /home/asha
    $ printenv USER LANG
    asha
    en_IN.UTF-8

**Inheritance.** When a process starts another, the child receives a **copy** of the parent's
environment. Changes flow downward only: a child can never change its parent's environment.

**A shell variable is not an environment variable until you export it.**

    $ GREETING=hello
    $ python3 -c "import os; print(os.environ.get('GREETING'))"
    None
    $ export GREETING=hello
    $ python3 -c "import os; print(os.environ.get('GREETING'))"
    hello

For a single command, put the assignment in front: \`DEBUG=1 python3 app.py\`.

**PATH is how the shell finds commands.** It is a colon-separated list of directories:

    $ echo $PATH
    /home/asha/.local/bin:/usr/local/bin:/usr/bin:/bin

When you type \`tree\`, the shell looks in each directory **from left to right** and runs the first
match. \`command not found\` means no directory on the list contains that name. \`which -a python3\`
shows every match, in the order they would be tried. The current directory is deliberately not on
the list, which is why you run a script beside you as \`./run.sh\`.

**Adding a directory:**

    export PATH="$HOME/.local/bin:$PATH"

The \`$PATH\` at the end keeps the old list. Forget it, as in \`export PATH="$HOME/tools"\`, and
\`ls\` itself becomes "command not found" in that terminal. A new terminal starts fresh.

**Making it permanent.** An \`export\` typed at the prompt lasts only for that shell. Put the line
in \`~/.bashrc\` (\`~/.zshrc\` for zsh); it is read by every new shell, and \`source ~/.bashrc\`
applies it to the current one. For the same reason \`bash setenv.sh\` cannot set variables for you:
the script runs in a child shell. \`source setenv.sh\` runs it in your own.

**Order explains "the wrong version runs".** Activating a Python virtual environment mostly puts
\`.venv/bin\` at the front of PATH, so its \`python\` is found first.

**Secrets.** API keys in environment variables keep them out of your code and out of git, but
\`env\` prints them, so never paste its output into a forum post or a bug report.

**A common misconception:** that \`export\` in one terminal affects your other terminals. Each shell
has its own environment, inherited when it started.`,
    mcqs: [
      mcq('PATH is `/home/asha/bin:/usr/local/bin:/usr/bin`, and a program called `backup` exists in both /home/asha/bin and /usr/bin. Typing `backup` runs:',
        [['/home/asha/bin/backup, because directories are searched in order', true],
          ['/usr/bin/backup, because system directories always take priority', false],
          ['Neither, since the shell refuses to choose between duplicate names', false],
          ['Whichever of the two copies was changed most recently on the disk', false]],
        'The shell walks PATH left to right and stops at the first match. That is how a personal copy can override a system one, deliberately or by accident.'),
      mcq('`API_KEY=abc123` is typed at the prompt, then `python3 app.py` finds `os.environ.get(\'API_KEY\')` is None. Why?',
        [['It is only a shell variable; without export, children do not inherit it', true],
          ['Python only reads environment variables whose names are in lowercase', false],
          ['The value was not quoted, so the shell stored an empty string instead', false],
          ['os.environ is fixed when Python is installed, not read when it starts', false]],
        'Only exported variables are copied into the environment of child processes. export API_KEY, or API_KEY=abc123 python3 app.py for a single run, fixes it.'),
      mcq('After `export PATH="$HOME/tools"`, even `ls` gives `command not found`. What happened?',
        [['PATH was replaced rather than extended, so /usr/bin is not searched', true],
          ['The tools directory contains a broken ls that hides the real one', false],
          ['export disables ls until the new directory has been fully indexed', false],
          ['HOME is not allowed inside PATH, so the variable became empty text', false]],
        'Without $PATH on the end, the new value is the only directory searched. Opening a new terminal restores the normal PATH.'),
      mcq('Why does `./run.sh` work when plain `run.sh` gives `command not found` in the same directory?',
        [['The current directory is not in PATH, so a bare name is not looked for there', true],
          ['Scripts ending in .sh must always be run with a dot to mark them executable', false],
          ['The dot tells the shell to run the file with Python instead of with bash', false],
          ['run.sh is found, but bare names are only allowed for compiled programs', false]],
        'A name containing a slash is used as a path directly. A bare name is searched for in PATH, and leaving the current directory out stops a planted file hijacking common commands.'),
    ],
    checkpoint: [
      mcq('`setup.sh` contains `export DB_HOST=localhost`. After `bash setup.sh`, `echo $DB_HOST` prints nothing. Why?',
        [['The script ran in a child shell, and a child cannot change its parent', true],
          ['export only lasts for one line, so it expired when the script ended', false],
          ['Variables set in scripts go into .bashrc and need a new terminal', false],
          ['echo cannot print variables that were exported by another program', false]],
        'bash setup.sh starts a new process whose environment disappears when it exits. source setup.sh runs the lines in your current shell instead.'),
      mcq('Activating a Python virtual environment makes `python` mean the venv interpreter mainly by:',
        [['Putting the venv\'s bin directory at the front of PATH', true],
          ['Deleting the system python until the venv is deactivated', false],
          ['Renaming the system interpreter so its name does not match', false],
          ['Replacing /usr/bin/python with a link that points to the venv', false]],
        'PATH is searched left to right, so the first python found is the venv\'s. Deactivating puts PATH back, and nothing on the system was changed.'),
      mcq('A line added to `~/.bashrc` to extend PATH has no effect in the terminal that is already open. What is the quickest correct fix?',
        [['Run source ~/.bashrc, or open a new terminal so that it is read', true],
          ['Reboot the machine, because PATH is only read once at start-up', false],
          ['Run chmod +x on ~/.bashrc so the shell is allowed to execute it', false],
          ['Log in as root, since only root may change the PATH of a shell', false]],
        '.bashrc is read when a shell starts. The open shell started before the edit, so it must re-read the file or be replaced by a new one.'),
    ],
  },
  {
    unitCode: 'T_LINUX_LOGS',
    notes: `When a service has failed, the evidence is almost always already written down. The skill is
knowing where it is, and reading it in the right order.

**Where logs live:**

- **The systemd journal.** Most distributions collect the output of every service, and the kernel's
  messages, in one place, read with \`journalctl\`.
- **Text files in /var/log.** \`syslog\` is the general log on Debian and Ubuntu (\`messages\` on
  Fedora); \`auth.log\` records logins and sudo use; \`apt/history.log\` records installs; many
  programs keep their own, such as \`/var/log/nginx/error.log\`.
- **The kernel.** \`dmesg\` or \`journalctl -k\` shows hardware errors, disk failures and the
  out-of-memory killer.

**The commands you will actually use:**

    $ systemctl status nginx                     # state, plus the last few log lines
    $ journalctl -u nginx --since "10 min ago"   # one service, recent entries
    $ journalctl -u nginx -b -p err              # this boot, errors only
    $ journalctl -f                              # follow new entries as they arrive
    $ sudo tail -n 50 /var/log/nginx/error.log

**The method:**

1. **Write down the exact symptom and the time.** "The site was down at about 14:05" narrows the
   search from millions of lines to a few hundred.
2. **Name the program responsible.** "The website is down" is not a log; nginx, or the app behind
   it, is. \`systemctl status\` shows whether it is running.
3. **Go to that program's log and narrow to the time window.**
4. **Read the first error in the window, not the last.** Later errors are often consequences.
5. **Separate the cause from its consequences**, change one thing, then read the log again.

**Worked example: nginx will not start.** \`systemctl status nginx\` says \`failed\`. The journal
shows \`bind() to 0.0.0.0:80 failed (98: Address already in use)\`. The cause is another process
already holding port 80, perhaps a leftover apache2. "Failed" said what; the log said why.

**Worked example: a training job vanished overnight.** The terminal shows \`Killed\`, and the
application's own log stops mid-epoch with no traceback. \`journalctl -k\` contains \`Out of memory:
Killed process 48211 (python3)\`. The kernel ended it, so the program never had a chance to log
anything. **A missing error in the application log is itself a clue** pointing below the program.

**When it looks as if there are no logs:**

- **Permission denied, or suspiciously empty output.** Many logs are readable only by root or the
  \`adm\` group, and \`journalctl\` shows ordinary users only their own entries. Use sudo.
- **Last week's entry is missing.** Logs are **rotated**: older lines move to \`syslog.1\`, then to
  compressed \`syslog.2.gz\`, which \`zgrep\` can search.
- **The times do not line up.** Servers usually run in UTC; 14:05 in India is 08:35 UTC.
- **The application has no log file.** It may write only to its output, which the journal captures
  under the service's name.`,
    mcqs: [
      mcq('`systemctl status postgresql` shows failed, and the journal has ten error lines from that minute. Which do you read first?',
        [['The earliest error in the window, since later ones often follow from it', true],
          ['The most recent line, because it describes the state the service ended in', false],
          ['The longest line, because detailed messages carry the real explanation', false],
          ['Any of them, as every error in one failure describes the same cause', false]],
        'One failure, such as a missing config file, typically triggers a cascade of later errors. The first one in the window is the closest to the cause.'),
      mcq('A Python job disappears. The terminal printed only `Killed`, and the application log has no traceback. Where do you look next?',
        [['The kernel log, with dmesg or journalctl -k, for an out-of-memory kill', true],
          ['The application log again, with the logging level turned up to DEBUG', false],
          ['The apt history log, in case an update removed the Python interpreter', false],
          ['The auth log, because Killed means another user logged in and ended it', false]],
        'Killed with no traceback means the process was ended from outside, most often by the kernel\'s out-of-memory killer, which records what it did in the kernel log.'),
      mcq('`journalctl -u nginx` shows `bind() to 0.0.0.0:80 failed (98: Address already in use)`. What is the cause?',
        [['Another process is already listening on port 80 on this machine', true],
          ['nginx is not permitted to use the network until it runs as root', false],
          ['The address 0.0.0.0 is invalid, so the configuration has a typo', false],
          ['Port 80 is blocked by the firewall on the router in front of it', false]],
        '"Address already in use" is the kernel refusing a second listener on the same port. A permissions problem would say Permission denied (error 13) instead.'),
      mcq('`tail /var/log/auth.log` answers `Permission denied`. What does that tell you?',
        [['The log exists but is readable only by root or the adm group', true],
          ['No authentication events have happened, so the file is empty', false],
          ['The log was rotated away and must be restored from a backup', false],
          ['Logging is switched off, and has to be enabled in the kernel', false]],
        'An empty or missing file gives a different message. Permission denied means the file is there and your user may not read it, so repeat the command with sudo.'),
    ],
    checkpoint: [
      mcq('A user in India says the site was down from 02:10 to 02:25 their time, but the server journal, in UTC, shows nothing unusual at 02:10. What do you check first?',
        [['The time zone: 02:10 in India is 20:40 UTC on the previous day', true],
          ['Whether nginx turns its logging off at night to save disk space', false],
          ['Whether journalctl keeps entries for only one hour at a time', false],
          ['Whether the user\'s browser cache was showing an old error page', false]],
        'India is UTC+5:30, so 02:10 there is 20:40 UTC the evening before. Searching the right window is step one of the method.'),
      mcq('An error from last week is not in `/var/log/syslog`, but `syslog.1` and `syslog.2.gz` exist beside it. What happened?',
        [['The log was rotated, and older entries were moved to the numbered files', true],
          ['The system crashed last week, and those files are corrupted copies', false],
          ['syslog.1 belongs to a second machine that shares the same disk space', false],
          ['The entry was deleted, because error lines are only kept for one day', false]],
        'Rotation keeps logs from filling the disk by moving older lines into numbered, and eventually compressed, files. zgrep searches the compressed ones.'),
      mcq('A service fails at start-up, and its own log file has no new lines. What is the most useful next step?',
        [['Read systemctl status and the journal for its unit, which capture its output', true],
          ['Reinstall the service, since an empty log file means the program is damaged', false],
          ['Increase the disk size, because logs are only empty when the disk is full', false],
          ['Wait for the next log rotation, when buffered entries are written to disk', false]],
        'A program that dies before opening its log file still wrote to its output, and systemd records that in the journal under the unit\'s name.'),
    ],
  },
  {
    unitCode: 'T_LINUX_PRACTICE',
    notes: `No new ideas. Every task here uses what the kernel does, users and groups, installing
software, environment variables and PATH, and logs. What makes these problems hard is not any one
command; it is deciding **which layer** a problem belongs to before touching anything.

**The method, for every problem:**

1. **Copy the exact error text.** "It doesn't work" cannot be searched; \`Permission denied\`,
   \`command not found\` and \`Address already in use\` each point somewhere different.
2. **Classify it.** Identity (who am I, which groups)? Software (is it installed, which version)?
   Environment (which file does this name resolve to, is the variable set)? Service (what does its
   log say)?
3. **Gather evidence with read-only commands before changing anything:** \`id\`, \`ls -l\`,
   \`which -a\`, \`echo $PATH\`, \`printenv NAME\`, \`systemctl status\`, \`journalctl -u\`.
4. **Make one change, then re-run exactly what failed.** Two changes at once teach you nothing.
5. **Undo what did not help**, especially sudo experiments and PATH edits.

**The checklist:**

- **Permission denied:** which user am I (\`id\`)? Who owns the file? Should I be in a group, and
  have I logged in again since joining it? Would sudo leave root-owned files in my home?
- **command not found:** is it installed? Where did it go (\`dpkg -L\`)? Is that directory in PATH?
- **The wrong version runs:** \`which -a name\` lists every match in PATH order.
- **A setting is ignored:** was it exported? Was it set in the same shell, or a parent of the
  process, that reads it? Has the shell been restarted since \`.bashrc\` changed?
- **apt refuses or cannot find a package:** has \`apt update\` run? Is another apt process, such as
  automatic updates, holding the lock?
- **A service fails:** \`systemctl status\`, then its journal from the failure time, then the
  earliest error in that window.
- **Something vanished with Killed:** the kernel log, not the application log.

**Keep a note of what you ran and what it printed.** The practice is not only fixing the problem;
it is being able to say what the evidence was and why it pointed where it did.`,
    mcqs: [
      mcq('`python3 --version` prints 3.10, but you installed 3.12 into /usr/local/bin. Which command shows why the old one runs?',
        [['`which -a python3`, listing every match in PATH order', true],
          ['`id python3`, showing which user owns the interpreter', false],
          ['`journalctl -u python3`, logging each interpreter start', false],
          ['`apt purge python3`, removing the older of the two copies', false]],
        'Seeing every python3 in PATH order shows whether another directory is searched before /usr/local/bin, or whether a venv or alias is in the way.'),
      mcq('A new teammate gets permission denied on the Docker socket for `docker ps`, but `sudo docker ps` works. If team policy allows it, the durable fix is:',
        [['Add them to the docker group, then have them log out and back in', true],
          ['Tell them to prefix every docker command with sudo from now on', false],
          ['Change their UID to 0 so that they have the same rights as root', false],
          ['Reinstall docker with apt purge, which resets socket permissions', false]],
        'The socket is writable by the docker group, and membership is read at login. Note that the docker group is effectively root-equivalent, which is why it is a policy decision.'),
      mcq('A tool works in the terminal where you set it up, but a newly opened terminal says `mytool: command not found`. What is the likely cause?',
        [['Its directory was added to PATH with export, but never put in ~/.bashrc', true],
          ['mytool was uninstalled automatically when the first terminal was closed', false],
          ['The new terminal is logged in as root, which has its own set of tools', false],
          ['PATH can hold ten directories per terminal, and the new one is full', false]],
        'An export typed at the prompt lives only in that shell. Adding the line to ~/.bashrc makes every new shell build the same PATH.'),
      mcq('`sudo apt install htop` fails with `Could not get lock /var/lib/dpkg/lock-frontend`. What is the sensible first move?',
        [['Check whether another apt process, such as automatic updates, is running', true],
          ['Delete the lock file at once, since only failed installs leave locks', false],
          ['Use su instead of sudo, because sudo is not able to take apt locks', false],
          ['Reboot to clear the lock, since apt locks are only released at start-up', false]],
        'The lock exists to stop two package operations corrupting each other. Usually unattended upgrades are running; waiting for them is safe, deleting the lock is not.'),
      mcq('A web app returns errors just after a deploy. In what order do you gather evidence?',
        [['Service status, then its journal from the deploy time, then the first error', true],
          ['Reinstall its packages, then restart it, then read logs if it still fails', false],
          ['Restart the machine, then read the newest log line, then roll back', false],
          ['Read auth.log, then the apt history, then the kernel log, in that order', false]],
        'Status and the journal for the right time window come before any change, because a restart or reinstall can destroy the very evidence you need.'),
    ],
    checkpoint: [
      mcq('`cp report.pdf /opt/shared/` fails with Permission denied. The directory belongs to group `analysts` with group write permission, and `id` does not list analysts. What is the right fix?',
        [['Add the user to analysts, then start a new login session', true],
          ['Run the copy with sudo, so the file lands there owned by root', false],
          ['Change the owner of /opt/shared to the user who needs to copy', false],
          ['Add /opt/shared to PATH, so that the directory can be written', false]],
        'The directory was designed for group access, so joining the group is the intended route. sudo would leave a root-owned file other analysts may not be able to change.'),
      mcq('A program reads `DATA_DIR` from its environment. It works from your terminal, but not when started as a systemd service. What is the most likely reason?',
        [['The service does not inherit your shell\'s environment, so DATA_DIR is unset', true],
          ['systemd services can only read environment variables written in lowercase', false],
          ['DATA_DIR is a reserved name that systemd removes from every process it runs', false],
          ['The service starts faster than your terminal, so it reads DATA_DIR too early', false]],
        'Environments are inherited from the parent. A service\'s parent is systemd, not your shell, so the variable must be set in the service\'s own configuration.'),
      mcq('Which task is the kernel responsible for, rather than an ordinary program?',
        [['Deciding which process runs on each CPU core next', true],
          ['Choosing which packages to download in apt update', false],
          ['Expanding $HOME into a path when you type a command', false],
          ['Formatting the lines that nginx writes to its log', false]],
        'Scheduling is a kernel job. apt, the shell and nginx are ordinary programs, doing their work in user space and asking the kernel only for things like files.'),
    ],
  },
  /* ── T_PROCESSES ─────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'T_PROCESSES_WHAT_IS_A_PROCESS',
    notes: `A **program** is a file. \`/usr/bin/python3\` sits on the disk doing nothing, exactly like a
PDF. A **process** is a program that is running: loaded into memory, executing, with its own state.

**What a process has that the file does not:**

- A **process ID (PID)**, a number the kernel uses to refer to it.
- Its **own memory**, holding its variables, which no other process can see.
- **Open files** and network connections.
- A **current working directory** and an **environment**.
- A **user** it runs as, which decides what it may do.
- A **state**: running, waiting for input, stopped.

**One program, many processes.** Open three terminals and run \`python3\` in each. There is one
program file and three processes, each with its own variables. A crash in one does not touch the
other two.

**Your script is not the program.** In \`python3 train.py\`, the program being run is \`python3\`;
\`train.py\` is a file it reads. When you look for your script in a process list, you look for a
\`python3\` process with \`train.py\` in its command line.

**Threads.** A process can contain several **threads**: separate paths of execution inside the same
process. Threads share the process's memory and open files, but each has its own stack and its own
position in the code. A browser can use one thread to keep the window responsive while another
decodes a video.

**The trade-off between them:**

- **Threads** share memory, so passing data between them is cheap, but two threads changing the
  same data at the same moment can corrupt it. That bug is called a **race condition**.
- **Processes** are isolated, so one cannot corrupt another, but they must communicate through
  explicit channels such as pipes, files or network sockets.

This is why Chrome runs sites in separate processes: a crashing tab does not take the browser down.

**A Python detail you will meet.** In the standard CPython build, the Global Interpreter Lock
(GIL) lets only one thread execute Python code at a time. Threads still help a program that spends
its time waiting on the network or disk; for CPU-heavy work, Python uses \`multiprocessing\`, which
starts separate processes.

**A common misconception: program and process are the same thing.** They are not, and the
difference has consequences. On Linux, deleting the program file of a running process does not
stop it: the process was already loaded and keeps running. To stop something, you act on the
process, by its PID, not on the file.`,
    mcqs: [
      mcq('Three terminals each run `python3 server.py`. How many programs and processes are involved?',
        [['Three processes, all running one program file, python3', true],
          ['One process, shared by three terminals attached to it', false],
          ['Three programs, since each copy of server.py is its own', false],
          ['One program and one process, with three threads inside', false]],
        'Each command starts a separate process with its own memory and PID. The program, the python3 file, is shared; server.py is just data each of them reads.'),
      mcq('What do two threads in the same process share that two separate processes do not?',
        [['The same memory, so both can read and change the same data', true],
          ['A single stack of function calls, taking turns to push frames', false],
          ['A guarantee that they never run at the same moment on two cores', false],
          ['The same position in the code, so they always run in lockstep', false]],
        'Shared memory is what makes threads cheap to coordinate and easy to get wrong. Each thread still has its own stack and its own position in the code.'),
      mcq('Chrome runs each site in its own process rather than as threads in one process. What does that buy?',
        [['A crash or bug in one tab cannot corrupt the memory of another', true],
          ['Tabs start faster, because processes are cheaper to make than threads', false],
          ['All tabs can share one set of variables without any extra copying', false],
          ['Pages download in parallel, which threads are unable to manage', false]],
        'Processes are isolated by the operating system. The price is more memory and more expensive communication, which Chrome accepts for stability and security.'),
      mcq('You delete `/home/asha/app/server` while that program is running. What happens to the running process?',
        [['It keeps running, because it was already loaded when it started', true],
          ['It stops at once, because its program file no longer exists', false],
          ['It crashes the next time it calls a function from the file', false],
          ['It is paused until a file with the same name is put back', false]],
        'On Linux the file\'s data stays available to the process that is using it until that process exits. Stopping a program means acting on its process, not its file.'),
    ],
    checkpoint: [
      mcq('A CPU-heavy Python calculation split across 4 threads on a 4-core machine runs no faster than with one. What is the standard CPython explanation?',
        [['The GIL lets only one thread run Python code at any one time', true],
          ['Threads always share one core, whatever the operating system does', false],
          ['Four threads need four copies of memory, which slows everything', false],
          ['Python threads only start after the main thread has finished', false]],
        'In the standard build the Global Interpreter Lock serialises Python execution, so CPU-bound threads take turns. Separate processes, via multiprocessing, can use all four cores.'),
      mcq('Which of these belongs to a process rather than to the program file it came from?',
        [['Its current working directory and its process ID', true],
          ['The machine code instructions stored in the file', false],
          ['The file name and the directory it is installed in', false],
          ['The file size and the date it was last modified', false]],
        'A PID and a working directory exist only while something is running, and two processes of the same program have different ones. The other options describe the file.'),
      mcq('Two parts of an application must not be able to corrupt each other\'s data if one misbehaves. Which design suits that?',
        [['Run them as separate processes that talk through an explicit channel', true],
          ['Run them as two threads, since threads protect each other\'s memory', false],
          ['Run them in one thread that calls each part in turn inside a loop', false],
          ['Run them from two program files loaded into one shared process', false]],
        'Only process boundaries give memory isolation. Threads, and code sharing one process, can all reach the same memory.'),
    ],
  },
  {
    unitCode: 'T_PROCESSES_LISTING',
    notes: `Before you can stop, measure or fix a process, you have to find it. \`ps\` takes a snapshot;
\`top\` and \`htop\` show a live view.

**Everything, for every user:**

    $ ps aux
    USER    PID %CPU %MEM     VSZ     RSS TTY   STAT START  TIME COMMAND
    root      1  0.0  0.1  167732   12944 ?     Ss   09:02  0:03 /sbin/init
    asha   9120 98.7  6.0 2154304 1003520 pts/1 R+   10:15 12:41 python3 train.py

- **PID**: the ID you use to act on it. **USER**: whose it is.
- **%CPU** and **%MEM**: share of the processor and of RAM. VSZ and RSS are memory figures, taught
  in the memory topic.
- **TTY**: the terminal it belongs to; \`?\` means none, which is normal for a service.
- **TIME**: total CPU time used so far, not how long it has existed.
- **COMMAND**: the full command line, which is how you tell two \`python3\` processes apart.

**The STAT column** is the process's state:

- \`R\` running, or ready and waiting for a core.
- \`S\` sleeping: waiting for something, such as input, a network reply or a timer. Most processes
  are in this state most of the time, and it is not a problem.
- \`D\` uninterruptible wait, usually on a disk or a network file system.
- \`T\` stopped, for example by Ctrl+Z.
- \`Z\` zombie: finished, but not yet collected by its parent (the next unit).

Extra letters add detail: \`+\` in the foreground of a terminal, \`s\` a session leader, \`l\`
multi-threaded.

**Finding a particular process:**

    $ pgrep -a python3          # PID and full command line of each match
    $ ps -ef                    # includes PPID, the parent's PID
    $ pstree -p                 # the family tree of processes

**The live view.** \`top\` refreshes every few seconds. Its header shows the **load average** and a
CPU line where \`us\` is user programs, \`sy\` the kernel, \`id\` idle and \`wa\` waiting for disk.
Press \`P\` to sort by CPU, \`M\` by memory, \`1\` for each core, \`q\` to quit. \`htop\` is the same
idea with colour and scrolling, usually installed with \`sudo apt install htop\`.

**Three misreadings to avoid:**

- **%CPU above 100%.** \`top\` counts per core, so 380% means nearly four cores' worth of work.
- **The %CPU in ps is a lifetime average**: CPU time divided by how long the process has existed.
  A job that idled for hours and just got busy looks quiet in \`ps\`; \`top\` shows now.
- **Load average** (three numbers: the last 1, 5 and 15 minutes) counts processes running or
  waiting to run. Compare it to the number of cores from \`nproc\`: 4.0 on 8 cores is comfortable,
  4.0 on 2 cores means work is queueing.`,
    mcqs: [
      mcq('In `top`, a process shows 380% CPU. What does that mean?',
        [['It is using nearly four cores\' worth of processor time at once', true],
          ['It has run 380 percent longer than the limit it was given', false],
          ['The figure is corrupt, since CPU use cannot exceed one hundred', false],
          ['It is using 3.8 times more CPU than when it first started', false]],
        'top reports CPU per core, so a multi-threaded program can exceed 100%. On an 8-core machine the ceiling is 800%.'),
      mcq('`ps aux` shows a process with `?` in the TTY column. What does that mean?',
        [['It is not attached to any terminal, as is normal for a service', true],
          ['Its terminal was closed, so ps cannot tell which user started it', false],
          ['The process is hidden, and only root can look at its details', false],
          ['It has crashed, and the kernel no longer knows which program it is', false]],
        'Services started by systemd at boot have no terminal. A process started from your shell shows something like pts/1.'),
      mcq('A laptop feels slow. Which command most directly answers "which process is using the CPU right now"?',
        [['`top`, then pressing P to sort by current CPU use', true],
          ['`ps`, which lists the processes of this terminal', false],
          ['`pgrep -a bash`, which lists the shells that are open', false],
          ['`pstree`, which draws the parent of every process', false]],
        'top measures the last few seconds and can sort by it. Plain ps shows only your terminal, and its CPU figure is a lifetime average anyway.'),
      mcq('The STAT column for a Python web server reads `S`. Is the server stuck?',
        [['Not necessarily; S means it is sleeping while it waits for something', true],
          ['Yes; S stands for stuck, and the process needs to be restarted now', false],
          ['No; S means it was stopped with Ctrl+Z and resumes when it is asked', false],
          ['Yes; S marks a process the kernel suspended for using too much swap', false]],
        'A server waiting for the next request is asleep, which is exactly what it should be doing. Stopped is T, and a process computing is R.'),
    ],
    checkpoint: [
      mcq('A 2-core server shows load average `6.10 5.80 5.40`. What does that suggest?',
        [['About three times more work is ready to run than the cores can serve', true],
          ['The server is using 6.1 percent of its CPU, which is a normal amount', false],
          ['Six users are logged in, with fewer connections over the last hour', false],
          ['The load is falling quickly, since the first number is the oldest one', false]],
        'Load counts runnable processes, so 6 on 2 cores means a queue. The first number is the most recent minute, so here the load is rising, not falling.'),
      mcq('A job idled for three hours and has just started working hard. `ps aux` shows it at 2% CPU while `top` shows 99%. Why the difference?',
        [['ps averages CPU over the process\'s whole life; top shows the last few seconds', true],
          ['ps counts only one core, while top adds usage together across every core', false],
          ['top includes the CPU used by top itself, which ps leaves out of its figure', false],
          ['ps reads a cached value that the kernel refreshes only every three hours', false]],
        'A few busy minutes after three idle hours is a small fraction of the process\'s lifetime, so ps reports about 2%. Use top to see current activity.'),
      mcq('Which command shows each process\'s parent ID, so you can see what started it?',
        [['`ps -ef`, whose PPID column holds the parent\'s PID', true],
          ['`ps aux`, whose TTY column names the parent process', false],
          ['`top`, whose load average counts each process\'s parents', false],
          ['`pgrep -a`, whose second column is the parent command', false]],
        'PPID is the parent process ID. Following PPIDs upward, or using pstree, shows which shell or service launched a process.'),
    ],
  },
  {
    unitCode: 'T_PROCESSES_LIFECYCLE',
    notes: `**Every process is created by another process**, its parent, whose PID is recorded as the
child's PPID. At boot the kernel starts PID 1 (on most Linux systems, \`systemd\`), and every other
process descends from it, as \`pstree\` shows.

**How a process is born: fork, then exec.** When you type \`ls\` in bash:

1. **fork.** bash asks the kernel to create a new process that is a near-copy of itself, with a
   new PID.
2. **exec.** The child asks the kernel to replace the program running inside it with
   \`/usr/bin/ls\`. The PID stays the same; the copy of bash inside that process is gone.
3. **wait.** The parent bash waits for the child to finish, collects its exit status, and prints
   the next prompt.

Why two steps? Between fork and exec, the child can prepare its own surroundings without affecting
the parent. That is exactly how \`ls > files.txt\` works: the child points its output at the file,
then becomes \`ls\`. ls never sees the \`>\` at all.

Python does the same for you: \`subprocess.run(["ls", "-l"])\` creates the child, waits, and returns
an object whose \`returncode\` holds the exit status.

**How a process ends: the exit status.** A process finishes with a number from 0 to 255. **0 means
success**; anything else means failure, with a meaning the program chooses.

    $ python3 -c "import sys; sys.exit(3)"
    $ echo $?
    3

Non-zero is not the same as crashed. \`grep\` exits with 1 when it found no matching line and 2
when something actually went wrong, such as a missing file.

**Killed by a signal.** When a signal (the next unit) ends a process, the shell reports **128 plus
the signal number**: 130 after Ctrl+C (signal 2), 143 after a plain \`kill\` (signal 15), 137 after
\`kill -9\` (signal 9). A service that "exited with 137" was killed, not buggy.

**Zombies.** When a process exits, its memory is freed at once, but the kernel keeps a tiny record
holding its exit status until the parent collects it. In between, the process is a **zombie**:
\`ps\` shows STAT \`Z\` and \`<defunct>\`. Brief zombies are normal. Zombies that pile up mean the
parent has a bug and never collects its children. **You cannot kill a zombie**, because it is
already dead; the fix is the parent, and if the parent exits, PID 1 adopts the zombies and collects
them.

**Orphans.** If a parent exits while its child is still running, the child is not killed. It is
adopted by PID 1 and carries on, which is how a long-running program can outlive the shell that
started it.

**A common misconception: any non-zero exit code means a crash.** It means "not success", and the
program's documentation says what each number means.`,
    mcqs: [
      mcq('What does the exec step change about a process?',
        [['The program inside is replaced, while its PID stays the same', true],
          ['It is given a new PID, while the program inside stays the same', false],
          ['It becomes a child of PID 1 and is detached from its parent', false],
          ['Its memory is copied so that the parent and child can share it', false]],
        'fork creates the new PID; exec swaps the program running in it. That split is what lets a shell set up a child before it becomes ls.'),
      mcq('`python3 check.py; echo $?` prints `2`. What can you conclude?',
        [['The script ended with a non-zero status, meaning it did not succeed', true],
          ['The script ran twice, and it was the second run that went wrong', false],
          ['The script was killed by signal 2, the interrupt sent by Ctrl+C', false],
          ['The script succeeded, and recorded two warnings along the way', false]],
        'A non-zero status means failure of some kind; Python itself uses 2 when, for example, the script file cannot be found. A process killed by signal 2 would show 130.'),
      mcq('`ps` shows `[worker] <defunct>` with STAT `Z`. What is it?',
        [['A finished process whose parent has not collected its exit status', true],
          ['A frozen process that uses CPU while it is waiting to be killed', false],
          ['A process that was stopped with Ctrl+Z, which is why it shows Z', false],
          ['A corrupted process that the kernel is part way through deleting', false]],
        'A zombie has already exited and holds no memory, only its exit status. Stopped processes show T, not Z.'),
      mcq('The shell reports exit status 130 for a script that was running in the foreground. What most likely ended it?',
        [['Someone pressed Ctrl+C, which sends SIGINT, signal number 2', true],
          ['The script ran out of memory after using 130 megabytes', false],
          ['The disk filled up, and 130 is the standard code for that', false],
          ['It finished normally, and 130 counts the lines it printed', false]],
        'Statuses above 128 conventionally mean death by signal: 128 + 2 = 130, and signal 2 is the interrupt from Ctrl+C.'),
    ],
    checkpoint: [
      mcq('In `ls > files.txt`, why does the redirect not change where the shell itself sends its output?',
        [['It is set up in the child after fork and before exec, so the parent is untouched', true],
          ['The shell pauses its own output for as long as any redirect is in effect', false],
          ['ls reads the > from its own arguments and then opens files.txt by itself', false],
          ['Redirection only applies to programs that are stored in the /usr/bin folder', false]],
        'The child changes its own output before becoming ls, and changes in a child never reach the parent. ls never sees the > character.'),
      mcq('A parent process has left 200 zombie children. What removes them?',
        [['The parent collecting their statuses, or the parent exiting so PID 1 does', true],
          ['Sending SIGKILL to each zombie, forcing it to release its exit status', false],
          ['Clearing the swap space with a reboot, since zombies are stored there', false],
          ['Nothing; zombies disappear on their own once their CPU time is used up', false]],
        'A zombie is already dead, so signals do nothing. Its record goes away when a parent waits for it, and PID 1 does that for orphans once the real parent exits.'),
      mcq('`grep -q FAILED results.txt` returns exit status 1 inside a script. Should the script treat that as a crash?',
        [['No; grep uses 1 to mean no line matched, which may be the good news', true],
          ['Yes; any non-zero status means the program crashed while it was running', false],
          ['Yes; status 1 means grep was killed by a signal before it could finish', false],
          ['No; 1 is the success status for grep, and 0 is the status for failure', false]],
        'Each program defines its non-zero statuses. For grep, 0 is a match, 1 is no match and 2 is a real error, so a script must check which one it got.'),
    ],
  },
  {
    unitCode: 'T_PROCESSES_SIGNALS',
    notes: `A **signal** is a small, numbered notification the kernel delivers to a process. Most signals
can be **caught**: the program runs a handler and decides what to do. Two cannot.

**The ones you will use:**

- **SIGINT (2), sent by Ctrl+C.** "Stop what you are doing." Python turns it into a
  \`KeyboardInterrupt\` exception, so \`finally\` blocks and \`with\` clean-up still run.
- **SIGTERM (15), sent by a plain \`kill PID\`.** "Please shut down." A well-written service catches
  it, finishes the current request, closes files and exits. systemd and Docker send this first.
- **SIGKILL (9), sent by \`kill -9 PID\`.** Cannot be caught, blocked or ignored. The kernel simply
  removes the process, and **no clean-up code runs**.
- **SIGTSTP (20), sent by Ctrl+Z.** Stops, which means pauses, the process. SIGCONT resumes it.
  Nothing has ended.
- **SIGHUP (1)**, sent when a terminal closes. The default action ends the process; many services
  reuse it to mean "reload your configuration".

\`kill -l\` lists them all. Despite its name, \`kill\` only sends signals, and SIGTERM is its default.

**Sending them:**

    $ kill 9120            # SIGTERM: please exit
    $ kill -INT 9120       # the same as pressing Ctrl+C in its terminal
    $ kill -9 9120         # SIGKILL: the last resort
    $ pkill -f train.py    # every process whose command line matches
    $ killall python3      # every python3 process you own; use with care

**The polite order.** Ctrl+C or \`kill\`, wait a few seconds, check whether it is still there with
\`ps -p 9120\`, and only then \`kill -9\`.

**Why not start with -9?** A process given no chance to clean up can leave a half-written output
file, temporary files, a lock file that makes the next start say "already running", an unfinished
database transaction, or child processes still running.

**A Python trap.** CPython converts SIGINT into an exception, but installs **no handler for
SIGTERM**. A plain \`kill\` therefore ends a Python script at once, without running its \`finally\`
blocks. A program that must clean up registers one with \`signal.signal(signal.SIGTERM, handler)\`.

**When even kill -9 does nothing:**

- **STAT \`D\`.** The process is inside an uninterruptible wait, often on a failing disk or a
  network file system. The signal takes effect only when that wait ends.
- **STAT \`Z\`.** It is already dead. Fix the parent, as in the previous unit.

**Permission.** You can signal only your own processes; root can signal any. Otherwise \`kill\`
answers \`Operation not permitted\`.

**A common misconception: Ctrl+Z quits.** In a Linux terminal it pauses. The job still exists,
still holds its memory, and still holds any network port it opened.`,
    mcqs: [
      mcq('What is the difference between `kill 4321` and `kill -9 4321`?',
        [['The first asks the process to exit and can be handled; the second cannot', true],
          ['The first ends the process for good; the second only pauses it for a while', false],
          ['The first ends only that process; the second also ends nine of its children', false],
          ['None; -9 only makes the kill command print more detail while it runs', false]],
        'kill sends SIGTERM, which a program can catch to shut down cleanly. -9 sends SIGKILL, which the kernel enforces with no chance to clean up.'),
      mcq('After Ctrl+Z, a development web server stops answering, but port 8000 is still in use. Why?',
        [['Ctrl+Z paused the server; it still exists and still holds the port', true],
          ['Ctrl+Z ended the server, but the kernel reserves ports for an hour', false],
          ['Ctrl+Z sent SIGKILL, which leaves the port open in a broken state', false],
          ['Ctrl+Z restarted the server, which is still loading its settings', false]],
        'Ctrl+Z sends SIGTSTP, which stops the process without ending it. fg resumes it; Ctrl+C or kill would actually end it and free the port.'),
      mcq('An ordinary user runs `kill 1` and gets `Operation not permitted`. Why?',
        [['Users may only send signals to processes that they themselves own', true],
          ['PID 1 is not a real process, so there is nothing there to signal', false],
          ['kill needs a signal name, and without one it refuses every PID', false],
          ['Signals may only be sent to processes started from this terminal', false]],
        'PID 1 belongs to root. The kernel checks the sender\'s identity before delivering a signal, which is why one user cannot stop another user\'s processes.'),
      mcq('Which signal does pressing Ctrl+C send to the program running in the foreground?',
        [['SIGINT, which a program may catch in order to clean up', true],
          ['SIGKILL, which ends the program before it can clean up', false],
          ['SIGTSTP, which pauses the program until it is resumed', false],
          ['SIGHUP, which tells the program its terminal has closed', false]],
        'Ctrl+C is an interrupt request. Python raises KeyboardInterrupt in response, so the program can still tidy up.'),
    ],
    checkpoint: [
      mcq('A Python script writes results inside `try: ... finally: out.close()` and installs no signal handlers. Which way of stopping it lets the finally block run?',
        [['Ctrl+C, because Python turns SIGINT into KeyboardInterrupt', true],
          ['kill -9, because SIGKILL gives every program time to tidy up', false],
          ['kill, because SIGTERM is always raised as a Python exception', false],
          ['Closing the terminal, because SIGHUP runs every finally block', false]],
        'Only SIGINT becomes an exception by default. SIGTERM and SIGHUP end the interpreter immediately unless a handler is installed, and SIGKILL can never be handled.'),
      mcq('A process is still listed ten seconds after `kill 5120`. What is the sensible next step?',
        [['Check what it is doing, then send SIGKILL if it truly will not exit', true],
          ['Run kill 5120 repeatedly, since each extra SIGTERM adds more force', false],
          ['Reboot, as a process that ignores SIGTERM can never be ended', false],
          ['Delete its program file, so the kernel removes the process too', false]],
        'Some programs take a few seconds to shut down cleanly; one that is truly stuck needs SIGKILL. Repeating SIGTERM adds nothing, and deleting the file does not stop a process.'),
      mcq('`kill -9` has no visible effect on a process whose STAT is `D`. Why?',
        [['It is in an uninterruptible wait, often on a disk or network mount', true],
          ['D marks a daemon, and daemons are protected from every signal', false],
          ['D means the process is already dead, so there is nothing to stop', false],
          ['SIGKILL only works on processes that were started from a terminal', false]],
        'The kill stays pending until the wait inside the kernel finishes. The real problem is usually the device or mount it is waiting on. A dead process shows Z, not D.'),
    ],
  },
  {
    unitCode: 'T_PROCESSES_BACKGROUND',
    notes: `A command you type runs in the **foreground**: it owns the keyboard, and the prompt comes back
only when it finishes. For a model training for an hour or a development server, you want your
terminal back while it runs.

**Starting a job in the background** with \`&\`:

    $ python3 train.py > train.log 2>&1 &
    [1] 9120
    $

\`[1]\` is the **job number**, which belongs to this shell, and \`9120\` is the PID. The output is
redirected (the Shell topic covers redirection) because a background job still prints to the
terminal, scribbling over whatever you type next.

**Moving a job that is already running:**

    $ python3 train.py > train.log 2>&1
    ^Z
    [1]+  Stopped                 python3 train.py > train.log 2>&1
    $ bg %1
    [1]+ python3 train.py > train.log 2>&1 &
    $ jobs
    [1]+  Running                 python3 train.py > train.log 2>&1 &
    $ fg %1

- **Ctrl+Z** stops the foreground job. It is paused, not running.
- **\`bg %1\`** resumes job 1 in the background.
- **\`fg %1\`** brings job 1 back to the foreground.
- **\`jobs\`** lists this shell's jobs; \`jobs -l\` adds their PIDs.
- **\`kill %1\`** sends SIGTERM to job 1.

**The traps:**

- **Ctrl+Z alone is not "background".** A stopped job makes no progress until \`bg\` or \`fg\`.
- **Jobs belong to one shell.** In another terminal, \`jobs\` shows nothing and \`%1\` means nothing;
  use \`ps\` and the PID there.
- **A background job that reads the keyboard is stopped** automatically, and \`jobs\` shows it as
  stopped waiting for terminal input.

**Closing the terminal ends your jobs.** When the terminal window closes, or an SSH connection
drops, the shell receives SIGHUP and passes it on to its jobs, which by default end. \`&\` does not
protect a job from that. The options, from simplest:

    $ nohup python3 train.py > train.log 2>&1 &

\`nohup\` makes the program ignore SIGHUP. If you do not redirect its output, it is saved to a file
called \`nohup.out\`. For a job that is already running, \`disown %1\` removes it from the shell's
job list so that the shell does not pass SIGHUP on.

For work on a remote server, **tmux** is usually better: the session keeps running on the server,
and you reattach to it after reconnecting, output and all. Anything that must always be running,
such as a web service, belongs under systemd rather than in anybody's terminal.

**A common misconception: \`&\` means the job will keep going after I log out.** It only gives you
the prompt back; surviving the terminal needs nohup, disown, tmux or a service.`,
    mcqs: [
      mcq('`python3 server.py &` prints `[2] 7314`. What are the two numbers?',
        [['2 is the job number in this shell, and 7314 is the PID', true],
          ['2 is the number of threads, and 7314 is its network port', false],
          ['2 is its priority level, and 7314 its memory use in KiB', false],
          ['2 is the process ID, and 7314 is how many bytes it printed', false]],
        'Job numbers are short handles for use with fg, bg and kill in this shell. The PID is the system-wide identity that works from any terminal.'),
      mcq('You press Ctrl+Z on a long download and walk away for an hour. How far has it got?',
        [['No further; a stopped job does nothing until it is resumed', true],
          ['It has finished, since Ctrl+Z moves a job to the background', false],
          ['It has carried on slowly, at a lower priority than before', false],
          ['It has restarted from the beginning, since Ctrl+Z resets it', false]],
        'Ctrl+Z pauses the job. bg would let it continue without the terminal; nothing happens until you run it.'),
      mcq('In a second terminal, `jobs` shows nothing, although a job is running in the first. Why?',
        [['Jobs are tracked per shell, so each terminal sees only its own', true],
          ['The job has finished, because jobs vanish once they are listed', false],
          ['Only root may list the jobs that were started in other terminals', false],
          ['jobs lists stopped work only, and this job is still running', false]],
        'The job table lives inside the shell that started the job. From another terminal, find the process with ps or pgrep and act on its PID.'),
      mcq('A background job keeps printing progress lines over your typing. What would have prevented it?',
        [['Redirecting its output to a log file when starting it', true],
          ['Pressing Ctrl+Z, which hides the output but keeps it running', false],
          ['Running fg, which sends the output to the job table instead', false],
          ['Running bg again, which moves its output into a buffer', false]],
        'Background jobs still write to the terminal unless told otherwise. Redirecting both output streams to a file keeps the terminal clean and keeps the output for later.'),
    ],
    checkpoint: [
      mcq('Over SSH you start `python3 train.py > log.txt 2>&1 &`, then your Wi-Fi drops. When you reconnect, training has stopped. Why?',
        [['The dropped connection sent SIGHUP to the shell\'s jobs, ending the job', true],
          ['& only lasts while you are typing, so the job moved to the foreground', false],
          ['The network drop closed the log file, so the job had to exit as well', false],
          ['Background jobs are paused whenever nobody is logged in to watch them', false]],
        'Losing the connection hangs up the terminal, the shell is sent SIGHUP, and it passes the signal on to its jobs. nohup or tmux would have kept training alive.'),
      mcq('Which command starts a job so that it survives the terminal being closed?',
        [['`nohup python3 train.py > log.txt 2>&1 &`', true],
          ['`python3 train.py > log.txt 2>&1 & fg`', false],
          ['`bg python3 train.py > log.txt 2>&1`', false],
          ['`python3 train.py > log.txt 2>&1 &&`', false]],
        'nohup makes the program ignore the hang-up signal, and & returns the prompt. The & fg version brings the job straight back to the foreground, where closing the terminal ends it.'),
      mcq('A script is running in the foreground, and you need your prompt back without restarting it. Which sequence works?',
        [['Ctrl+Z to stop it, then bg to let it continue in the background', true],
          ['Ctrl+C to stop it, then bg to bring it back as a background job', false],
          ['Ctrl+Z to stop it, then fg to let it continue in the background', false],
          ['Type & and press Enter, which moves the running job to background', false]],
        'Ctrl+Z pauses without ending, and bg resumes it away from the keyboard. Ctrl+C ends the script, and fg returns it to the foreground.'),
    ],
  },
  {
    unitCode: 'T_PROCESSES_PRACTICE',
    notes: `No new ideas. Everything here uses listing processes, how they start and end, signals, and
jobs. The scenarios are the ones you will actually meet: the machine is slow, a port is taken, a
job died, something will not stop.

**The method, for every problem:**

1. **Observe before acting.** \`top\` sorted by CPU (\`P\`) or memory (\`M\`), or
   \`ps aux --sort=-%cpu | head\`.
2. **Identify precisely.** Get the PID, then look at it properly:

        $ ps -o pid,ppid,user,stat,etime,cmd -p 9120

   \`etime\` is how long it has existed. Is it yours? What is its full command line? Who is its
   parent: your shell, or a service?
3. **Decide whether it should be stopped at all.** A database using a lot of CPU may simply be busy
   doing its job.
4. **Stop it politely, then escalate.** SIGTERM, wait a few seconds, check, and only then SIGKILL.
5. **Confirm.** Gone from \`ps\`, port free, load average falling.
6. **Explain it.** Why did it run away? Will it come back? A process that reappears with a new PID
   is being restarted by something, usually systemd, and must be stopped there with
   \`systemctl stop\`.

**The checklist:**

- Is the PID the one I think? Check the user and full command line, not just the name.
- Did I send SIGTERM and wait before reaching for \`kill -9\`?
- STAT \`D\`? Signals will not help until the disk or mount responds. STAT \`Z\`? Look at the parent.
- STAT \`T\`? It was stopped, probably by Ctrl+Z, and is doing nothing.
- An exit status above 128? Subtract 128 to get the signal: 130 Ctrl+C, 137 SIGKILL, 143 SIGTERM.
- A long job on a remote machine? Output redirected, and started with nohup or inside tmux.
- \`jobs\` shows nothing? You are in a different shell; use \`ps\` and the PID.

**Say what you saw.** For each problem, be able to state the evidence (the ps line, the status,
the exit code), the action you took, and how you confirmed it worked.`,
    mcqs: [
      mcq('`top` shows your own `python3` at 100% CPU for 40 minutes, a script you forgot in another terminal. What is the sensible order?',
        [['Note its PID, send SIGTERM, check it has gone, and only then use SIGKILL', true],
          ['Send SIGKILL at once, since a script using 100% CPU cannot handle signals', false],
          ['Reboot the laptop, the only way to stop a process in another terminal', false],
          ['Close all terminal windows, which sends SIGKILL to anything still running', false]],
        'A busy process can still receive SIGTERM, and giving it the chance to exit cleanly costs a few seconds. Escalate only if it does not go.'),
      mcq('You `kill -9` a process and it reappears seconds later with a new PID. What is most likely?',
        [['A supervisor such as systemd restarts it, so stop it through the supervisor', true],
          ['SIGKILL only pauses a process, and the kernel resumed it under a new number', false],
          ['The PID was reused by chance, and the new process is unrelated to the old', false],
          ['kill -9 copies a process before ending it, so the backup copy took over', false]],
        'A new PID means a new process was started. Checking its PPID usually shows systemd or another manager configured to restart it.'),
      mcq('`ps -o pid,stat,cmd -p 6021` shows STAT `T` for a job whose terminal is still open. What is the likely story?',
        [['It was suspended with Ctrl+Z and never resumed with fg or bg', true],
          ['It has finished, and T marks a process that has terminated', false],
          ['It used too much memory, and the kernel has throttled it', false],
          ['It is waiting on a network timeout, which T is short for', false]],
        'T means stopped. From the terminal that owns it, fg or bg resumes it; a finished process that has not been collected shows Z.'),
      mcq('A service\'s record shows it exited with status 143 last night. What ended it?',
        [['A SIGTERM, since 143 is 128 plus signal number 15', true],
          ['A SIGKILL, since 143 is the code for being killed outright', false],
          ['A bug in its code, since 143 is a Python exception code', false],
          ['A clean shutdown, since any status above 128 means success', false]],
        '128 + 15 = 143, and 15 is SIGTERM, the polite request to exit. Something, perhaps a restart or shutdown, asked it to stop; SIGKILL would give 137.'),
      mcq('Port 8000 is taken, and `ss -ltnp` shows it held by `pid=4410`. What do you check before killing that process?',
        [['Who owns it and what command it is, with ps -o user,cmd -p 4410', true],
          ['Whether PID 4410 is lower than your shell\'s PID, meaning older', false],
          ['Whether port 8000 is listed in /etc/passwd as a reserved port', false],
          ['How much swap PID 4410 uses, since only swapped processes hold ports', false]],
        'The holder might be your own forgotten server or a shared service somebody depends on. The owner and command line tell you which before you act.'),
    ],
    checkpoint: [
      mcq('A process with STAT `Z` is still listed after `kill -9`. What should you look at instead?',
        [['Its parent, which has not collected this child\'s exit status', true],
          ['The disk, since zombies are waiting for a write to complete', false],
          ['The swap space, which holds a zombie until memory is freed', false],
          ['The terminal, which must be closed before a zombie can exit', false]],
        'A zombie has already exited, so no signal can affect it. Only its parent collecting it, or the parent exiting, removes it.'),
      mcq('A colleague asks why you sent SIGTERM and waited, instead of using `kill -9` straight away. What is the best reason?',
        [['SIGTERM lets the program flush files and release locks before it exits', true],
          ['SIGTERM is faster, as the kernel delivers it before any other signal', false],
          ['kill -9 needs root, so SIGTERM is the only signal a user may send', false],
          ['kill -9 also ends the parent, which would close the terminal as well', false]],
        'SIGKILL gives the program no chance to clean up, which can leave corrupt output, stale locks or orphaned children. It is the fallback, not the first choice.'),
      mcq('A two-hour data export on a remote server must survive you disconnecting. Which is the most appropriate way to start it?',
        [['Inside tmux, or with nohup and its output redirected to a file', true],
          ['With & and the laptop kept awake so SSH never drops at all', false],
          ['In the foreground, pressing Ctrl+Z before disconnecting', false],
          ['With kill -CONT, so the kernel knows it must keep running', false]],
        'Both protect the job from the hang-up that a dropped connection causes. & alone does not, and a stopped job makes no progress at all.'),
    ],
  },
  /* ── T_OS_MEMORY ─────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'T_OS_MEMORY_MEMORY_LAYOUT',
    notes: `When a program runs, the operating system gives its process a range of memory addresses,
divided into regions that each have one job. From low addresses to high:

    high addresses
    +--------------------+
    | stack              |  one frame per active function call
    |   (grows down)     |
    |                    |
    |   (grows up)       |
    | heap               |  memory requested while the program runs
    +--------------------+
    | data and bss       |  global and static variables
    +--------------------+
    | text               |  the machine code, read-only
    +--------------------+
    low addresses

Shared libraries, such as the C library, are mapped into the large gap between heap and stack.

**The regions:**

- **Text** holds the compiled instructions. It is read-only, so a bug cannot overwrite the code.
- **Data** holds global and static variables that have an initial value; **bss** holds those
  without one, filled with zeros.
- **The stack** holds one **frame** per function call: its parameters, local variables and the
  address to return to. A call pushes a frame; returning pops it. That is fast and automatic, but
  the stack is small, typically 8 MiB for a program's main thread on Linux.
- **The heap** holds memory the program asks for explicitly while running. It can grow as large as
  the system allows, and a block lives until it is released.

**In C, you can see where everything goes:**

    int visits = 0;                                 /* data */

    int main(void) {
        int n = 1000;                               /* stack */
        int *scores = malloc(n * sizeof(int));      /* pointer on the stack, block on the heap */
        free(scores);
        return 0;
    }

**Two rules follow.**

1. **A local variable's memory disappears when its function returns.** Returning the address of a
   local produces a dangling pointer to memory that the next call will reuse.
2. **Large or long-lived data belongs on the heap.** \`double samples[5000000];\` as a local needs
   40 MB on a stack of about 8 MiB, and the program crashes as soon as it touches it.

**In Python, you never choose.** CPython allocates every object, from a small integer to a list,
on the heap. A local variable is a name in the function's frame that refers to an object. When the
function returns, the name goes away; the object survives if anything else still refers to it.
Python's \`RecursionError\`, at a default depth of 1,000, is a guard that stops runaway recursion
before the interpreter's own stack overflows.

**A common misconception: the stack and the heap are different kinds of memory.** Both are
regions of the same RAM in the same address space. The stack is fast because reserving a frame is
just moving a pointer, not because the memory itself is special.

**Why it matters.** It explains why a local cannot outlive its function, why deep recursion
crashes, and why an object you built inside a function is still there after it returns.`,
    mcqs: [
      mcq('In C, where does `count` live in `void tally(void) { int count = 0; count++; }`?',
        [['On the stack, in the frame created for this call to tally', true],
          ['On the heap, since every int is allocated there by default', false],
          ['In the data region, beside the program\'s global variables', false],
          ['In the text region, next to the machine code for tally', false]],
        'A local variable lives in its function\'s stack frame and disappears when the call returns. The data region is for globals and statics.'),
      mcq('Why is the text region of a process marked read-only?',
        [['So a stray write cannot overwrite the program\'s own instructions', true],
          ['Because machine code stays on disk and is never loaded into RAM', false],
          ['So that the heap can grow into it when the program needs space', false],
          ['Because only the compiler may write executable instructions', false]],
        'A bug that writes through a bad pointer would otherwise be able to change the code itself. Read-only text turns that into an immediate crash instead.'),
      mcq('A C function declares `double samples[5000000];` as a local variable and crashes immediately. Why?',
        [['At 40 MB, it overflows a stack that is usually limited to 8 MiB', true],
          ['Arrays of doubles must be declared as globals, never as locals', false],
          ['The heap is full, because local arrays come from the heap first', false],
          ['Five million is beyond the largest index that C arrays allow', false]],
        '5,000,000 doubles at 8 bytes each is 40,000,000 bytes, several times the stack limit. Allocating it with malloc puts it on the heap instead.'),
      mcq('In Python, `def make(): data = [0] * 1000; return data`. After `x = make()`, what has happened to the list?',
        [['It is still on the heap, because x refers to it after the return', true],
          ['It was destroyed with the frame, and x holds a copy on the stack', false],
          ['It moved from the stack to the heap while the function returned', false],
          ['It survives only until the next call reuses the stack frame', false]],
        'The list was always a heap object. The name data vanished with the frame, but x now refers to the same list, so it stays alive.'),
    ],
    checkpoint: [
      mcq('A C function returns `&total`, where `total` is one of its local ints. Why is using that address later a bug?',
        [['The frame holding total is gone, so that memory may be reused', true],
          ['Addresses of ints cannot be returned, only addresses of arrays', false],
          ['The compiler moves total to the heap, where it is freed at once', false],
          ['The address points into the text region, which is read-only', false]],
        'After the return, the stack space that held total belongs to whichever function is called next, so reading or writing through the address corrupts or misreads it.'),
      mcq('Which of these needs to live on the heap rather than the stack?',
        [['A list of records that must outlive the function that builds it', true],
          ['A loop counter used only inside one short function body', false],
          ['A function parameter holding a single integer passed by value', false],
          ['A temporary sum that is returned by value to the caller', false]],
        'Stack memory ends with its function call. Data that must still exist afterwards, or whose size is only known at run time, belongs on the heap.'),
      mcq('Python raises `RecursionError` for a recursive function with no base case. What is that limit protecting?',
        [['The interpreter\'s own stack, which would otherwise overflow and crash', true],
          ['The heap, which would run out after exactly one thousand objects', false],
          ['The text region, which grows each time a function calls itself', false],
          ['The disk, where Python writes each frame once the depth passes 100', false]],
        'Every Python call also uses stack space inside the interpreter. Stopping at a set depth gives a clean exception instead of a crash of the whole process.'),
    ],
  },
  {
    unitCode: 'T_OS_MEMORY_VIRTUAL_MEMORY',
    notes: `Two processes can each store data at the same address at the same moment, and neither sees
the other's data. That is possible because **the addresses a program uses are virtual**.

**Every process has its own virtual address space.** On every memory access, a part of the
processor called the **MMU** translates the virtual address into a physical location in RAM, using
**page tables** that the kernel keeps for each process. The program never sees physical addresses.

**Pages.** Translation works in fixed-size blocks called **pages**, usually 4 KiB (4,096 bytes).
A page table maps each virtual page to a physical **frame** of the same size.

**A translation, worked through.** With 4 KiB pages (0x1000 bytes), virtual address \`0x3004\` is
in page 3 (0x3004 divided by 0x1000), at offset 0x004. If this process's page table maps page 3 to
frame 7, the physical address is 7 x 4,096 + 4 = 28,676, which is \`0x7004\`. Another process's
page 3 may map to frame 12: same virtual address, different memory.

**What this buys:**

- **Isolation.** A process can only reach addresses in its own page table. Touching an address that
  is not mapped, or writing to a read-only page, stops it with a **segmentation fault**.
- **The same layout for every program.** Each process gets the stack, heap and text regions from the
  previous unit, whatever else is running.
- **Memory on demand.** Asking for 1 GiB reserves addresses, not RAM. A physical frame is attached
  only the first time a page is touched.
- **Sharing.** The C library's code is loaded into RAM once and mapped into hundreds of processes.
  After fork, parent and child share frames until one of them writes (copy-on-write).
- **More address space than RAM.** Pages that are not being used can be moved out to disk, which is
  the next unit.

**Page faults are normal.** When a process touches a page that has no frame yet, the processor
raises a **page fault** and the kernel quietly attaches one, then lets the process continue. That
happens constantly. A segmentation fault is different: the address is not valid for that process
at all.

**Addresses change between runs.** Linux places the stack, heap and libraries at random addresses
each time a program starts (address space layout randomisation), which makes attacks that rely on
known addresses harder.

**A common misconception: virtual memory means using the disk as RAM.** That is swap, one thing
virtual memory makes possible. The translation, and the isolation it gives, is there on every
process, even on a machine with no swap at all.

**Why it matters.** It explains what a segmentation fault actually is, why a process can report
using gigabytes it has never touched, and why starting a process with fork is cheap.`,
    mcqs: [
      mcq('Two processes both store data at virtual address 0x7f3a2000 at the same time. How is that possible?',
        [['Each has its own page table, mapping it to different physical frames', true],
          ['The kernel takes turns, swapping each one\'s data into that address', false],
          ['The second process overwrites the first, which is silently corrupted', false],
          ['Only one really uses it, and the other is shown a cached copy instead', false]],
        'The same virtual address means nothing on its own; each process\'s page table decides which physical frame it reaches, so the two never collide.'),
      mcq('With 4 KiB pages, how many pages make up 1 GiB of virtual memory?',
        [['262,144', true], ['250,000', false], ['4,096', false], ['1,048,576', false]],
        '1 GiB is 2 to the power 30 bytes and a page is 2 to the power 12, so there are 2 to the power 18, which is 262,144 pages. 250,000 comes from mixing decimal and binary units.'),
      mcq('A program asks for 2 GiB but only ever writes to the first 10 MiB of it. How much physical RAM does that allocation use?',
        [['About 10 MiB, since frames are attached only to pages that are touched', true],
          ['The full 2 GiB, since the kernel must reserve all of it immediately', false],
          ['None, since memory from an allocation stays on disk until it is freed', false],
          ['About 1 GiB, since the kernel commits half of every large request', false]],
        'Reserving address space is cheap. Physical frames are attached page by page on first use, which is why untouched memory costs no RAM.'),
      mcq('Which statement about a page fault is correct?',
        [['It is a normal event the kernel handles, such as attaching a frame on first use', true],
          ['It is a fatal error that always ends the process that caused it to happen', false],
          ['It happens only when a disk has a bad sector inside its swap partition', false],
          ['It means that two processes tried to write to the same page at once', false]],
        'Page faults happen constantly and are resolved invisibly. A fault on an address that is not valid at all is what becomes a segmentation fault.'),
    ],
    checkpoint: [
      mcq('With 4 KiB pages, virtual address 0x2010 is in page 2 at offset 0x10. If page 2 maps to frame 5, what is the physical address?',
        [['0x5010', true], ['0x2015', false], ['0x7010', false], ['0x5002', false]],
        'The frame replaces the page number and the offset is kept: 5 x 0x1000 + 0x10 = 0x5010. Adding the page and frame numbers, as in 0x7010, is the common slip.'),
      mcq('Why does a buggy process get a segmentation fault rather than reading another program\'s memory?',
        [['The address is not mapped in its own page table, so the access traps', true],
          ['The kernel encrypts other programs\' memory, so reads come back scrambled', false],
          ['Programs are loaded at addresses too high for another one to count to', false],
          ['The processor checks the program\'s user name before each memory read', false]],
        'A process can only reach frames its own page table points to. Anything else has no translation, so the processor stops the access and the kernel ends the process.'),
      mcq('What does virtual memory provide even on a machine with no swap configured at all?',
        [['A separate, isolated address space for every running process', true],
          ['Extra RAM, made by treating part of the disk as more memory', false],
          ['Faster access to files, because they are loaded as pages first', false],
          ['Nothing, since virtual memory is simply another name for swap', false]],
        'Translation through page tables, and the isolation it gives, is there for every process. Swap is an optional extra built on top of it.'),
    ],
  },
  {
    unitCode: 'T_OS_MEMORY_ALLOCATION',
    notes: `Heap memory has to be asked for and, in some languages, given back. The rules for doing that,
and what happens when they are broken, explain most memory bugs.

**In C, you do both yourself:**

    #include <stdlib.h>

    double *readings = malloc(n * sizeof(double));
    if (readings == NULL) {
        return -1;            /* the request could not be met */
    }
    readings[0] = 36.6;
    free(readings);
    readings = NULL;          /* so a later mistaken use fails loudly */

\`malloc\` returns the address of a block of at least that many bytes, or \`NULL\` if it cannot.
\`free\` hands the block back. Between the two, the block is yours.

**malloc is not the kernel.** It is part of the C library. It asks the kernel for large chunks of
address space and carves them into the small blocks your program requests. \`free\` usually returns
a block to that library for reuse, **not** to the operating system, so a process's memory often
does not shrink after freeing. Very large blocks are the exception and are handed back directly.

**The four classic mistakes:**

- **A leak:** the last pointer to a block is lost before it is freed, so it can never be freed.
- **Use after free:** reading a block after freeing it. It often seems to work, until that memory
  is reused for something else.
- **Double free:** freeing the same block twice, which corrupts the library's records and usually
  ends the program.
- **Not checking for NULL**, then writing through it.

**Leaks add up.** This handler forgets the error path:

    char *line = malloc(4096);
    if (parse(line) < 0) {
        return;               /* leaks 4,096 bytes */
    }

At 10,000 failures a day that is 40,960,000 bytes, about 39 MiB a day, or over a gibibyte in a
month of uptime. **When a process exits, the kernel reclaims all its memory**, so leaks matter for
long-running programs such as servers, not for a tool that runs for two seconds.

**In Python, you never call free.** Every object counts how many references point to it, and it is
freed the moment that count reaches zero. A separate cycle collector finds groups of objects that
refer only to each other. \`del name\` removes a name, not the object.

**So a Python leak is something still holding a reference:**

    _cache = {}

    def profile(user_id):
        if user_id not in _cache:
            _cache[user_id] = load_profile(user_id)
        return _cache[user_id]

Every distinct user adds an entry, and nothing removes one. The fix is a bounded cache, such as
\`functools.lru_cache(maxsize=1024)\`, or entries that expire. The standard \`tracemalloc\` module
takes snapshots showing which lines allocated the memory that is still alive.

**A common misconception: garbage-collected languages cannot leak.** They cannot forget to free,
but they can keep references to things nobody needs, which has the same effect.`,
    mcqs: [
      mcq('What does `malloc` return when it cannot satisfy a request?',
        [['NULL, which the caller must check before using the result', true],
          ['A valid address of a block of zero bytes that can be written', false],
          ['A smaller block than requested, sized to what was available', false],
          ['Nothing; the program is always stopped by the kernel instead', false]],
        'malloc signals failure by returning NULL. Writing through that pointer without checking crashes the program, so every allocation needs a check.'),
      mcq('A C program calls `free(p)`, then reads `p[0]` and prints the old value. Is the code correct?',
        [['No; it is a use-after-free that works only until the memory is reused', true],
          ['Yes; free only marks memory, so reading it afterwards is always safe', false],
          ['Yes; the value is kept until the pointer p itself goes out of scope', false],
          ['No; but it can only go wrong on machines that have swap configured', false]],
        'After free the block belongs to the allocator again. It still holds the old bytes by coincidence, and any later allocation may overwrite them.'),
      mcq('In Python, `a = [1, 2, 3]; b = a; del a`. What happens to the list?',
        [['It stays alive, because b still refers to it', true],
          ['It is freed at once, since del destroys objects', false],
          ['It is copied into b before a\'s copy is deleted', false],
          ['It becomes a leak that only gc.collect() can fix', false]],
        'del removed the name a. The list\'s reference count dropped from two to one, and it is freed only when b lets go too.'),
      mcq('A long-running C server leaks 2,048 bytes on each failed login. With 50,000 failed logins a day, roughly how much does it leak per day?',
        [['About 98 MiB', true], ['About 2 MiB', false], ['About 1 GiB', false], ['About 50 KiB', false]],
        '2,048 x 50,000 = 102,400,000 bytes, and dividing by 1,048,576 gives about 97.7 MiB. Small leaks in a busy path become large quickly.'),
    ],
    checkpoint: [
      mcq('A Python web service\'s memory grows steadily for days, with garbage collection switched on. What is the most likely cause?',
        [['A long-lived structure, such as a cache, keeps references to old objects', true],
          ['Python never frees objects until the process exits and the OS takes them', false],
          ['The garbage collector switches itself off in long-running services', false],
          ['Integers are never freed in Python, so every counter grows without limit', false]],
        'Python frees whatever nothing refers to. Steady growth means something is still referring to the objects: a cache, a global list, or a registry that is only ever added to.'),
      mcq('A C program frees a 100 MiB structure made of many small blocks, yet `top` shows its memory unchanged. What is most likely?',
        [['The allocator kept the freed blocks for reuse instead of returning them', true],
          ['free failed silently, so the structure is still allocated to the program', false],
          ['top only refreshes memory figures when a process makes a system call', false],
          ['The kernel moved the freed blocks to swap, where they are still counted', false]],
        'free returns small blocks to the C library, which keeps them for the next malloc. The operating system still sees that memory as the process\'s, although it is free for reuse.'),
      mcq('Why is a memory leak in a command-line tool that runs for two seconds usually harmless?',
        [['The kernel reclaims all of a process\'s memory when it exits', true],
          ['The C library frees leaked blocks once they are a second old', false],
          ['Leaks only happen in programs that run for more than an hour', false],
          ['Short programs allocate from the stack, which frees itself', false]],
        'Everything a process held is released when it ends. A leak only accumulates into a problem in a process that keeps running, such as a server.'),
    ],
  },
  {
    unitCode: 'T_OS_MEMORY_SWAPPING',
    notes: `RAM is finite. When programs need more than there is, the kernel has three options, and it
reaches for them roughly in this order.

1. **Drop page cache.** Linux fills spare RAM with recently read file data, so the next read is
   fast. Those pages are copies of what is on disk, so they can be discarded instantly and read
   again if needed.
2. **Swap out.** Heap and stack pages are not copies of any file, so they have nowhere to go except
   **swap space**: a partition or a swap file on disk. The kernel writes rarely used pages there and
   gives their frames to whoever needs them.
3. **Kill.** When RAM and swap are both exhausted, the **OOM killer** chooses a process, usually the
   one using the most memory, and sends it SIGKILL. The kernel log records it:
   \`Out of memory: Killed process 48211 (python3)\`.

**Swapping back in.** When a swapped-out page is touched again, the process waits while the kernel
reads it back from disk. The cost is what makes swapping hurt:

    RAM access           about 100 nanoseconds
    SSD read             about 100 microseconds    (about 1,000 times slower)
    Hard disk seek       about 10 milliseconds     (about 100,000 times slower)

**Thrashing.** Some swapping is harmless: pages nobody is using sit on disk and cost nothing. The
trouble starts when the memory programs are **actively** using is larger than RAM. A page swapped
out is needed again almost immediately, so the kernel spends its time moving pages in and out. The
mouse moves in jerks, commands take a minute, the disk is busy, and **the CPU is mostly idle**,
waiting for the disk. In \`top\` that shows as a high \`wa\` figure. Nothing has crashed; the machine
is busy doing nothing useful.

**Telling harmless swap from thrashing:**

    $ vmstat 1

The \`si\` and \`so\` columns show memory swapped in and out each second. Consistently non-zero means
active swapping. A large \`swpd\` figure with \`si\` and \`so\` at zero is only idle pages parked on
disk.

**Why Python often says Killed rather than MemoryError.** By default Linux lets allocations succeed
beyond what could actually be supplied, betting that not all of it will be touched. The shortfall is
discovered later, as pages are used, and the answer is the OOM killer. The script ends with
\`Killed\`, exit status 137 and no traceback.

**Containers have their own limit.** A Docker container started with a 512 MiB memory limit is
OOM-killed at 512 MiB, even when the host has gigabytes free.

**What actually fixes it.** Reduce what must be in memory at once: process a large file in chunks,
bound caches, run fewer heavy programs together, or add RAM. More swap only postpones the problem,
and makes the slow part last longer.

**A common misconception: any swap use means the machine is short of memory.** Swap in use is
history; swap activity is the problem.`,
    mcqs: [
      mcq('Why can the kernel discard page-cache memory instantly, but must write heap pages somewhere first?',
        [['Cached pages are copies of file data already on disk; heap pages are not', true],
          ['Heap pages are encrypted, so they must be decrypted before being released', false],
          ['Cached pages belong to the kernel, while heap pages belong to other users', false],
          ['The heap is on a slower memory chip, which takes longer to clear than cache', false]],
        'A cached page can always be read from its file again. A heap page holds data that exists nowhere else, so discarding it would lose it.'),
      mcq('If a RAM access takes about 100 nanoseconds and reading a page from an SSD about 100 microseconds, how many times slower is the SSD read?',
        [['About 1,000 times', true], ['About 100 times', false], ['About 10 times', false], ['About 1,000,000 times', false]],
        'A microsecond is 1,000 nanoseconds, so 100 microseconds is 100,000 nanoseconds, and 100,000 divided by 100 is 1,000.'),
      mcq('`free -h` shows 1.5 GiB of swap in use, but `vmstat 1` shows si and so at 0 for a whole minute. Is the machine thrashing?',
        [['No; idle pages sit in swap, and nothing is moving in or out right now', true],
          ['Yes; any swap in use means the machine is short of memory at this moment', false],
          ['Yes; si and so at 0 mean the swap device has failed and stopped working', false],
          ['No; swap is used only by the kernel itself and never by user programs', false]],
        'Thrashing is continuous movement of pages. Pages swapped out long ago and not needed since cost nothing, and that is what this output shows.'),
      mcq('A Python script loading a 12 GB CSV on an 8 GB laptop ends with the shell printing `Killed` and no traceback. Why no MemoryError?',
        [['The kernel\'s OOM killer sent SIGKILL, which Python cannot catch', true],
          ['Python hides MemoryError unless the script runs in debug mode', false],
          ['The csv module prints Killed instead of raising an exception', false],
          ['The laptop\'s firmware stopped the script at a fixed size limit', false]],
        'Allocations usually succeed on Linux, and the shortage appears later as pages are used. The kernel then kills the process outright, so Python has no chance to raise anything.'),
    ],
    checkpoint: [
      mcq('During thrashing, `top` shows the CPU 70% `wa` and very little user time. Why is the machine so slow if the CPU is mostly idle?',
        [['Processes are waiting for pages to come back from disk, not computing', true],
          ['The CPU is overheating, so the kernel reports idle time to cool it', false],
          ['wa is time spent on web access, which is slow on a busy network', false],
          ['The kernel is compressing files to free space, which top shows as idle', false]],
        'wa is idle time spent waiting for input and output. Every program needs pages that are on disk, so the processor has nothing it can run.'),
      mcq('A container with a 512 MiB memory limit is killed with exit status 137 while the host has 20 GiB free. Why?',
        [['The limit applies to the container, so it hit its own out-of-memory kill', true],
          ['137 means the host disk is full, so the container could not write logs', false],
          ['The host swapped the whole container out, and swapped processes exit', false],
          ['Containers are killed after using memory for a fixed length of time', false]],
        'A container\'s memory limit is enforced by the kernel just like a machine running out of RAM. 137 is 128 + 9, death by SIGKILL.'),
      mcq('Which change actually fixes thrashing caused by a job whose working memory is larger than RAM?',
        [['Reduce what must be in memory at once, for example process in chunks', true],
          ['Add more swap space, so there is room for all of the pages on disk', false],
          ['Raise the process priority, so it gets its pages back before others', false],
          ['Resume the job with kill -CONT, which clears its page tables for reuse', false]],
        'Thrashing comes from needing more pages in RAM at once than RAM holds. More swap makes it survivable but no faster; only needing less memory, or adding RAM, removes the cause.'),
    ],
  },
  {
    unitCode: 'T_OS_MEMORY_MEASURING',
    notes: `Most memory panics come from reading the wrong number. The diagnostic method is a fixed
series of questions, each answered by one command, and each with a column people misread.

**1. Is the machine short of memory?**

    $ free -h
                   total        used        free      shared  buff/cache   available
    Mem:            15Gi       4.1Gi       512Mi       310Mi        10Gi        10Gi
    Swap:          2.0Gi          0B       2.0Gi

\`free\` says 512Mi, and that is **not a problem**. \`buff/cache\` is RAM Linux is using to hold file
data, and it gives that back the moment a program needs it. The column that answers "how much can a
new program get" is \`available\`: here 10Gi. A machine is short of memory when \`available\` is small
**and** \`vmstat 1\` shows \`si\` and \`so\` moving.

**2. Which process is using it?** \`ps aux --sort=-rss | head -5\`, or \`top\` and press \`M\`.

**3. How much is that process really using?**

    $ ps -o pid,vsz,rss,cmd -p 9120
        PID     VSZ     RSS CMD
       9120 4194304 1048576 python3 train.py

Both are in KiB.

- **VSZ** (\`VIRT\` in top) is the whole virtual address space: everything mapped, including
  reserved space never touched and shared libraries. 4194304 KiB is 4 GiB, mostly unused.
- **RSS** (\`RES\` in top) is the part currently held in physical RAM: 1048576 KiB, which is 1 GiB.
  This is the number that matters for "will it fit".

**The traps in those two numbers:**

- **VSZ is not usage.** Tens of GiB of VSZ in a browser or Java process is normal and harmless.
- **RSS counts shared pages in every process that maps them**, so adding up RSS over all processes
  can exceed the RAM installed. \`smem\`, or the \`Pss\` line in \`/proc/PID/smaps_rollup\`, splits
  shared pages fairly.
- **RSS leaves out swapped pages**, so RSS can fall while a process is being swapped out.
- **RSS that does not fall after freeing is not a leak**: the allocator keeps the memory for reuse.

**4. Is it growing?** One snapshot cannot show a leak. Sample it:

    $ while true; do ps -o rss= -p 9120; sleep 60; done

Levels off under steady work: that is its working size. Climbs with every repetition of the same
work and never levels off: that is a leak.

**5. Was something killed?** \`journalctl -k\` or \`dmesg\`, looking for \`Out of memory: Killed\`.

**Symptoms and their causes:**

- **"Only 300 MB free, the laptop is nearly out."** \`available\` is 9 GiB; the rest is cache.
  Nothing to fix.
- **"Chrome is using 40 GB."** That is VSZ, reserved address space. Its RSS is what it uses.
- **"The RSS column adds up to 22 GB on a 16 GB machine."** Shared library pages are counted once
  per process.
- **"The worker was 180 MiB at 9 am and 1.4 GiB at 5 pm, under the same load."** A leak: take
  \`tracemalloc\` snapshots an hour apart and compare which lines grew.
- **"The service restarted overnight with exit status 137."** Check the kernel log for an OOM kill,
  then find what grew before it.`,
    mcqs: [
      mcq('On a 16 GiB laptop, `free -h` shows free 350Mi, buff/cache 9.2Gi and available 9.6Gi. A classmate says it is almost out of memory. What is the diagnosis?',
        [['Not short: most RAM is cache the kernel gives back, and 9.6Gi is available', true],
          ['Short: free is below 500Mi, the level at which the OOM killer starts work', false],
          ['Short: buff/cache is a kernel leak that holds on to memory permanently', false],
          ['Not short: free always looks low because swap space is counted inside it', false]],
        'available estimates what a new program could get, including cache that would be released. A low free figure on a machine that has been running a while is normal.'),
      mcq('`top` shows a browser process with VIRT 38 GiB and RES 900 MiB on a 16 GiB machine. How much RAM is it actually holding?',
        [['About 900 MiB; the 38 GiB is mostly reserved address space', true],
          ['About 38 GiB, with the part that does not fit held in swap', false],
          ['None yet; RES is memory the browser is planning to use later', false],
          ['About 39 GiB, since VIRT and RES are added to get the total', false]],
        'RES, the same as RSS, is what is in physical RAM. VIRT counts every mapping, including space reserved and never touched, so it can exceed the RAM installed.'),
      mcq('Adding the RSS column for all 60 processes on a 16 GiB machine gives 24 GiB, with no swap in use. What explains it?',
        [['Shared pages, such as libraries, are counted in each process\'s RSS', true],
          ['RSS is reported in bits, so the total must be divided by eight first', false],
          ['The kernel lends RAM out of the disk cache, which RSS counts twice', false],
          ['Some processes have died, and their RSS figures were never cleared', false]],
        'One copy of the C library in RAM appears in the RSS of every process using it. PSS divides shared pages between those processes, so its total is honest.'),
      mcq('A Python worker\'s RSS is 200 MiB after its first batch and stays near 200 MiB through the next 50 identical batches. Is it leaking?',
        [['No; memory that levels off under repeated work is not a leak', true],
          ['Yes; RSS should fall back to near zero between batches of work', false],
          ['Yes; any process that holds 200 MiB for that long is leaking', false],
          ['No; Python processes cannot leak because objects are counted', false]],
        'A leak grows with each repetition. Flat RSS is the working size, and the allocator keeping memory between batches is expected. Python can leak, just not in this pattern.'),
    ],
    checkpoint: [
      mcq('`ps -o rss= -p 7001` prints 2097152. How much physical memory is that process holding?',
        [['2 GiB', true], ['2 MiB', false], ['200 MiB', false], ['20 GiB', false]],
        'ps reports RSS in KiB. 2,097,152 KiB divided by 1,024 is 2,048 MiB, which is 2 GiB. Reading the figure as bytes gives the 2 MiB mistake.'),
      mcq('A service restarts every few nights, and its last exit status was 137. Which evidence would confirm the likely cause?',
        [['An out-of-memory kill message in the kernel log at that time', true],
          ['A high VSZ for the service in a ps snapshot taken this morning', false],
          ['A low free figure in the free -h output taken after the restart', false],
          ['An entry in auth.log showing that root signed in that night', false]],
        '137 means SIGKILL, and the OOM killer is the usual sender. Its log line names the process and time. VSZ and free figures are the two classic misreadings.'),
      mcq('Which sampling result points most clearly to a memory leak?',
        [['RSS rising by a similar amount after each identical batch, never levelling off', true],
          ['VSZ several times larger than RSS in one snapshot taken during a busy hour', false],
          ['RSS staying high after a large list is deleted, then flat for the whole run', false],
          ['free falling steadily for an hour while buff/cache rises by about the same', false]],
        'A leak is growth per repetition of the same work. Large VSZ, memory kept by the allocator, and free turning into cache are all normal.'),
    ],
  },
  {
    unitCode: 'T_OS_MEMORY_PRACTICE',
    notes: `No new ideas. Everything here uses memory layout, virtual memory, allocating and releasing,
swapping, and measuring. The practice is watching real programs use memory and explaining exactly
what you see.

**The method, for every task:**

1. **Predict first.** Before running anything, write down what should happen to memory and by how
   much: "a list of 50 million references at 8 bytes each should add roughly 380 MiB of RSS".
2. **Check the machine:** \`free -h\` for \`available\`, and \`vmstat 1\` for swap activity.
3. **Measure the process:** RSS, not VSZ, sampled more than once.
4. **Change one thing** (a smaller input, processing in chunks, a bounded cache) and measure again.
5. **Explain the difference.** When the prediction was wrong, the reason is the thing to learn.

**An experiment you can run on any Linux machine:**

    import os

    def rss_mib():
        with open(f"/proc/{os.getpid()}/status") as f:
            for line in f:
                if line.startswith("VmRSS:"):
                    return int(line.split()[1]) // 1024

    print("start", rss_mib())
    data = [0] * 50_000_000
    print("after list", rss_mib())
    del data
    print("after del", rss_mib())

The list holds 50 million references of 8 bytes each: 400,000,000 bytes, about 381 MiB. RSS should
rise by about that much, and, because a block that large is handed straight back to the operating
system, fall again after \`del\`. Repeat it with millions of small strings instead, and RSS may stay
high after \`del\`: the allocator keeps small blocks for reuse.

**The checklist:**

- Am I reading \`available\`, not \`free\`?
- Am I reading RSS, not VSZ?
- Units: \`ps\` reports KiB; \`free -h\` prints Mi and Gi.
- Have I sampled more than once before calling something a leak?
- Swap: am I looking at \`si\` and \`so\` activity, not just the amount in use?
- \`Killed\` or status 137: have I checked the kernel log?
- Python growth: what still refers to the objects?
- C: does every \`malloc\` have exactly one \`free\` on every path, including early returns?

**Write the explanation down.** A good answer names the number, the command it came from, what it
measures, and why it moved.`,
    mcqs: [
      mcq('You predict that reading a 300 MiB file into a Python bytes object raises RSS by about 300 MiB. It rises by 305 MiB. What is the reasonable conclusion?',
        [['The prediction holds; the extra few MiB is interpreter and buffer overhead', true],
          ['The file must be compressed on disk, since memory should be smaller than it', false],
          ['A 5 MiB leak has occurred, and it must be found before anything else', false],
          ['RSS cannot be trusted here, so the test must be repeated watching VSZ', false]],
        'A result within a couple of percent of the prediction confirms the model. A leak is growth that repeats with the work, which one measurement cannot show.'),
      mcq('A C function has three `return` statements and a single `free(buf)` just before the last one. What should you check?',
        [['Whether the two earlier returns leak buf, since they skip the free', true],
          ['Whether free should be called three times, once for each return', false],
          ['Whether buf is on the stack, since stack memory must also be freed', false],
          ['Whether the last return comes before free, which is not permitted', false]],
        'Early returns on error paths are the most common source of leaks. Every path out of the function after a successful malloc needs its free.'),
      mcq('A laptop is sluggish. `free -h` shows available 180Mi, and `vmstat 1` shows si and so in the thousands. What is the first useful action?',
        [['Find the largest RSS with ps or top, and close or stop that program', true],
          ['Clear the page cache by hand, since buff/cache is causing the swap', false],
          ['Add another swap file, so that si and so fall back towards zero', false],
          ['Reboot at once, because heavy swapping damages solid-state disks', false]],
        'Low available memory plus constant swap activity is thrashing. Removing the biggest consumer frees RAM immediately; the cache has already been reclaimed.'),
      mcq('A Python service keeps a module-level list and appends an item for every request, and nothing ever removes one. What will RSS sampling show?',
        [['Growth that tracks the number of requests and never levels off', true],
          ['A flat line, because the garbage collector trims lists that grow', false],
          ['A fall to near zero whenever nothing is being appended to the list', false],
          ['Growth in VSZ only, since lists are kept outside physical RAM', false]],
        'Every item is still referenced, so none can be freed. Memory grows in step with requests, which is the pattern that identifies a leak.'),
      mcq('A process\'s RSS falls sharply while `vmstat` shows `so` climbing, and the program has freed nothing. What is happening?',
        [['Its pages are being swapped out, and swapped pages are not in RSS', true],
          ['Its allocator is returning freed blocks, which vmstat reports as so', false],
          ['It is finishing normally, and so counts the pages it saved to disk', false],
          ['Its stack is shrinking as functions return, moving memory to swap', false]],
        'RSS counts only pages in physical RAM. When the kernel pushes pages to swap, RSS drops even though the program still owns every byte.'),
    ],
    checkpoint: [
      mcq('Two classmates disagree: one reads VSZ and the other RSS to judge whether a program fits on a machine with 4 GiB of RAM. Who is closer, and why?',
        [['RSS, because it counts the pages actually held in physical memory', true],
          ['VSZ, because it counts every page the program might ever touch', false],
          ['VSZ, because RSS leaves out the memory used by the heap region', false],
          ['RSS, because it includes the swap space the program has reserved', false]],
        'RSS measures RAM in use. VSZ includes reserved space that may never be touched, so it overstates, often by many times.'),
      mcq('Which experiment best tests whether a cache in your service is causing its memory growth?',
        [['Run identical load with the cache bounded, and compare RSS over time', true],
          ['Read VSZ once with the cache enabled, and compare it with total RAM', false],
          ['Add more swap, and check whether the service still slows at night', false],
          ['Restart the service hourly, and check RSS stays below 1 GiB', false]],
        'Changing one thing under the same load, and sampling RSS over time, isolates the cache\'s effect. The other options either measure the wrong number or hide the symptom.'),
      mcq('`ps` reports RSS 614400 for a process on a machine with 16 GiB of RAM. Roughly what share of RAM is it using?',
        [['About 3.7%', true], ['About 60%', false], ['About 0.4%', false], ['About 37%', false]],
        '614,400 KiB is 600 MiB, and 16 GiB is 16,384 MiB. 600 divided by 16,384 is about 0.037, or 3.7%.'),
    ],
  },
];
