from celery import current_task
from datetime import datetime
import json
import traceback

from app import celery, db
from app.models import TaskExecution, Host, Playbook
from app.services.ansible_service import ansible_service
from app.websocket.events import emit_task_update


@celery.task(bind=True)
def execute_playbook_task(self, playbook_id, host_ids=None, extra_vars=None, user_id=None):
    """异步执行Playbook任务"""
    task_id = self.request.id
    
    try:
        # 获取Playbook信息
        playbook = Playbook.query.get(playbook_id)
        if not playbook:
            raise ValueError(f'Playbook {playbook_id} not found')
        
        # 创建任务执行记录
        execution = TaskExecution(
            task_id=task_id,
            name=f'Execute Playbook: {playbook.name}',
            status='running',
            playbook_id=playbook_id,
            executed_by=user_id,
            started_at=datetime.utcnow()
        )
        db.session.add(execution)
        db.session.commit()
        
        # 发送任务开始通知
        emit_task_update({
            'task_id': task_id,
            'status': 'running',
            'progress': 0,
            'message': 'Starting playbook execution...'
        })
        
        # 更新任务状态
        self.update_state(
            state='PROGRESS',
            meta={
                'current': 0,
                'total': 100,
                'status': 'Initializing...'
            }
        )
        
        # 执行Playbook
        result = ansible_service.execute_playbook(
            playbook_id=playbook_id,
            host_ids=host_ids,
            extra_vars=extra_vars
        )
        
        # 处理执行结果
        if result['status'] == 'successful':
            execution.status = 'success'
            execution.progress = 100
            final_status = 'SUCCESS'
        else:
            execution.status = 'failed'
            execution.error_message = result.get('error', 'Execution failed')
            final_status = 'FAILURE'
        
        execution.result = result
        execution.logs = result.get('stdout', '')
        execution.finished_at = datetime.utcnow()
        db.session.commit()
        
        # 发送任务完成通知
        emit_task_update({
            'task_id': task_id,
            'status': execution.status,
            'progress': 100,
            'result': result,
            'message': 'Playbook execution completed'
        })
        
        return {
            'status': execution.status,
            'result': result,
            'execution_id': execution.id
        }
        
    except Exception as exc:
        # 更新执行记录
        execution = TaskExecution.query.filter_by(task_id=task_id).first()
        if execution:
            execution.status = 'failed'
            execution.error_message = str(exc)
            execution.finished_at = datetime.utcnow()
            db.session.commit()
        
        # 发送错误通知
        emit_task_update({
            'task_id': task_id,
            'status': 'failed',
            'error': str(exc),
            'message': 'Playbook execution failed'
        })
        
        # 重新抛出异常
        self.update_state(
            state='FAILURE',
            meta={
                'error': str(exc),
                'traceback': traceback.format_exc()
            }
        )
        raise exc


@celery.task(bind=True)
def execute_adhoc_task(self, host_ids, module, args='', extra_vars=None, user_id=None):
    """异步执行Ad-hoc命令任务"""
    task_id = self.request.id
    
    try:
        # 创建任务执行记录
        execution = TaskExecution(
            task_id=task_id,
            name=f'Ad-hoc: {module} {args}',
            status='running',
            executed_by=user_id,
            started_at=datetime.utcnow()
        )
        db.session.add(execution)
        db.session.commit()
        
        # 发送任务开始通知
        emit_task_update({
            'task_id': task_id,
            'status': 'running',
            'progress': 0,
            'message': f'Executing {module} command...'
        })
        
        # 执行Ad-hoc命令
        result = ansible_service.execute_ad_hoc(
            host_ids=host_ids,
            module=module,
            args=args,
            extra_vars=extra_vars
        )
        
        # 处理执行结果
        if result['status'] == 'successful':
            execution.status = 'success'
            execution.progress = 100
        else:
            execution.status = 'failed'
            execution.error_message = result.get('error', 'Execution failed')
        
        execution.result = result
        execution.logs = result.get('stdout', '')
        execution.finished_at = datetime.utcnow()
        db.session.commit()
        
        # 发送任务完成通知
        emit_task_update({
            'task_id': task_id,
            'status': execution.status,
            'progress': 100,
            'result': result,
            'message': 'Ad-hoc command completed'
        })
        
        return {
            'status': execution.status,
            'result': result,
            'execution_id': execution.id
        }
        
    except Exception as exc:
        # 更新执行记录
        execution = TaskExecution.query.filter_by(task_id=task_id).first()
        if execution:
            execution.status = 'failed'
            execution.error_message = str(exc)
            execution.finished_at = datetime.utcnow()
            db.session.commit()
        
        # 发送错误通知
        emit_task_update({
            'task_id': task_id,
            'status': 'failed',
            'error': str(exc),
            'message': 'Ad-hoc command failed'
        })
        
        self.update_state(
            state='FAILURE',
            meta={
                'error': str(exc),
                'traceback': traceback.format_exc()
            }
        )
        raise exc


