# Ansible Web 管理平台

一个现代化的 Ansible 自动化运维管理平台，提供直观的 Web 界面来管理主机、编写和执行 Playbook、监控任务状态等功能。

## 🚀 功能特性

### 核心功能
- **主机管理**: 支持主机和主机组的增删改查，实时连通性检测
- **Playbook 编辑器**: 可视化和代码模式的 Playbook 编辑器，支持语法高亮和验证
- **任务监控**: 实时任务执行状态监控，详细的执行日志和结果展示
- **模板市场**: 内置 Playbook 模板库，支持模板分享和评分
- **用户管理**: 基于角色的权限控制，支持多用户协作
- **仪表盘**: 系统概览和统计信息展示

### 技术特性
- **实时通信**: WebSocket 实现的实时状态更新和通知
- **异步任务**: Celery 任务队列处理长时间运行的 Ansible 任务
- **安全认证**: JWT 认证，支持双因子认证
- **API 接口**: RESTful API 设计，支持第三方集成
- **容器化部署**: Docker 和 Docker Compose 支持
- **高可用**: 支持负载均衡和集群部署

## 🏗️ 技术架构

### 前端技术栈
- React 18 + TypeScript
- Ant Design 5.x (UI 组件库)
- Redux Toolkit (状态管理)
- React Router 6 (路由管理)
- Recharts (图表库)
- Monaco Editor (代码编辑器)
- Socket.IO Client (WebSocket 客户端)

### 后端技术栈
- Python 3.11
- Flask 2.3 (Web 框架)
- SQLAlchemy 2.0 (ORM)
- PostgreSQL (数据库)
- Redis (缓存和消息队列)
- Celery (异步任务队列)
- Flask-SocketIO (WebSocket 服务)
- Ansible 8.x (自动化引擎)

### 基础设施
- Docker & Docker Compose
- Nginx (反向代理)
- Gunicorn (WSGI 服务器)
- Flower (Celery 监控)

## 📦 快速开始

### 环境要求
- Docker 20.10+
- Docker Compose 2.0+
- Git

### 一键部署

```bash
# 克隆项目
git clone <repository-url>
cd ansible-web

# 启动服务
docker-compose up -d

# 查看服务状态
docker-compose ps
```

### 访问应用
- 前端界面: http://localhost:3000
- API 文档: http://localhost:5000/api/docs
- Flower 监控: http://localhost:5555

### 默认账户
- 用户名: admin
- 密码: admin123

## 🛠️ 开发环境搭建

### 后端开发

```bash
cd backend

# 创建虚拟环境
python -m venv venv
source venv/bin/activate  # Linux/Mac
# 或
venv\Scripts\activate     # Windows

# 安装依赖
pip install -r requirements.txt

# 设置环境变量
cp .env.example .env
# 编辑 .env 文件配置数据库等信息

# 初始化数据库
flask db upgrade

# 启动开发服务器
flask run --debug
```

### 前端开发

```bash
cd frontend

# 安装依赖
npm install

# 启动开发服务器
npm start
```

### 数据库初始化

```bash
# 进入数据库容器
docker-compose exec postgres psql -U ansible_user -d ansible_db

# 或使用初始化脚本
docker-compose exec postgres psql -U ansible_user -d ansible_db -f /docker-entrypoint-initdb.d/init.sql
```

## 📁 项目结构

```
ansible-web/
├── backend/                 # 后端应用
│   ├── app/                # Flask 应用
│   │   ├── __init__.py     # 应用工厂
│   │   ├── api/            # API 路由
│   │   ├── auth/           # 认证模块
│   │   ├── models/         # 数据模型
│   │   ├── services/       # 业务逻辑
│   │   ├── tasks/          # Celery 任务
│   │   ├── utils/          # 工具函数
│   │   └── websocket/      # WebSocket 处理
│   ├── requirements.txt    # Python 依赖
│   ├── Dockerfile         # Docker 镜像
│   └── tests/             # 测试文件
├── frontend/               # 前端应用
│   ├── src/               # 源代码
│   │   ├── components/    # React 组件
│   │   ├── pages/         # 页面组件
│   │   ├── store/         # Redux 状态
│   │   ├── services/      # API 服务
│   │   ├── hooks/         # 自定义 Hooks
│   │   ├── types/         # TypeScript 类型
│   │   └── utils/         # 工具函数
│   ├── package.json       # Node.js 依赖
│   ├── Dockerfile        # Docker 镜像
│   └── nginx.conf        # Nginx 配置
├── database/              # 数据库相关
│   ├── init.sql          # 初始化脚本
│   ├── migrations/       # 数据库迁移
│   └── seeds/            # 种子数据
├── config/               # 配置文件
├── docker/               # Docker 相关
├── docs/                 # 文档
├── scripts/              # 脚本文件
├── docker-compose.yml    # Docker Compose 配置
└── README.md            # 项目说明
```

## 🔧 配置说明

### 环境变量

创建 `.env` 文件并配置以下变量：

```bash
# 数据库配置
DATABASE_URL=postgresql://ansible_user:ansible_pass@postgres:5432/ansible_db

# Redis 配置
REDIS_URL=redis://redis:6379/0

# JWT 配置
JWT_SECRET_KEY=your-secret-key
JWT_ACCESS_TOKEN_EXPIRES=3600

# Flask 配置
FLASK_ENV=production
SECRET_KEY=your-flask-secret-key

# Celery 配置
CELERY_BROKER_URL=redis://redis:6379/0
CELERY_RESULT_BACKEND=redis://redis:6379/0

# Ansible 配置
ANSIBLE_HOST_KEY_CHECKING=False
ANSIBLE_STDOUT_CALLBACK=json
```

