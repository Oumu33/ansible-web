-- Ansible Web Management Platform Database Initialization
-- PostgreSQL Database Schema

-- 创建扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- 用户表
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(80) UNIQUE NOT NULL,
    email VARCHAR(120) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('admin', 'user', 'viewer')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    profile JSONB DEFAULT '{}',
    preferences JSONB DEFAULT '{}'
);

-- 主机组表
CREATE TABLE IF NOT EXISTS host_groups (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    variables JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 主机表
CREATE TABLE IF NOT EXISTS hosts (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    hostname VARCHAR(255) NOT NULL,
    ip_address INET NOT NULL,
    port INTEGER DEFAULT 22,
    username VARCHAR(50) DEFAULT 'root',
    password VARCHAR(255), -- 加密存储
    private_key_path VARCHAR(500),
    variables JSONB DEFAULT '{}',
    status VARCHAR(20) DEFAULT 'unknown' CHECK (status IN ('online', 'offline', 'unknown', 'error')),
    last_check TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    group_id INTEGER REFERENCES host_groups(id) ON DELETE SET NULL,
    tags JSONB DEFAULT '[]',
    facts JSONB DEFAULT '{}'
);

-- Playbook表
CREATE TABLE IF NOT EXISTS playbooks (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    content TEXT NOT NULL,
    variables JSONB DEFAULT '{}',
    tags JSONB DEFAULT '[]',
    is_template BOOLEAN DEFAULT FALSE,
    version VARCHAR(20) DEFAULT '1.0',
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    category VARCHAR(50) DEFAULT 'general',
    difficulty VARCHAR(20) DEFAULT 'beginner' CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
    rating DECIMAL(3,2) DEFAULT 0.0,
    download_count INTEGER DEFAULT 0
);

-- 任务执行记录表
CREATE TABLE IF NOT EXISTS task_executions (
    id SERIAL PRIMARY KEY,
    task_id VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'success', 'failed', 'cancelled')),
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    result JSONB,
    error_message TEXT,
    logs TEXT,
    started_at TIMESTAMP,
    finished_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    playbook_id INTEGER REFERENCES playbooks(id) ON DELETE CASCADE,
    executed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    target_hosts JSONB DEFAULT '[]',
    extra_vars JSONB DEFAULT '{}'
);

-- 审计日志表
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id VARCHAR(50),
    details JSONB DEFAULT '{}',
    ip_address INET,
    user_agent VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 系统配置表
