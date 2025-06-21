from datetime import datetime
from app import socketio


def emit_task_update(data):
    """发送任务状态更新"""
    task_id = data.get('task_id')
    if task_id:
        # 发送到特定任务房间
        socketio.emit('task_update', data, room=f'task_{task_id}')
        
        # 同时发送到管理员房间
        socketio.emit('task_update', data, room='admin')


def emit_host_status_update(host_id, status, last_check=None):
    """发送主机状态更新"""
    data = {
        'type': 'host_status_update',
        'host_id': host_id,
        'status': status,
        'last_check': last_check,
        'timestamp': datetime.utcnow().isoformat()
    }
    
    # 发送到主机房间
    socketio.emit('host_status_update', data, room=f'host_{host_id}')
    
    # 发送到管理员房间
    socketio.emit('host_status_update', data, room='admin')


def emit_playbook_update(playbook_id, action, data=None):
    """发送Playbook更新通知"""
    update_data = {
        'type': 'playbook_update',
        'playbook_id': playbook_id,
        'action': action,  # created, updated, deleted, executed
        'data': data,
        'timestamp': datetime.utcnow().isoformat()
    }
    
    # 广播给所有用户
    socketio.emit('playbook_update', update_data, broadcast=True)


def emit_system_notification(message, message_type='info', target='all'):
    """发送系统通知"""
    notification_data = {
        'type': 'system_notification',
        'message': message,
        'message_type': message_type,  # info, warning, error, success
        'timestamp': datetime.utcnow().isoformat()
    }
    
    if target == 'all':
        socketio.emit('system_notification', notification_data, broadcast=True)
    elif target == 'admin':
        socketio.emit('system_notification', notification_data, room='admin')
    else:
        socketio.emit('system_notification', notification_data, room=target)


def emit_user_activity(user_id, action, details=None):
    """发送用户活动通知"""
    activity_data = {
        'type': 'user_activity',
        'user_id': user_id,
        'action': action,  # login, logout, create, update, delete
        'details': details,
        'timestamp': datetime.utcnow().isoformat()
    }
    
    # 发送到管理员房间
    socketio.emit('user_activity', activity_data, room='admin')


def emit_inventory_update(action, data=None):
    """发送清单更新通知"""
    update_data = {
        'type': 'inventory_update',
        'action': action,  # host_added, host_removed, group_added, group_removed
        'data': data,
        'timestamp': datetime.utcnow().isoformat()
    }
    
    # 广播给所有用户
    socketio.emit('inventory_update', update_data, broadcast=True)


def emit_task_progress(task_id, progress, message=None):
    """发送任务进度更新"""
    progress_data = {
        'type': 'task_progress',
        'task_id': task_id,
        'progress': progress,
        'message': message,
        'timestamp': datetime.utcnow().isoformat()
    }
    
    # 发送到任务房间
    socketio.emit('task_progress', progress_data, room=f'task_{task_id}')


def emit_task_log(task_id, log_data):
    """发送任务日志"""
    log_update = {
        'type': 'task_log',
        'task_id': task_id,
        'log_data': log_data,
        'timestamp': datetime.utcnow().isoformat()
    }
    
    # 发送到任务房间
    socketio.emit('task_log', log_update, room=f'task_{task_id}')


def emit_system_stats(stats):
    """发送系统统计信息"""
    stats_data = {
        'type': 'system_stats',
        'stats': stats,
        'timestamp': datetime.utcnow().isoformat()
    }
    
    # 发送到管理员房间
    socketio.emit('system_stats', stats_data, room='admin')


def emit_template_update(template_id, action, data=None):
    """发送模板更新通知"""
    update_data = {
        'type': 'template_update',
        'template_id': template_id,
        'action': action,  # created, updated, deleted, downloaded
        'data': data,
        'timestamp': datetime.utcnow().isoformat()
    }
    
    # 广播给所有用户
    socketio.emit('template_update', update_data, broadcast=True)


def emit_error_notification(error_message, error_type='general', user_id=None):
    """发送错误通知"""
    error_data = {
        'type': 'error_notification',
        'message': error_message,
        'error_type': error_type,
        'timestamp': datetime.utcnow().isoformat()
    }
    
    if user_id:
        # 发送给特定用户
        socketio.emit('error_notification', error_data, room=f'user_{user_id}')
    else:
        # 发送给管理员
        socketio.emit('error_notification', error_data, room='admin')


def emit_maintenance_notification(message, start_time=None, end_time=None):
    """发送维护通知"""
    maintenance_data = {
        'type': 'maintenance_notification',
        'message': message,
        'start_time': start_time,
        'end_time': end_time,
        'timestamp': datetime.utcnow().isoformat()
    }
    
    # 广播给所有用户
    socketio.emit('maintenance_notification', maintenance_data, broadcast=True)


def emit_resource_usage_alert(resource_type, usage_percent, threshold):
    """发送资源使用警告"""
    alert_data = {
        'type': 'resource_usage_alert',
        'resource_type': resource_type,  # cpu, memory, disk
        'usage_percent': usage_percent,
        'threshold': threshold,
        'timestamp': datetime.utcnow().isoformat()
    }
    
    # 发送到管理员房间
    socketio.emit('resource_usage_alert', alert_data, room='admin')


def emit_backup_notification(status, message, backup_type='manual'):
    """发送备份通知"""
    backup_data = {
        'type': 'backup_notification',
        'status': status,  # started, completed, failed
        'message': message,
        'backup_type': backup_type,
        'timestamp': datetime.utcnow().isoformat()
    }
    
    # 发送到管理员房间
    socketio.emit('backup_notification', backup_data, room='admin')


def emit_security_alert(alert_type, message, severity='medium'):
    """发送安全警告"""
    security_data = {
        'type': 'security_alert',
        'alert_type': alert_type,  # login_failure, unauthorized_access, etc.
        'message': message,
        'severity': severity,  # low, medium, high, critical
        'timestamp': datetime.utcnow().isoformat()
    }
    
    # 发送到管理员房间
    socketio.emit('security_alert', security_data, room='admin')


def emit_connection_test_result(host_id, result):
    """发送连接测试结果"""
    test_data = {
        'type': 'connection_test_result',
        'host_id': host_id,
        'result': result,
        'timestamp': datetime.utcnow().isoformat()
    }
    
    # 发送到主机房间和管理员房间
    socketio.emit('connection_test_result', test_data, room=f'host_{host_id}')
    socketio.emit('connection_test_result', test_data, room='admin')