@celery.task
def check_host_connectivity(host_id):
    """检查主机连接性"""
    try:
        result = ansible_service.check_host_connectivity(host_id)
        
        # 发送主机状态更新通知
        host = Host.query.get(host_id)
        if host:
            emit_task_update({
                'type': 'host_status_update',
                'host_id': host_id,
                'status': host.status,
                'last_check': host.last_check.isoformat() if host.last_check else None
            })
        
        return result
        
    except Exception as exc:
        # 更新主机状态为未知
        host = Host.query.get(host_id)
        if host:
            host.status = 'unknown'
            host.last_check = datetime.utcnow()
            db.session.commit()
        
        raise exc


@celery.task
def check_all_hosts_connectivity():
    """检查所有主机的连接性"""
    hosts = Host.query.all()
    results = []
    
    for host in hosts:
        try:
            result = ansible_service.check_host_connectivity(host.id)
            results.append({
                'host_id': host.id,
                'status': 'success',
                'result': result
            })
        except Exception as exc:
            results.append({
                'host_id': host.id,
                'status': 'failed',
                'error': str(exc)
            })
    
    return results


@celery.task
def gather_host_facts(host_id):
    """收集主机facts信息"""
    try:
        facts = ansible_service.get_ansible_facts(host_id)
        
        # 更新主机信息
        host = Host.query.get(host_id)
        if host and facts:
            # 提取有用的facts信息
            if 'ansible_facts' in facts:
                ansible_facts = facts['ansible_facts']
                
                # 更新主机变量
                if not host.variables:
                    host.variables = {}
                
                host.variables.update({
                    'ansible_facts': {
                        'os_family': ansible_facts.get('ansible_os_family'),
                        'distribution': ansible_facts.get('ansible_distribution'),
                        'distribution_version': ansible_facts.get('ansible_distribution_version'),
                        'architecture': ansible_facts.get('ansible_architecture'),
                        'processor_cores': ansible_facts.get('ansible_processor_cores'),
                        'memtotal_mb': ansible_facts.get('ansible_memtotal_mb'),
                        'hostname': ansible_facts.get('ansible_hostname'),
                        'fqdn': ansible_facts.get('ansible_fqdn'),
                        'default_ipv4': ansible_facts.get('ansible_default_ipv4'),
                        'last_updated': datetime.utcnow().isoformat()
                    }
                })
                
                db.session.commit()
        
        return facts
        
    except Exception as exc:
        raise exc


@celery.task
def cleanup_old_tasks():
    """清理旧的任务记录"""
    from datetime import timedelta
    
    # 删除30天前的任务记录
    cutoff_date = datetime.utcnow() - timedelta(days=30)
    
    old_tasks = TaskExecution.query.filter(
        TaskExecution.created_at < cutoff_date
    ).all()
    
    count = 0
    for task in old_tasks:
        db.session.delete(task)
        count += 1
    
    db.session.commit()
    
    # 清理Ansible artifacts
    ansible_service.cleanup_old_artifacts(days=7)
    
    return f'Cleaned up {count} old task records'


@celery.task
def validate_playbook_syntax(playbook_id):
    """验证Playbook语法"""
    try:
        playbook = Playbook.query.get(playbook_id)
        if not playbook:
            raise ValueError(f'Playbook {playbook_id} not found')
        
        result = ansible_service.validate_playbook(playbook.content)
        
        return result
        
    except Exception as exc:
        return {
            'valid': False,
            'errors': [str(exc)]
        }


# 定期任务
@celery.task
def periodic_health_check():
    """定期健康检查"""
    # 检查所有主机连接性
    check_all_hosts_connectivity.delay()
    
    # 清理旧任务
    cleanup_old_tasks.delay()
    
    return 'Periodic health check completed'