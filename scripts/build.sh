#!/bin/bash

# Ansible Web 管理平台构建脚本
# 本地构建以提高Docker构建速度

set -e

echo "🚀 开始构建 Ansible Web 管理平台..."

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 进度条函数
show_progress() {
    local current=$1
    local total=$2
    local task_name="$3"
    local width=50
    local percentage=$((current * 100 / total))
    local completed=$((current * width / total))
    local remaining=$((width - completed))
    
    printf "\r${CYAN}[%s]${NC} " "$task_name"
    printf "${GREEN}"
    for ((i=0; i<completed; i++)); do printf "█"; done
    printf "${YELLOW}"
    for ((i=0; i<remaining; i++)); do printf "░"; done
    printf "${NC} %d%% (%d/%d)" "$percentage" "$current" "$total"
    
    if [ "$current" -eq "$total" ]; then
        printf "\n"
    fi
}

# 执行带进度的任务
execute_with_progress() {
    local task_name="$1"
    local total_steps=$2
    shift 2
    local commands=("$@")
    
    echo -e "\n${PURPLE}🔄 开始执行: $task_name${NC}"
    
    for i in "${!commands[@]}"; do
        local current_step=$((i + 1))
        show_progress $current_step $total_steps "$task_name"
        
        # 对于Docker构建等长时间任务，显示实时输出
        if [[ "${commands[$i]}" == *"docker build"* ]]; then
            echo -e "\n${CYAN}正在执行: ${commands[$i]}${NC}"
            eval "${commands[$i]}"
        else
            # 执行命令
            eval "${commands[$i]}" > /dev/null 2>&1
        fi
        
        if [ $? -ne 0 ]; then
            echo -e "\n${RED}❌ 执行失败: ${commands[$i]}${NC}"
            exit 1
        fi
        
        sleep 0.5  # 短暂延迟以显示进度
    done
    
    echo -e "${GREEN}✅ $task_name 完成${NC}\n"
}

# 项目根目录
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

echo -e "${BLUE}📁 项目目录: $PROJECT_ROOT${NC}"

# 检查依赖
check_dependencies() {
    echo -e "${YELLOW}🔍 检查依赖...${NC}"
    
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}❌ Docker 未安装${NC}"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        echo -e "${RED}❌ Docker Compose 未安装${NC}"
        exit 1
    fi
    
    if ! command -v node &> /dev/null; then
        echo -e "${RED}❌ Node.js 未安装${NC}"
        exit 1
    fi
    
    if ! command -v python3 &> /dev/null; then
        echo -e "${RED}❌ Python3 未安装${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ 依赖检查完成${NC}"
}

