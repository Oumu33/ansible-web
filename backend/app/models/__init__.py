from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
import json

from app import db


class User(db.Model):
    """用户模型"""
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), default='user')  # admin, user, viewer
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_login = db.Column(db.DateTime)
    
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)
    
    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'role': self.role,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'last_login': self.last_login.isoformat() if self.last_login else None
        }


class HostGroup(db.Model):
    """主机组模型"""
    __tablename__ = 'host_groups'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)
    description = db.Column(db.Text)
    variables = db.Column(db.JSON)  # 组变量
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 关联主机
    hosts = db.relationship('Host', backref='group', lazy=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'variables': self.variables or {},
            'host_count': len(self.hosts),
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }


class Host(db.Model):
    """主机模型"""
    __tablename__ = 'hosts'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    hostname = db.Column(db.String(255), nullable=False)
    ip_address = db.Column(db.String(45), nullable=False)  # 支持IPv6
    port = db.Column(db.Integer, default=22)
    username = db.Column(db.String(50), default='root')
    password = db.Column(db.String(255))  # 加密存储
    private_key_path = db.Column(db.String(500))
    variables = db.Column(db.JSON)  # 主机变量
    status = db.Column(db.String(20), default='unknown')  # online, offline, unknown
    last_check = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 外键
    group_id = db.Column(db.Integer, db.ForeignKey('host_groups.id'))
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'hostname': self.hostname,
            'ip_address': self.ip_address,
            'port': self.port,
            'username': self.username,
            'variables': self.variables or {},
            'status': self.status,
            'group_id': self.group_id,
            'group_name': self.group.name if self.group else None,
            'last_check': self.last_check.isoformat() if self.last_check else None,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }


class Playbook(db.Model):
    """Playbook模型"""
    __tablename__ = 'playbooks'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    content = db.Column(db.Text, nullable=False)  # YAML内容
    variables = db.Column(db.JSON)  # 变量定义
    tags = db.Column(db.JSON)  # 标签
    is_template = db.Column(db.Boolean, default=False)
    version = db.Column(db.String(20), default='1.0')
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 关联
    creator = db.relationship('User', backref='playbooks')
    executions = db.relationship('TaskExecution', backref='playbook', lazy=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'content': self.content,
            'variables': self.variables or {},
            'tags': self.tags or [],
            'is_template': self.is_template,
            'version': self.version,
            'created_by': self.created_by,
            'creator_name': self.creator.username if self.creator else None,
            'execution_count': len(self.executions),
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }


class TaskExecution(db.Model):
    """任务执行记录模型"""
    __tablename__ = 'task_executions'
    
    id = db.Column(db.Integer, primary_key=True)
    task_id = db.Column(db.String(100), unique=True, nullable=False)  # Celery任务ID
    name = db.Column(db.String(200), nullable=False)
    status = db.Column(db.String(20), default='pending')  # pending, running, success, failed, cancelled
    progress = db.Column(db.Integer, default=0)  # 0-100
    result = db.Column(db.JSON)  # 执行结果
    error_message = db.Column(db.Text)
    logs = db.Column(db.Text)  # 执行日志
    started_at = db.Column(db.DateTime)
    finished_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # 外键
    playbook_id = db.Column(db.Integer, db.ForeignKey('playbooks.id'))
    executed_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    
    # 关联
    executor = db.relationship('User', backref='executions')
    
    def to_dict(self):
        return {
            'id': self.id,
            'task_id': self.task_id,
            'name': self.name,
            'status': self.status,
            'progress': self.progress,
            'result': self.result,
            'error_message': self.error_message,
            'logs': self.logs,
            'playbook_id': self.playbook_id,
            'playbook_name': self.playbook.name if self.playbook else None,
            'executed_by': self.executed_by,
            'executor_name': self.executor.username if self.executor else None,
            'started_at': self.started_at.isoformat() if self.started_at else None,
            'finished_at': self.finished_at.isoformat() if self.finished_at else None,
            'created_at': self.created_at.isoformat(),
            'duration': self._calculate_duration()
        }
    
    def _calculate_duration(self):
        if self.started_at and self.finished_at:
            delta = self.finished_at - self.started_at
            return int(delta.total_seconds())
        return None


class AuditLog(db.Model):
    """审计日志模型"""
    __tablename__ = 'audit_logs'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    action = db.Column(db.String(100), nullable=False)
    resource_type = db.Column(db.String(50), nullable=False)
    resource_id = db.Column(db.String(50))
    details = db.Column(db.JSON)
    ip_address = db.Column(db.String(45))
    user_agent = db.Column(db.String(500))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # 关联
    user = db.relationship('User', backref='audit_logs')
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'username': self.user.username if self.user else 'System',
            'action': self.action,
            'resource_type': self.resource_type,
            'resource_id': self.resource_id,
            'details': self.details,
            'ip_address': self.ip_address,
            'user_agent': self.user_agent,
            'created_at': self.created_at.isoformat()
        }