### Docker Compose 配置

主要服务配置：
- **frontend**: React 应用 (端口 3000)
- **backend**: Flask API (端口 5000)
- **postgres**: PostgreSQL 数据库 (端口 5432)
- **redis**: Redis 缓存 (端口 6379)
- **celery**: Celery 工作进程
- **flower**: Celery 监控 (端口 5555)

## 📖 API 文档

### 认证接口
- `POST /api/auth/login` - 用户登录
- `POST /api/auth/register` - 用户注册
- `POST /api/auth/refresh` - 刷新令牌
- `POST /api/auth/logout` - 用户登出

### 主机管理
- `GET /api/hosts` - 获取主机列表
- `POST /api/hosts` - 创建主机
- `PUT /api/hosts/{id}` - 更新主机
- `DELETE /api/hosts/{id}` - 删除主机
- `POST /api/hosts/{id}/test` - 测试主机连接

### Playbook 管理
- `GET /api/playbooks` - 获取 Playbook 列表
- `POST /api/playbooks` - 创建 Playbook
- `PUT /api/playbooks/{id}` - 更新 Playbook
- `DELETE /api/playbooks/{id}` - 删除 Playbook
- `POST /api/playbooks/{id}/execute` - 执行 Playbook

### 任务监控
- `GET /api/tasks` - 获取任务列表
- `GET /api/tasks/{id}` - 获取任务详情
- `POST /api/tasks/{id}/cancel` - 取消任务
- `GET /api/tasks/{id}/logs` - 获取任务日志

完整的 API 文档可在 http://localhost:5000/api/docs 查看。

## 🔒 安全特性

- **身份认证**: JWT 令牌认证
- **权限控制**: 基于角色的访问控制 (RBAC)
- **双因子认证**: 支持 TOTP 双因子认证
- **API 限流**: 防止 API 滥用
- **输入验证**: 严格的输入验证和过滤
- **SQL 注入防护**: 使用 ORM 防止 SQL 注入
- **XSS 防护**: 前端输入过滤和转义
- **CSRF 防护**: CSRF 令牌验证

## 📊 监控和日志

### 应用监控
- **健康检查**: `/api/health` 端点
- **指标收集**: Prometheus 指标
- **任务监控**: Flower 界面
- **实时状态**: WebSocket 推送

### 日志管理
- **结构化日志**: 使用 structlog
- **日志级别**: DEBUG, INFO, WARNING, ERROR
- **日志轮转**: 自动日志文件轮转
- **审计日志**: 用户操作审计

## 🚀 部署指南

### 生产环境部署

1. **服务器要求**
   - CPU: 4 核心以上
   - 内存: 8GB 以上
   - 存储: 100GB 以上
   - 操作系统: Ubuntu 20.04+ / CentOS 8+

2. **安装 Docker**
   ```bash
   curl -fsSL https://get.docker.com -o get-docker.sh
   sudo sh get-docker.sh
   sudo usermod -aG docker $USER
   ```

3. **部署应用**
   ```bash
   git clone <repository-url>
   cd ansible-web
   cp .env.example .env
   # 编辑 .env 文件
   docker-compose -f docker-compose.prod.yml up -d
   ```

4. **配置反向代理**
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       
       location / {
           proxy_pass http://localhost:3000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }
       
       location /api/ {
           proxy_pass http://localhost:5000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }
   }
   ```

### 高可用部署

使用 Docker Swarm 或 Kubernetes 进行集群部署：

```bash
# Docker Swarm 示例
docker swarm init
docker stack deploy -c docker-compose.swarm.yml ansible-web
```

## 🧪 测试

### 后端测试

```bash
cd backend
pytest tests/ -v --cov=app
```

### 前端测试

```bash
cd frontend
npm test
npm run test:coverage
```

### 集成测试

```bash
# 启动测试环境
docker-compose -f docker-compose.test.yml up -d

# 运行集成测试
pytest tests/integration/ -v
```

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

### 代码规范

- **Python**: 使用 Black 和 flake8
- **TypeScript**: 使用 ESLint 和 Prettier
- **提交信息**: 遵循 Conventional Commits

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🆘 支持和帮助

- **文档**: [在线文档](docs/)
- **问题反馈**: [GitHub Issues](https://github.com/Oumu33/ansible-web/issues)
- **讨论**: [GitHub Discussions](https://github.com/Oumu33/ansible-web/discussions)
- **邮件**: support@ansible-web.com

## 🗺️ 路线图

### v1.1 (计划中)
- [ ] Playbook 可视化编辑器
- [ ] 更多 Ansible 模块支持
- [ ] 批量操作功能
- [ ] 移动端适配

### v1.2 (计划中)
- [ ] LDAP/AD 集成
- [ ] 多租户支持
- [ ] 插件系统
- [ ] 国际化支持

### v2.0 (长期)
- [ ] 微服务架构
- [ ] Kubernetes 原生支持
- [ ] AI 辅助运维
- [ ] 云原生集成

## 📈 更新日志

### v1.0.0 (2024-01-01)
- ✨ 初始版本发布
- 🎉 基础功能完成
- 📚 文档完善
- 🐳 Docker 支持

---

**Ansible Web 管理平台** - 让自动化运维更简单！