# 构建前端
build_frontend() {
    echo -e "${YELLOW}🎨 构建前端...${NC}"
    
    cd frontend
    
    # 定义构建步骤
    local frontend_commands=(
        "[ ! -d 'node_modules' ] && npm install || echo '依赖已存在'"
        "npm run build"
    )
    
    # 使用进度条执行构建
    execute_with_progress "前端构建" ${#frontend_commands[@]} "${frontend_commands[@]}"
    
    cd ..
}

# 初始化Vault配置
init_vault_config() {
    echo -e "${YELLOW}🔐 初始化Vault配置...${NC}"
    
    # 创建Vault密码文件
    if [ ! -f "data/vault/vault_password" ]; then
        echo "🔑 生成Vault密码..."
        openssl rand -base64 32 > data/vault/vault_password
        chmod 600 data/vault/vault_password
        echo -e "${GREEN}✅ Vault密码文件已创建${NC}"
    fi
    
    # 创建示例加密文件
    if [ ! -f "data/vault/secrets.yml" ]; then
        echo "📝 创建示例加密配置..."
        cat > data/vault/secrets_example.yml << 'VAULT_EOF'
# 示例敏感配置文件
# 使用 ansible-vault encrypt 命令加密此文件
database:
  password: "your_database_password"
  
api_keys:
  aws_access_key: "your_aws_access_key"
  aws_secret_key: "your_aws_secret_key"
  
ssh_keys:
  private_key: |
    -----BEGIN OPENSSH PRIVATE KEY-----
    your_private_key_content_here
    -----END OPENSSH PRIVATE KEY-----
VAULT_EOF
        echo -e "${GREEN}✅ 示例Vault配置已创建${NC}"
    fi
    
    echo -e "${GREEN}✅ Vault配置初始化完成${NC}"
}

# 准备后端依赖
prepare_backend() {
    echo -e "${YELLOW}🐍 准备后端依赖...${NC}"
    
    cd backend
    
    # 定义后端准备步骤
    local backend_commands=(
        "[ ! -d 'venv' ] && python3 -m venv venv || echo '虚拟环境已存在'"
        "source venv/bin/activate && pip install --upgrade pip"
        "source venv/bin/activate && pip install -r requirements.txt"
        "source venv/bin/activate && pip freeze > requirements.lock && deactivate"
    )
    
    # 使用进度条执行后端准备
    execute_with_progress "后端依赖准备" ${#backend_commands[@]} "${backend_commands[@]}"
    
    cd ..
}

# 优化Dockerfile
optimize_dockerfiles() {
    echo -e "${YELLOW}🐳 优化Dockerfile...${NC}"
    
    # 创建优化的前端Dockerfile
    cat > frontend/Dockerfile.optimized << 'EOF'
# 多阶段构建 - 前端
FROM node:18-alpine as builder

WORKDIR /app

# 复制package文件
COPY package*.json ./

# 安装依赖
RUN npm ci --only=production

# 复制源代码
COPY . .

# 构建应用
RUN npm run build

# 生产阶段
FROM nginx:alpine

# 复制构建结果
COPY --from=builder /app/build /usr/share/nginx/html

# 复制nginx配置
COPY nginx.conf /etc/nginx/nginx.conf

# 暴露端口
EXPOSE 80

# 启动nginx
CMD ["nginx", "-g", "daemon off;"]
EOF

    # 创建优化的后端Dockerfile
    cat > backend/Dockerfile.optimized << 'EOF'
# 使用Python官方镜像
FROM python:3.11-slim

# 设置环境变量
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app \
    FLASK_APP=app \
    FLASK_ENV=production

# 设置工作目录
WORKDIR /app

# 安装系统依赖
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    libpq-dev \
    libffi-dev \
    libssl-dev \
    openssh-client \
    sshpass \
    curl \
    git \
    rsync \
    sudo \
    vim \
    && rm -rf /var/lib/apt/lists/*

# 安装Ansible
RUN pip install --no-cache-dir ansible ansible-vault

# 复制锁定的依赖文件
COPY requirements.lock ./requirements.txt

# 安装Python依赖
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# 复制应用代码
COPY . .

# 创建非root用户
RUN useradd --create-home --shell /bin/bash app && \
    chown -R app:app /app
USER app

# 暴露端口
EXPOSE 5000

# 健康检查
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:5000/health || exit 1

# 启动应用
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "4", "--timeout", "120", "app:create_app()"]
EOF

    echo -e "${GREEN}✅ Dockerfile优化完成${NC}"
}

# 创建优化的docker-compose文件
create_optimized_compose() {
    echo -e "${YELLOW}📝 创建优化的docker-compose配置...${NC}"
    
    cat > docker-compose.prod.yml << 'EOF'
version: '3.8'

services:
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.optimized
    ports:
      - "3000:80"
    depends_on:
      - backend
    networks:
      - ansible-web
    restart: unless-stopped

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile.optimized
    ports:
      - "5000:5000"
    environment:
      - DATABASE_URL=postgresql://ansible:ansible123@postgres:5432/ansible_web
      - REDIS_URL=redis://redis:6379/0
      - SECRET_KEY=your-secret-key-change-in-production
      - JWT_SECRET_KEY=your-jwt-secret-key-change-in-production
      - ANSIBLE_VAULT_PASSWORD_FILE=/app/vault/vault_password
      - ANSIBLE_HOST_KEY_CHECKING=False
      - ANSIBLE_STDOUT_CALLBACK=json
      - PYTHONPATH=/app
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    volumes:
      - ./data/playbooks:/app/playbooks
      - ./data/inventory:/app/inventory
      - ./data/logs:/app/logs
      - ./data/vault:/app/vault
      - ./data/backups:/app/backups
      - ~/.ssh:/app/.ssh:ro
    networks:
      - ansible-web
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  celery-worker:
    build:
      context: ./backend
      dockerfile: Dockerfile.optimized
    command: celery -A app.celery worker --loglevel=info --concurrency=4
    environment:
      - DATABASE_URL=postgresql://ansible:ansible123@postgres:5432/ansible_web
      - REDIS_URL=redis://redis:6379/0
      - SECRET_KEY=your-secret-key-change-in-production
      - ANSIBLE_VAULT_PASSWORD_FILE=/app/vault/vault_password
      - ANSIBLE_HOST_KEY_CHECKING=False
      - ANSIBLE_STDOUT_CALLBACK=json
      - PYTHONPATH=/app
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    volumes:
      - ./data/playbooks:/app/playbooks
      - ./data/inventory:/app/inventory
      - ./data/logs:/app/logs
      - ./data/vault:/app/vault
      - ./data/backups:/app/backups
      - ~/.ssh:/app/.ssh:ro
    networks:
      - ansible-web
    restart: unless-stopped

  celery-beat:
    build:
      context: ./backend
      dockerfile: Dockerfile.optimized
    command: celery -A app.celery beat --loglevel=info
    environment:
      - DATABASE_URL=postgresql://ansible:ansible123@postgres:5432/ansible_web
      - REDIS_URL=redis://redis:6379/0
      - SECRET_KEY=your-secret-key-change-in-production
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    volumes:
      - ./data/logs:/app/logs
    networks:
      - ansible-web
    restart: unless-stopped

  postgres:
    image: postgres:14-alpine
    environment:
      - POSTGRES_DB=ansible_web
      - POSTGRES_USER=ansible
      - POSTGRES_PASSWORD=ansible123
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./database/init.sql:/docker-entrypoint-initdb.d/init.sql
    networks:
      - ansible-web
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ansible -d ansible_web"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    networks:
      - ansible-web
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
  redis_data:

networks:
  ansible-web:
    driver: bridge
EOF

    echo -e "${GREEN}✅ 优化的docker-compose配置创建完成${NC}"
}

# 创建数据目录
create_data_directories() {
    echo -e "${YELLOW}📁 创建数据目录...${NC}"
    
    # 定义目录创建步骤
    local directory_commands=(
        "mkdir -p data/{playbooks,inventory,logs,vault,backups}"
        "chmod 755 data && chmod 700 data/vault && chmod 755 data/backups"
        "mkdir -p data/playbooks/{templates,custom}"
        "mkdir -p data/inventory/{static,dynamic}"
        "mkdir -p data/logs/{ansible,application,audit}"
    )
    
    # 使用进度条执行目录创建
    execute_with_progress "数据目录创建" ${#directory_commands[@]} "${directory_commands[@]}"
}

# 构建Docker镜像
build_images() {
    echo -e "${YELLOW}🐳 构建Docker镜像...${NC}"
    
    # 定义镜像构建步骤
    local image_commands=(
        "docker build -f frontend/Dockerfile.optimized -t ansible-web-frontend:latest frontend/"
        "docker build -f backend/Dockerfile.optimized -t ansible-web-backend:latest backend/"
    )
    
    # 使用进度条执行镜像构建
    execute_with_progress "Docker镜像构建" ${#image_commands[@]} "${image_commands[@]}"
}

# 启动服务
start_services() {
    echo -e "${YELLOW}🚀 启动服务...${NC}"
    
    # 定义服务启动步骤
    local service_commands=(
        "docker-compose -f docker-compose.prod.yml down 2>/dev/null || true"
        "docker-compose -f docker-compose.prod.yml up -d"
        "sleep 10"
        "docker-compose -f docker-compose.prod.yml ps"
    )
    
    # 使用进度条执行服务启动
    execute_with_progress "服务启动" ${#service_commands[@]} "${service_commands[@]}"
    
    echo -e "${BLUE}📊 服务状态:${NC}"
    docker-compose -f docker-compose.prod.yml ps
}

# 显示访问信息
show_access_info() {
    echo -e "${GREEN}🎉 构建完成！${NC}"
    echo -e "${BLUE}📱 访问信息:${NC}"
    echo -e "  前端界面: ${YELLOW}http://localhost:3000${NC}"
    echo -e "  后端API:  ${YELLOW}http://localhost:5000${NC}"
    echo -e "  API文档:  ${YELLOW}http://localhost:5000/docs${NC}"
    echo ""
    echo -e "${BLUE}🔧 管理命令:${NC}"
    echo -e "  查看日志: ${YELLOW}docker-compose -f docker-compose.prod.yml logs -f${NC}"
    echo -e "  停止服务: ${YELLOW}docker-compose -f docker-compose.prod.yml down${NC}"
    echo -e "  重启服务: ${YELLOW}docker-compose -f docker-compose.prod.yml restart${NC}"
}

# 主函数
main() {
    echo -e "${BLUE}🚀 Ansible Web 管理平台 - 优化构建脚本${NC}"
    echo -e "${BLUE}================================================${NC}"
    
    # 定义构建步骤
    local build_steps=(
        "check_dependencies"
        "prepare_backend"
        "build_frontend"
        "optimize_dockerfiles"
        "create_optimized_compose"
        "create_data_directories"
        "init_vault_config"
        "build_images"
        "start_services"
    )
    
    local step_names=(
        "依赖检查"
        "后端准备"
        "前端构建"
        "Dockerfile优化"
        "Compose配置"
        "目录创建"
        "Vault配置"
        "镜像构建"
        "服务启动"
    )
    
    local total_steps=${#build_steps[@]}
    
    echo -e "\n${PURPLE}📋 构建计划: 共 $total_steps 个步骤${NC}\n"
    
    # 执行构建步骤
    for i in "${!build_steps[@]}"; do
        local current_step=$((i + 1))
        local step_function="${build_steps[$i]}"
        local step_name="${step_names[$i]}"
        
        echo -e "${CYAN}[$current_step/$total_steps] 🔄 执行: $step_name${NC}"
        show_progress $current_step $total_steps "总体进度"
        
        # 执行步骤函数
        $step_function
        
        if [ $? -ne 0 ]; then
            echo -e "\n${RED}❌ 步骤失败: $step_name${NC}"
            exit 1
        fi
        
        echo -e "${GREEN}✅ [$current_step/$total_steps] $step_name 完成${NC}\n"
    done
    
    # 显示最终进度
    show_progress $total_steps $total_steps "总体进度"
    
    show_access_info
    
    echo -e "\n${GREEN}🎊 构建流程完成！${NC}"
}

# 执行主函数
main "$@"