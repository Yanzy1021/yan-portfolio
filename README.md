# Yan's Portfolio v2.0.0

个人主页网站 + 管理后台

---

## 快速使用

### 启动服务

**Windows 用户：** 双击 `start.bat` 即可启动。

或者手动启动：
```bash
node server.js
```

启动后打开浏览器访问：
- 主站：http://localhost:3000
- 后台：http://localhost:3000/admin.html

### 关闭服务

在命令行窗口按 `Ctrl + C` 即可关闭。数据会自动保存在 `data/` 文件夹里，不会丢失。

---

## 管理后台

### 登录信息

| 项目 | 值 |
|------|-----|
| 访问地址 | http://localhost:3000/admin.html |
| 默认账号 | `admin` |
| 默认密码 | `admin123` |

> **首次登录后请立即修改密码！**

### 后台功能

1. **作品集管理** - 新增、编辑、删除你的作品
2. **文章/笔记管理** - 管理你的文章和笔记
3. **联系方式管理** - 修改微信号、邮箱、二维码等
4. **修改密码** - 更改管理员密码

### 隐藏管理入口（主站上）

在主站页面：
- 方式一：点击左上角 **YAN** logo 连续 5 次
- 方式二：访问 http://localhost:3000/?admin=1

普通访客无法发现这些入口。

---

## 数据存储

所有数据存储在 `data/` 文件夹中：

```
data/
├── works.json     ← 作品集数据
├── articles.json  ← 文章/笔记数据
├── contact.json   ← 联系方式数据
└── admin.json     ← 管理员账号（密码已加密）
```

### 备份

复制整个 `data/` 文件夹即可备份所有数据。

### 忘记密码

编辑 `data/admin.json`，找到密码哈希值，替换为新的哈希：

```bash
node -e "const bcrypt=require('bcryptjs'); console.log(bcrypt.hashSync('新密码', 10))"
```

将输出的哈希值粘贴到 `admin.json` 的 `password` 字段。

---

## 端口修改

默认端口 3000。如果被占用，可以修改：

1. 打开 `server.js`
2. 找到 `const PORT = process.env.PORT || 3000;`
3. 把 3000 改成你想要的端口

或者通过环境变量指定：
```bash
PORT=8080 node server.js
```

---

## 文件结构

```
Workbuddy/
├── index.html       ← 主站页面（v2.0.0）
├── admin.html       ← 管理后台页面
├── server.js        ← Node.js 后端服务
├── package.json     ← 依赖配置
├── start.bat        ← Windows 一键启动脚本
├── .gitignore       ← Git 忽略规则
├── data/            ← 数据存储
│   ├── works.json
│   ├── articles.json
│   ├── contact.json
│   └── admin.json
├── uploads/         ← 上传文件存储
├── backups/         ← 版本备份
└── avatar.png       ← 头像
```

---

## 版本历史

| 版本 | 说明 |
|------|------|
| v1.0.0 | 初始版本 - 纯静态个人主页 |
| v2.0.0 | 新增管理后台 - 支持动态管理作品、文章、联系方式 |
