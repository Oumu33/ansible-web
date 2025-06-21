import os
import yaml
import json
import tempfile
import shutil
from typing import Dict, List, Any, Optional
from datetime import datetime

import ansible_runner
from ansible.inventory.manager import InventoryManager
from ansible.vars.manager import VariableManager
from ansible.parsing.dataloader import DataLoader
from ansible.executor.playbook_executor import PlaybookExecutor
from ansible.utils.display import Display

from app.models import Host, HostGroup, Playbook, TaskExecution
from app import db


class AnsibleService:
    """Ansible服务类，封装Ansible相关操作"""
    
    def __init__(self):
        self.base_dir = '/app/ansible_data'
        self.inventory_dir = os.path.join(self.base_dir, 'inventory')
        self.playbook_dir = os.path.join(self.base_dir, 'playbooks')
        self.log_dir = os.path.join(self.base_dir, 'logs')
        
        # 确保目录存在
        for directory in [self.base_dir, self.inventory_dir, self.playbook_dir, self.log_dir]:
            os.makedirs(directory, exist_ok=True)
    
    def generate_inventory(self, host_ids: Optional[List[int]] = None) -> str:
        """生成Ansible清单文件"""
        inventory_data = {
            '_meta': {
                'hostvars': {}
            }
        }
        
        # 查询主机
        query = Host.query
        if host_ids:
            query = query.filter(Host.id.in_(host_ids))
        
        hosts = query.all()
        
        # 按组分类主机
        groups = {}
        for host in hosts:
            group_name = host.group.name if host.group else 'ungrouped'
            
            if group_name not in groups:
                groups[group_name] = {
                    'hosts': [],
                    'vars': host.group.variables if host.group else {}
                }
            
            # 添加主机到组
            host_entry = {
                'ansible_host': host.ip_address,
                'ansible_port': host.port,
                'ansible_user': host.username,
            }
            
            # 添加认证信息
            if host.password:
                host_entry['ansible_password'] = host.password
            elif host.private_key_path:
                host_entry['ansible_private_key_file'] = host.private_key_path
            
            # 添加主机变量
            if host.variables:
                host_entry.update(host.variables)
            
            groups[group_name]['hosts'].append(host.hostname)
            inventory_data['_meta']['hostvars'][host.hostname] = host_entry
        
        # 添加组到清单
        for group_name, group_data in groups.items():
            inventory_data[group_name] = {
                'hosts': group_data['hosts'],
                'vars': group_data['vars']
            }
        
        # 写入清单文件
        inventory_file = os.path.join(self.inventory_dir, 'hosts.json')
        with open(inventory_file, 'w') as f:
            json.dump(inventory_data, f, indent=2)
        
        return inventory_file
    
    def validate_playbook(self, content: str) -> Dict[str, Any]:
        """验证Playbook语法"""
        try:
            # 解析YAML
            playbook_data = yaml.safe_load(content)
            
            if not isinstance(playbook_data, list):
                return {
                    'valid': False,
                    'errors': ['Playbook must be a list of plays']
                }
            
            errors = []
            warnings = []
            
            for i, play in enumerate(playbook_data):
                if not isinstance(play, dict):
                    errors.append(f'Play {i+1}: Must be a dictionary')
                    continue
                
                # 检查必需字段
                if 'hosts' not in play:
                    errors.append(f'Play {i+1}: Missing required field "hosts"')
                
                if 'tasks' not in play and 'roles' not in play:
                    warnings.append(f'Play {i+1}: No tasks or roles defined')
                
                # 检查任务格式
                if 'tasks' in play:
                    tasks = play['tasks']
                    if not isinstance(tasks, list):
                        errors.append(f'Play {i+1}: Tasks must be a list')
                    else:
                        for j, task in enumerate(tasks):
                            if not isinstance(task, dict):
                                errors.append(f'Play {i+1}, Task {j+1}: Must be a dictionary')
            
            return {
                'valid': len(errors) == 0,
                'errors': errors,
                'warnings': warnings
            }
            
        except yaml.YAMLError as e:
            return {
                'valid': False,
                'errors': [f'YAML syntax error: {str(e)}']
            }
        except Exception as e:
            return {
                'valid': False,
                'errors': [f'Validation error: {str(e)}']
            }
    
    def execute_playbook(self, playbook_id: int, host_ids: Optional[List[int]] = None, 
                        extra_vars: Optional[Dict] = None) -> str:
        """执行Playbook"""
        playbook = Playbook.query.get(playbook_id)
        if not playbook:
            raise ValueError(f'Playbook {playbook_id} not found')
        
        # 生成清单文件
        inventory_file = self.generate_inventory(host_ids)
        
        # 创建临时Playbook文件
        playbook_file = os.path.join(self.playbook_dir, f'playbook_{playbook_id}_{datetime.now().strftime("%Y%m%d_%H%M%S")}.yml')
        with open(playbook_file, 'w') as f:
            f.write(playbook.content)
        
        # 准备执行参数
        runner_args = {
            'playbook': playbook_file,
            'inventory': inventory_file,
            'project_dir': self.base_dir,
            'artifact_dir': self.log_dir,
            'quiet': False,
            'verbosity': 2,
        }
        
        if extra_vars:
            runner_args['extravars'] = extra_vars
        
        # 执行Playbook
        try:
            runner = ansible_runner.run(**runner_args)
            
            # 返回执行结果
            return {
                'status': runner.status,
                'rc': runner.rc,
                'stdout': runner.stdout.read() if runner.stdout else '',
                'stderr': runner.stderr.read() if runner.stderr else '',
                'artifacts_dir': runner.artifact_dir,
                'stats': runner.stats,
                'events': list(runner.events)
            }
            
        except Exception as e:
            return {
                'status': 'failed',
                'rc': 1,
                'error': str(e),
                'stdout': '',
                'stderr': str(e)
            }
        finally:
            # 清理临时文件
            if os.path.exists(playbook_file):
                os.remove(playbook_file)
    
    def execute_ad_hoc(self, host_ids: List[int], module: str, args: str = '', 
                      extra_vars: Optional[Dict] = None) -> Dict[str, Any]:
        """执行Ad-hoc命令"""
        # 生成清单文件
        inventory_file = self.generate_inventory(host_ids)
        
        # 准备执行参数
        runner_args = {
            'module': module,
            'module_args': args,
            'inventory': inventory_file,
            'project_dir': self.base_dir,
            'artifact_dir': self.log_dir,
            'quiet': False,
            'verbosity': 1,
        }
        
        if extra_vars:
            runner_args['extravars'] = extra_vars
        
        try:
            runner = ansible_runner.run(**runner_args)
            
            return {
                'status': runner.status,
                'rc': runner.rc,
                'stdout': runner.stdout.read() if runner.stdout else '',
                'stderr': runner.stderr.read() if runner.stderr else '',
                'stats': runner.stats,
                'events': list(runner.events)
            }
            
        except Exception as e:
            return {
                'status': 'failed',
                'rc': 1,
                'error': str(e),
                'stdout': '',
                'stderr': str(e)
            }
    
    def check_host_connectivity(self, host_id: int) -> Dict[str, Any]:
        """检查主机连接性"""
        host = Host.query.get(host_id)
        if not host:
            raise ValueError(f'Host {host_id} not found')
        
        # 使用ping模块检查连接
        result = self.execute_ad_hoc([host_id], 'ping')
        
        # 更新主机状态
        if result['status'] == 'successful' and result['rc'] == 0:
            host.status = 'online'
        else:
            host.status = 'offline'
        
        host.last_check = datetime.utcnow()
        db.session.commit()
        
        return result
    
    def get_ansible_facts(self, host_id: int) -> Dict[str, Any]:
        """获取主机facts信息"""
        result = self.execute_ad_hoc([host_id], 'setup')
        
        if result['status'] == 'successful':
            # 解析facts信息
            for event in result.get('events', []):
                if event.get('event') == 'runner_on_ok':
                    event_data = event.get('event_data', {})
                    res = event_data.get('res', {})
                    if 'ansible_facts' in res:
                        return res['ansible_facts']
        
        return {}
    
    def list_modules(self) -> List[Dict[str, str]]:
        """获取可用的Ansible模块列表"""
        # 这里可以实现模块发现逻辑
        # 暂时返回常用模块列表
        common_modules = [
            {'name': 'ping', 'description': 'Try to connect to host, verify a usable python and return pong on success'},
            {'name': 'setup', 'description': 'Gathers facts about remote hosts'},
            {'name': 'command', 'description': 'Execute commands on targets'},
            {'name': 'shell', 'description': 'Execute shell commands on targets'},
            {'name': 'copy', 'description': 'Copy files to remote locations'},
            {'name': 'file', 'description': 'Manage files and file properties'},
            {'name': 'template', 'description': 'Template a file out to a remote server'},
            {'name': 'service', 'description': 'Manage services'},
            {'name': 'package', 'description': 'Generic OS package manager'},
            {'name': 'user', 'description': 'Manage user accounts'},
            {'name': 'group', 'description': 'Add or remove groups'},
            {'name': 'cron', 'description': 'Manage cron.d and crontab entries'},
            {'name': 'git', 'description': 'Deploy software (or files) from git checkouts'},
            {'name': 'docker_container', 'description': 'manage docker containers'},
            {'name': 'mysql_user', 'description': 'Adds or removes a user from a MySQL database'},
        ]
        
        return common_modules
    
    def cleanup_old_artifacts(self, days: int = 7):
        """清理旧的执行日志和临时文件"""
        import time
        
        cutoff_time = time.time() - (days * 24 * 60 * 60)
        
        for root, dirs, files in os.walk(self.log_dir):
            for file in files:
                file_path = os.path.join(root, file)
                if os.path.getmtime(file_path) < cutoff_time:
                    try:
                        os.remove(file_path)
                    except OSError:
                        pass
        
        # 清理空目录
        for root, dirs, files in os.walk(self.log_dir, topdown=False):
            for dir_name in dirs:
                dir_path = os.path.join(root, dir_name)
                try:
                    if not os.listdir(dir_path):
                        os.rmdir(dir_path)
                except OSError:
                    pass


# 创建全局实例
ansible_service = AnsibleService()