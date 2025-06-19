# Ansible Web Project

这是一个用于配置和管理 Web 服务器的 Ansible 项目。

## 目录结构

- `roles/`: Ansible 角色
  - `common/`: 所有服务器通用配置
  - `webserver/`: Web 服务器特定配置
  - `dbserver/`: 数据库服务器特定配置
- `inventories/`: 环境特定的 inventory 文件
  - `production/`: 生产环境
  - `staging/`: 测试环境
- `site.yml`: 主 playbook

## 使用方法

运行 playbook:

```bash
ansible-playbook -i inventories/production/hosts site.yml
```

仅运行 Web 服务器配置:

```bash
ansible-playbook -i inventories/production/hosts site.yml --limit webservers
```
