#!/bin/bash

# Ansible Web 管理平台快速启动脚本
# 适用于已经构建过的环境

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 项目根目录
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_ROOT"

echo -e "${BLUE}🚀 Ansible Web 管理平台 - 快速启动${NC}"
echo -e "${BLUE}========================================${NC}"

# 检查是否已构建
if [ ! -f "docker-compose.prod.yml" ]; then
    echo -e "${RED}❌ 未找到生产配置文件，请先运行构建脚本${NC}"
    echo -e "${YELLOW}💡 运行: ./scripts/build.sh${NC}"
    exit 1
fi

# 停止现有服务
echo -e "${YELLOW}🛑 停止现有服务...${NC}"
docker-compose -f docker-compose.prod.yml down 2>/dev/null || true

# 启动服务
echo -e "${YELLOW}🚀 启动服务...${NC}"
docker-compose -f docker-compose.prod.yml up -d

# 等待服务就绪
echo -e "${YELLOW}⏳ 等待服务就绪...${NC}"
sleep 15

# 检查服务状态
echo -e "${BLUE}📊 服务状态:${NC}"
docker-compose -f docker-compose.prod.yml ps

# 显示访问信息
echo -e "${GREEN}🎉 启动完成！${NC}"
echo -e "${BLUE}📱 访问信息:${NC}"
echo -e "  前端界面: ${YELLOW}http://localhost:3000${NC}"
echo -e "  后端API:  ${YELLOW}http://localhost:5000${NC}"
echo -e "  API文档:  ${YELLOW}http://localhost:5000/docs${NC}"
echo ""
echo -e "${BLUE}🔧 管理命令:${NC}"
echo -e "  查看日志: ${YELLOW}docker-compose -f docker-compose.prod.yml logs -f${NC}"
echo -e "  停止服务: ${YELLOW}docker-compose -f docker-compose.prod.yml down${NC}"
echo -e "  重启服务: ${YELLOW}docker-compose -f docker-compose.prod.yml restart${NC}"
echo ""
echo -e "${BLUE}🔐 Vault管理:${NC}"
echo -e "  查看密码: ${YELLOW}cat data/vault/vault_password${NC}"
echo -e "  加密文件: ${YELLOW}ansible-vault encrypt --vault-password-file data/vault/vault_password <file>${NC}"
echo -e "  解密文件: ${YELLOW}ansible-vault decrypt --vault-password-file data/vault/vault_password <file>${NC}"