CREATE TABLE IF NOT EXISTS system_configs (
    id SERIAL PRIMARY KEY,
    key VARCHAR(100) UNIQUE NOT NULL,
    value JSONB NOT NULL,
    description TEXT,
    category VARCHAR(50) DEFAULT 'general',
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 模板评分表
CREATE TABLE IF NOT EXISTS template_ratings (
    id SERIAL PRIMARY KEY,
    playbook_id INTEGER REFERENCES playbooks(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(playbook_id, user_id)
);

-- 收藏夹表
CREATE TABLE IF NOT EXISTS favorites (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    playbook_id INTEGER REFERENCES playbooks(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, playbook_id)
);

-- 通知表
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(20) DEFAULT 'info' CHECK (type IN ('info', 'warning', 'error', 'success')),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_hosts_ip_address ON hosts(ip_address);
CREATE INDEX IF NOT EXISTS idx_hosts_status ON hosts(status);
CREATE INDEX IF NOT EXISTS idx_hosts_group_id ON hosts(group_id);
CREATE INDEX IF NOT EXISTS idx_hosts_last_check ON hosts(last_check);

CREATE INDEX IF NOT EXISTS idx_playbooks_created_by ON playbooks(created_by);
CREATE INDEX IF NOT EXISTS idx_playbooks_is_template ON playbooks(is_template);
CREATE INDEX IF NOT EXISTS idx_playbooks_category ON playbooks(category);
CREATE INDEX IF NOT EXISTS idx_playbooks_rating ON playbooks(rating DESC);

CREATE INDEX IF NOT EXISTS idx_task_executions_task_id ON task_executions(task_id);
CREATE INDEX IF NOT EXISTS idx_task_executions_status ON task_executions(status);
CREATE INDEX IF NOT EXISTS idx_task_executions_created_at ON task_executions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_task_executions_executed_by ON task_executions(executed_by);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- 全文搜索索引
CREATE INDEX IF NOT EXISTS idx_playbooks_search ON playbooks USING gin(to_tsvector('english', name || ' ' || COALESCE(description, '')));
CREATE INDEX IF NOT EXISTS idx_hosts_search ON hosts USING gin(to_tsvector('english', name || ' ' || hostname));

-- 创建更新时间触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 创建更新时间触发器
CREATE TRIGGER update_host_groups_updated_at BEFORE UPDATE ON host_groups
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_hosts_updated_at BEFORE UPDATE ON hosts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_playbooks_updated_at BEFORE UPDATE ON playbooks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_system_configs_updated_at BEFORE UPDATE ON system_configs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 插入默认管理员用户
-- 密码: admin123 (请在生产环境中修改)
INSERT INTO users (username, email, password_hash, role) VALUES 
('admin', 'admin@ansible-web.local', 'pbkdf2:sha256:260000$8xKjGqYvF2QjKqYv$8f8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c', 'admin')
ON CONFLICT (username) DO NOTHING;

-- 插入默认主机组
INSERT INTO host_groups (name, description, variables) VALUES 
('web_servers', 'Web服务器组', '{"ansible_python_interpreter": "/usr/bin/python3"}'),
('db_servers', '数据库服务器组', '{"ansible_python_interpreter": "/usr/bin/python3"}'),
('app_servers', '应用服务器组', '{"ansible_python_interpreter": "/usr/bin/python3"}')
ON CONFLICT (name) DO NOTHING;

-- 插入系统配置
INSERT INTO system_configs (key, value, description, category, is_public) VALUES 
('system.name', '"Ansible Web Management Platform"', '系统名称', 'general', true),
('system.version', '"1.0.0"', '系统版本', 'general', true),
('system.maintenance_mode', 'false', '维护模式', 'general', false),
('ansible.default_timeout', '300', 'Ansible默认超时时间(秒)', 'ansible', false),
('ansible.max_concurrent_tasks', '10', '最大并发任务数', 'ansible', false),
('security.session_timeout', '3600', '会话超时时间(秒)', 'security', false),
('security.max_login_attempts', '5', '最大登录尝试次数', 'security', false),
('backup.auto_backup', 'true', '自动备份', 'backup', false),
('backup.retention_days', '30', '备份保留天数', 'backup', false)
ON CONFLICT (key) DO NOTHING;

-- 插入示例Playbook模板
INSERT INTO playbooks (name, description, content, is_template, category, created_by) VALUES 
('系统信息收集', '收集目标主机的系统信息', 
'---
- name: 收集系统信息
  hosts: all
  gather_facts: yes
  tasks:
    - name: 显示系统信息
      debug:
        msg: |
          主机名: {{ ansible_hostname }}
          操作系统: {{ ansible_distribution }} {{ ansible_distribution_version }}
          内核版本: {{ ansible_kernel }}
          CPU核心数: {{ ansible_processor_cores }}
          内存大小: {{ ansible_memtotal_mb }}MB
          磁盘使用情况: {{ ansible_mounts }}
', 
true, 'system', 1),

('Nginx安装配置', '在目标主机上安装和配置Nginx', 
'---
- name: 安装和配置Nginx
  hosts: web_servers
  become: yes
  tasks:
    - name: 安装Nginx
      package:
        name: nginx
        state: present
    
    - name: 启动Nginx服务
      service:
        name: nginx
        state: started
        enabled: yes
    
    - name: 配置防火墙
      firewalld:
        service: http
        permanent: yes
        state: enabled
        immediate: yes
      ignore_errors: yes
', 
true, 'web', 1),

('Docker安装', '在目标主机上安装Docker', 
'---
- name: 安装Docker
  hosts: all
  become: yes
  tasks:
    - name: 更新包管理器缓存
      package:
        update_cache: yes
    
    - name: 安装依赖包
      package:
        name:
          - apt-transport-https
          - ca-certificates
          - curl
          - gnupg
          - lsb-release
        state: present
      when: ansible_os_family == "Debian"
    
    - name: 添加Docker GPG密钥
      apt_key:
        url: https://download.docker.com/linux/ubuntu/gpg
        state: present
      when: ansible_os_family == "Debian"
    
    - name: 添加Docker仓库
      apt_repository:
        repo: "deb [arch=amd64] https://download.docker.com/linux/ubuntu {{ ansible_distribution_release }} stable"
        state: present
      when: ansible_os_family == "Debian"
    
    - name: 安装Docker
      package:
        name: docker-ce
        state: present
    
    - name: 启动Docker服务
      service:
        name: docker
        state: started
        enabled: yes
', 
true, 'container', 1)
ON CONFLICT DO NOTHING;

-- 创建视图
CREATE OR REPLACE VIEW host_summary AS
SELECT 
    hg.name as group_name,
    COUNT(h.id) as total_hosts,
    COUNT(CASE WHEN h.status = 'online' THEN 1 END) as online_hosts,
    COUNT(CASE WHEN h.status = 'offline' THEN 1 END) as offline_hosts,
    COUNT(CASE WHEN h.status = 'unknown' THEN 1 END) as unknown_hosts
FROM host_groups hg
LEFT JOIN hosts h ON hg.id = h.group_id
GROUP BY hg.id, hg.name;

CREATE OR REPLACE VIEW task_summary AS
SELECT 
    DATE(created_at) as execution_date,
    COUNT(*) as total_executions,
    COUNT(CASE WHEN status = 'success' THEN 1 END) as successful_executions,
    COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_executions,
    COUNT(CASE WHEN status = 'running' THEN 1 END) as running_executions
FROM task_executions
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY execution_date;

-- 创建函数
CREATE OR REPLACE FUNCTION get_system_stats()
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'total_hosts', (SELECT COUNT(*) FROM hosts),
        'online_hosts', (SELECT COUNT(*) FROM hosts WHERE status = 'online'),
        'total_playbooks', (SELECT COUNT(*) FROM playbooks),
        'total_executions', (SELECT COUNT(*) FROM task_executions),
        'today_executions', (SELECT COUNT(*) FROM task_executions WHERE DATE(created_at) = CURRENT_DATE),
        'active_users', (SELECT COUNT(*) FROM users WHERE is_active = true)
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 提交事务
COMMIT;