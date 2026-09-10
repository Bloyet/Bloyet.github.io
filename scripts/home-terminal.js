/* 首页静态 Linux 终端 — 虚拟文件系统 + 常见命令
 * 数据全部静态，flag 藏在根目录隐藏文件 .flag 中（ls -a 可见）*/
(function () {
  var body = document.getElementById('home-terminal-body')
  var input = document.getElementById('home-terminal-input')
  if (!body || !input) return

  // ─── 虚拟文件系统 ───────────────────────────────────────────
  // type: dir / file；link 存在表示是可跳转的站点页面
  var FS = {
    'index.html': { type: 'file', link: '/', name: '首页' },
    'archives/': { type: 'dir', link: '/archives/', name: '归档' },
    'category/': { type: 'dir', link: '/category/', name: '分类' },
    'links/': { type: 'dir', link: '/links/', name: '友链' },
    'post/': {
      type: 'dir',
      children: {
        'about.md': { type: 'file', link: '/post/about/', content: '做那个人的战士，和他一起去经历，失败！' }
      }
    },
    'README.md': {
      type: 'file',
      content: '欢迎来到 bloyet 的博客。\n这个终端是静态的，但你可以随便玩。\n提示：根目录下也许藏着些什么。'
    },
    '.flag': { type: 'file', hidden: true, content: 'flag{y0u_f0und_th3_h1dd3n_fl4g}' }
  }

  var HOME = '~'
  var cwd = '/' // '/' | '/post/'
  var history = []
  var env = {
    USER: 'guest', HOME: HOME, HOSTNAME: 'bloyet', SHELL: '/bin/fakebash',
    TERM: 'xterm-256color', PATH: '/usr/local/bin:/usr/bin:/bin', LANG: 'zh_CN.UTF-8'
  }

  function entries() { return cwd === '/post/' ? FS['post/'].children : FS }
  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  }
  function prompt() { return 'guest@bloyet:' + (cwd === '/' ? '/' : cwd) + '$' }
  function print(html) {
    var div = document.createElement('div')
    div.className = 'home-terminal__line-output'
    div.innerHTML = html
    body.appendChild(div)
  }
  function expand(s) {
    return s.replace(/\$(\w+)/g, function (_, k) { return env[k] !== undefined ? env[k] : '' })
  }
  function resolve(arg) { // 返回 entries() 中的键名（含目录斜杠处理），找不到返回 null
    if (!arg) return null
    var name = arg.replace(/\/+$/, '')
    if (name === '') name = '/' // "post/" → 根下的 post 目录
    if (entries()[name] || entries()[name + '/']) return entries()[name] ? name : name + '/'
    if (name === '.') return '.'
    return null
  }

  var CMDS = {
    ls: function (args) {
      var all = args.indexOf('-a') >= 0 || args.indexOf('-la') >= 0 || args.indexOf('-al') >= 0
      var list = []
      var e = entries()
      Object.keys(e).forEach(function (k) {
        if (!all && e[k].hidden) return
        var isDir = e[k].type === 'dir'
        list.push(isDir
          ? '<span class="t-dir">' + esc(k) + '</span>'
          : (e[k].link ? '<a href="' + e[k].link + '" class="home-terminal__link">' + esc(k) + '</a>' : esc(k)))
      })
      if (cwd === '/') list.unshift('<span class="t-dir">.</span>', '<span class="t-dir">..</span>')
      print(list.join('  '))
    },
    cd: function (args) {
      var arg = args[0]
      if (!arg || arg === '~' || arg === '/') { cwd = '/'; return }
      if (arg === '..') { cwd = '/'; return }
      var key = resolve(arg)
      if (key === '.') return
      if (key === null) { print('cd: ' + esc(arg) + ': 没有那个文件或目录'); return }
      var node = entries()[key]
      if (node.type !== 'dir') { print('cd: ' + esc(arg) + ': 不是目录'); return }
      if (node.link) { print('正在打开「' + node.name + '」…'); window.location.href = node.link; return }
      cwd = '/post/'
    },
    pwd: function () { print(cwd) },
    cat: function (args) {
      var key = resolve(args[0])
      if (!args[0]) { print('cat: 缺少文件参数'); return }
      var node = key && entries()[key]
      if (!node) { print('cat: ' + esc(args[0]) + ': 没有那个文件或目录'); return }
      print(esc(node.content || '（二进制或空文件）'))
    },
    echo: function (args) { print(esc(expand(args.join(' ')))) },
    touch: function (args) {
      if (!args[0]) { print('touch: 缺少文件参数'); return }
      entries()[args[0]] = { type: 'file', content: '' }
    },
    mkdir: function (args) {
      if (!args[0]) { print('mkdir: 缺少目录参数'); return }
      entries()[args[0].replace(/\/+$/, '') + '/'] = { type: 'dir' }
    },
    rm: function (args) {
      var t = args.filter(function (a) { return a.indexOf('-') !== 0 })[0]
      if (!t) { print('rm: 缺少操作对象'); return }
      if (t === '/' || t === '*') { print('rm: 拒绝摆烂：不允许删除整个站点 :)'); return }
      var key = resolve(t)
      if (!key) { print('rm: ' + esc(t) + ': 没有那个文件或目录'); return }
      delete entries()[key]
    },
    cp: function (args) {
      if (args.length < 2) { print('cp: 缺少参数（用法: cp 源 目标）'); return }
      var src = resolve(args[0])
      if (!src) { print('cp: 无法统计 ' + esc(args[0])); return }
      entries()[args[1]] = JSON.parse(JSON.stringify(entries()[src]))
    },
    mv: function (args) {
      if (args.length < 2) { print('mv: 缺少参数（用法: mv 源 目标）'); return }
      var src = resolve(args[0])
      if (!src) { print('mv: 无法统计 ' + esc(args[0])); return }
      entries()[args[1]] = entries()[src]
      delete entries()[src]
    },
    rmdir: function (args) { CMDS.rm(args) },
    tree: function () {
      print('<span class="t-dir">.</span>')
      Object.keys(entries()).forEach(function (k) {
        var n = entries()[k]
        print('├── ' + (n.type === 'dir' ? '<span class="t-dir">' + esc(k) + '</span>' : esc(k)))
      })
    },
    wc: function (args) {
      var key = resolve(args[0])
      var node = key && entries()[key]
      if (!node) { print('wc: ' + esc(args[0] || '') + ': 没有那个文件或目录'); return }
      var c = (node.content || '').split('\n')
      print(' ' + c.length + '  ' + (node.content || '').length + '  ' + esc(args[0]))
    },
    head: function (args) {
      var t = args.filter(function (a) { return a.indexOf('-') !== 0 })[0]
      var n = parseInt((args.join(' ').match(/-(\d+)/) || [])[1], 10) || 10
      var key = resolve(t)
      var node = key && entries()[key]
      if (!node) { print('head: 无法打开 ' + esc(t || '')); return }
      print(esc((node.content || '').split('\n').slice(0, n).join('\n')))
    },
    tail: function (args) {
      var t = args.filter(function (a) { return a.indexOf('-') !== 0 })[0]
      var n = parseInt((args.join(' ').match(/-(\d+)/) || [])[1], 10) || 10
      var key = resolve(t)
      var node = key && entries()[key]
      if (!node) { print('tail: 无法打开 ' + esc(t || '')); return }
      print(esc((node.content || '').split('\n').slice(-n).join('\n')))
    },
    grep: function (args) {
      var pat = args[0], t = args[1]
      var key = t && resolve(t)
      var node = key && entries()[key]
      if (!pat || !node) { print('用法: grep 关键字 文件'); return }
      var hit = (node.content || '').split('\n').filter(function (l) { return l.indexOf(pat) >= 0 })
      print(hit.length ? esc(hit.join('\n')) : '(无匹配)')
    },
    find: function () { print('.\n./README.md\n./index.html\n./post\n./post/about.md') },
    file: function (args) {
      var key = resolve(args[0])
      if (!key) { print(args[0] + ': cannot open'); return }
      print(esc(args[0]) + ': ' + (entries()[key].content ? 'ASCII text' : 'directory/symbolic link'))
    },
    stat: function (args) {
      var key = resolve(args[0])
      if (!key) { print('stat: 无法stat ' + esc(args[0] || '')); return }
      print('  文件: ' + esc(key) + '\n  大小: ' + ((entries()[key].content || '').length) + '\t类型: ' + entries()[key].type)
    },
    du: function () { print('4.0K\t.') },
    clear: function () { body.innerHTML = '' },
    whoami: function () { print('guest') },
    id: function () { print('uid=1000(guest) gid=1000(guest) groups=1000(guest),27(sudo denied)') },
    groups: function () { print('guest sudo_denied') },
    uname: function (args) {
      print(args.indexOf('-a') >= 0
        ? 'GrideaOS bloyet 1.0.0-blog #1 SMP PREEMPT_DYNAMIC x86_64 GNU/Blog'
        : 'GrideaOS')
    },
    hostname: function () { print('bloyet') },
    date: function () { print(new Date().toString()) },
    uptime: function () { print(' ' + new Date().toTimeString().slice(0, 5) + ' up 42 days, load average: 0.05, 0.03, 0.01') },
    ps: function () {
      print('  PID TTY          TIME CMD\n 1137 tty1     00:00:01 fakebash\n 1138 tty1     00:00:00 ps')
    },
    top: function () { print('静态博客，负载恒为 0.00 :) 试试 ps') },
    df: function () { print('文件系统        容量  已用  可用 已用% 挂载点\n/dev/blog        64G   13G   51G   21% /\ntmpfs           7.8G   76M  7.7G    1% /dev/shm') },
    free: function () { print('              total        used        free\nMem:        16315560     2768412    12511048\nSwap:        2097148           0     2097148') },
    env: function () {
      Object.keys(env).forEach(function (k) { print(k + '=' + env[k]) })
    },
    printenv: function () { CMDS.env() },
    history: function () {
      history.forEach(function (h, i) { print('  ' + (i + 1) + '  ' + esc(h)) })
    },
    which: function (args) {
      if (!args[0]) { print('which: 缺少参数'); return }
      print(CMDS[args[0]] ? '/usr/bin/' + esc(args[0]) : '')
    },
    man: function (args) {
      print(args[0] ? esc(args[0]) + '(1) — 这个终端是静态实现的，手册就不写了。\n神秘的东西往往藏在 ls -a 里。' : '你想要什么手册？')
    },
    alias: function () { print("alias ll='ls -a'\nalias blog='cd index.html'") },
    ifconfig: function () { print('eth0: flags=4163<UP,BROADCAST,RUNNING>\n        inet 192.168.233.233  netmask 255.255.255.0') },
    ip: function () { CMDS.ifconfig() },
    ping: function (args) {
      var host = args.filter(function (a) { return a.indexOf('-') !== 0 })[0] || ''
      print('PING ' + esc(host) + ' 56(84) bytes of data.')
      for (var i = 1; i <= 4; i++) print('64 bytes from ' + esc(host) + ': icmp_seq=' + i + ' ttl=64 time=' + (1 + Math.random() * 4).toFixed(1) + ' ms')
      print('\n--- ' + esc(host) + ' ping statistics ---\n4 packets transmitted, 4 received, 0% packet loss')
    },
    curl: function (args) {
      var u = args.filter(function (a) { return a.indexOf('-') !== 0 })[0] || ''
      var hit = Object.keys(FS).filter(function (k) { return FS[k].link && u.indexOf(k.replace('/', '')) >= 0 })
      if (hit.length) { print('HTTP/2 200\n\n(页面内容请自己点开 → ' + u + ')') }
      else print('curl: (6) 无法解析主机 ' + esc(u))
    },
    wget: function (args) { CMDS.curl(args) },
    sudo: function () { print('guest 不在 sudoers 文件中。此事件将被报告。') },
    su: function () { print('su: 认证失败（这里是静态博客，没有 root）') },
    ssh: function () { print('ssh: connect to host port 22: 这是静态终端，连不出去的') },
    vim: function () { print('这个终端没有安装 vim。它只是个装饰 :)') },
    nano: function () { CMDS.vim() },
    emacs: function () { print('emacs 未安装（也不会装）') },
    neofetch: function () {
      print('      .--.        <b>guest@bloyet</b>')
      print('     |o_o |       ------------------')
      print('     |:_/ |       OS: GrideaOS 1.0.0-blog x86_64')
      print('    //   \\ \\      Host: bloyet\'s blog')
      print('   (|     | )     Shell: fakebash 0.2')
      print('  /\'\\_   _/`\\     DE: notes-theme')
      print('  \\___)=(___/     站点: 归档 / 分类 / 友链')
    },
    exit: function () { print('logout（才不会真的让你走）') },
    logout: function () { CMDS.exit() },
    help: function () {
      print('ls cd pwd cat echo touch mkdir rm cp mv rmdir tree wc head tail grep find file stat du')
      print('clear whoami id groups uname hostname date uptime ps top df free env history which man alias')
      print('ifconfig ip ping curl wget sudo su ssh vim nano emacs neofetch exit logout')
    }
  }

  function run(raw) {
    var line = raw.trim()
    if (!line) return
    history.push(line)
    print('<span class="home-terminal__prompt">' + prompt() + '</span> ' + esc(line))
    var parts = line.split(/\s+/)
    var name = parts[0].toLowerCase()
    var args = parts.slice(1)
    if (name === 'll') { name = 'ls'; args = ['-a'] }
    if (CMDS[name]) { CMDS[name](args) }
    else { print(esc(name) + ': 未找到命令') }
    var pe = document.getElementById('home-terminal-prompt')
    if (pe) pe.textContent = prompt()
    body.scrollTop = body.scrollHeight
  }

  // 启动 banner（无任何提示语）
  print('GrideaOS 1.0.0-blog tty1')
  print('Last login: ' + new Date().toDateString() + ' from 127.0.0.1')

  // ─── 输入交互：Enter / ↑↓ 历史 / Tab 补全 / Ctrl+U 清行 / Ctrl+L 清屏 ───
  var histIdx = -1 // -1 表示不在历史浏览状态

  function complete() {
    var val = input.value
    var parts = val.split(/\s+/)
    if (parts.length <= 1) {
      // 补全命令名
      var hits = Object.keys(CMDS).filter(function (c) { return c.indexOf(parts[0]) === 0 })
      if (hits.length === 1) input.value = hits[0] + ' '
      else if (hits.length > 1) { print(esc(hits.join('  '))) }
      return
    }
    // 补全 cd/cat 的路径参数
    var cmd = parts[0], frag = parts[parts.length - 1]
    var names = Object.keys(entries()).filter(function (k) {
      var n = frag.indexOf('/') === 0 ? k : k
      return n.indexOf(frag) === 0 && (cmd !== 'cd' || entries()[k].type === 'dir')
    })
    if (names.length === 1) {
      parts[parts.length - 1] = names[0]
      input.value = parts.join(' ')
    } else if (names.length > 1) {
      print(esc(names.join('  ')))
    }
  }

  document.getElementById('home-terminal').addEventListener('click', function () { input.focus() })
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      run(input.value)
      input.value = ''
      histIdx = -1
    } else if (e.key === 'ArrowUp') {
      if (!history.length) return
      histIdx = histIdx === -1 ? history.length - 1 : Math.max(0, histIdx - 1)
      input.value = history[histIdx]
      e.preventDefault()
    } else if (e.key === 'ArrowDown') {
      if (histIdx === -1) return
      histIdx++
      if (histIdx >= history.length) { histIdx = -1; input.value = '' }
      else input.value = history[histIdx]
      e.preventDefault()
    } else if (e.key === 'Tab') {
      e.preventDefault()
      complete()
    } else if (e.key === 'u' && e.ctrlKey) {
      input.value = ''
      e.preventDefault()
    } else if (e.key === 'l' && e.ctrlKey) {
      body.innerHTML = ''
      e.preventDefault()
    }
  })
})()
