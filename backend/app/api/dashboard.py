from flask import request, jsonify
from flask_restful import Resource
from flask_jwt_extended import jwt_required
from app.models import Host, Playbook, TaskExecution, HostGroup, db
from datetime import datetime, timedelta
from sqlalchemy import func


class DashboardStatsResource(Resource):
    """仪表板统计资源"""
    
    @jwt_required()
    def get(self):
        """获取仪表板统计数据"""
        try:
            # 主机统计
            total_hosts = Host.query.count()
            online_hosts = Host.query.filter_by(status='online').count()
            offline_hosts = Host.query.filter_by(status='offline').count()
            unknown_hosts = Host.query.filter_by(status='unknown').count()
            
            # Playbook统计
            total_playbooks = Playbook.query.count()
            
            # 主机组统计
            total_groups = HostGroup.query.count()
            
            # 任务统计
            total_tasks = TaskExecution.query.count()
            running_tasks = TaskExecution.query.filter_by(status='running').count()
            successful_tasks = TaskExecution.query.filter_by(status='successful').count()
            failed_tasks = TaskExecution.query.filter_by(status='failed').count()
            
            # 最近7天的任务执行趋势
            seven_days_ago = datetime.utcnow() - timedelta(days=7)
            daily_tasks = db.session.query(
                func.date(TaskExecution.started_at).label('date'),
                func.count(TaskExecution.id).label('count')
            ).filter(
                TaskExecution.started_at >= seven_days_ago
            ).group_by(
                func.date(TaskExecution.started_at)
            ).all()
            
            # 最近执行的任务
            recent_tasks = TaskExecution.query.order_by(
                TaskExecution.started_at.desc()
            ).limit(10).all()
            
            # 任务成功率统计
            last_30_days = datetime.utcnow() - timedelta(days=30)
            success_rate_data = db.session.query(
                TaskExecution.status,
                func.count(TaskExecution.id).label('count')
            ).filter(
                TaskExecution.started_at >= last_30_days
            ).group_by(TaskExecution.status).all()
            
            # 主机状态分布
            host_status_data = db.session.query(
                Host.status,
                func.count(Host.id).label('count')
            ).group_by(Host.status).all()
            
            # 最活跃的Playbook
            popular_playbooks = db.session.query(
                Playbook.name,
                func.count(TaskExecution.id).label('execution_count')
            ).join(
                TaskExecution, Playbook.id == TaskExecution.playbook_id
            ).filter(
                TaskExecution.started_at >= last_30_days
            ).group_by(
                Playbook.id, Playbook.name
            ).order_by(
                func.count(TaskExecution.id).desc()
            ).limit(5).all()
            
            # 系统资源使用情况（模拟数据）
            import psutil
            system_stats = {
                'cpu_percent': psutil.cpu_percent(interval=1),
                'memory_percent': psutil.virtual_memory().percent,
                'disk_percent': psutil.disk_usage('/').percent
            }
            
            return {
                'host_stats': {
                    'total': total_hosts,
                    'online': online_hosts,
                    'offline': offline_hosts,
                    'unknown': unknown_hosts
                },
                'playbook_stats': {
                    'total': total_playbooks
                },
                'group_stats': {
                    'total': total_groups
                },
                'task_stats': {
                    'total': total_tasks,
                    'running': running_tasks,
                    'successful': successful_tasks,
                    'failed': failed_tasks
                },
                'daily_task_trend': [{
                    'date': str(item.date),
                    'count': item.count
                } for item in daily_tasks],
                'recent_tasks': [{
                    'id': t.id,
                    'name': t.name,
                    'status': t.status,
                    'started_at': t.started_at.isoformat() if t.started_at else None,
                    'duration': str(t.finished_at - t.started_at) if t.finished_at and t.started_at else None
                } for t in recent_tasks],
                'success_rate_data': [{
                    'status': item.status,
                    'count': item.count
                } for item in success_rate_data],
                'host_status_data': [{
                    'status': item.status,
                    'count': item.count
                } for item in host_status_data],
                'popular_playbooks': [{
                    'name': item.name,
                    'execution_count': item.execution_count
                } for item in popular_playbooks],
                'system_stats': system_stats
            }
        except Exception as e:
            return {'error': str(e)}, 500


class DashboardAlertsResource(Resource):
    """仪表板告警资源"""
    
    @jwt_required()
    def get(self):
        """获取系统告警信息"""
        try:
            alerts = []
            
            # 检查离线主机
            offline_hosts = Host.query.filter_by(status='offline').count()
            if offline_hosts > 0:
                alerts.append({
                    'type': 'warning',
                    'title': '主机离线告警',
                    'message': f'当前有 {offline_hosts} 台主机处于离线状态',
                    'timestamp': datetime.utcnow().isoformat()
                })
            
            # 检查失败任务
            recent_failed = TaskExecution.query.filter(
                TaskExecution.status == 'failed',
                TaskExecution.started_at >= datetime.utcnow() - timedelta(hours=24)
            ).count()
            
            if recent_failed > 0:
                alerts.append({
                    'type': 'error',
                    'title': '任务执行失败',
                    'message': f'最近24小时内有 {recent_failed} 个任务执行失败',
                    'timestamp': datetime.utcnow().isoformat()
                })
            
            # 检查长时间运行的任务
            long_running = TaskExecution.query.filter(
                TaskExecution.status == 'running',
                TaskExecution.started_at <= datetime.utcnow() - timedelta(hours=2)
            ).count()
            
            if long_running > 0:
                alerts.append({
                    'type': 'info',
                    'title': '长时间运行任务',
                    'message': f'有 {long_running} 个任务运行时间超过2小时',
                    'timestamp': datetime.utcnow().isoformat()
                })
            
            return {'alerts': alerts}
        except Exception as e:
            return {'error': str(e)}, 500