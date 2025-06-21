from flask import request, jsonify
from flask_restful import Resource
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models import TaskExecution, db
from datetime import datetime, timedelta
import os


class TaskListResource(Resource):
    """任务列表资源"""
    
    @jwt_required()
    def get(self):
        """获取任务列表"""
        try:
            page = request.args.get('page', 1, type=int)
            per_page = request.args.get('per_page', 10, type=int)
            status = request.args.get('status', '')
            search = request.args.get('search', '')
            start_date = request.args.get('start_date', '')
            end_date = request.args.get('end_date', '')
            
            query = TaskExecution.query
            
            # 状态筛选
            if status:
                query = query.filter(TaskExecution.status == status)
            
            # 搜索筛选
            if search:
                query = query.filter(
                    TaskExecution.name.contains(search) |
                    TaskExecution.task_id.contains(search)
                )
            
            # 时间范围筛选
            if start_date:
                start_dt = datetime.fromisoformat(start_date)
                query = query.filter(TaskExecution.started_at >= start_dt)
            
            if end_date:
                end_dt = datetime.fromisoformat(end_date)
                query = query.filter(TaskExecution.started_at <= end_dt)
            
            # 按创建时间倒序排列
            query = query.order_by(TaskExecution.started_at.desc())
            
            tasks = query.paginate(
                page=page, per_page=per_page, error_out=False
            )
            
            return {
                'tasks': [{
                    'id': t.id,
                    'task_id': t.task_id,
                    'name': t.name,
                    'status': t.status,
                    'playbook_id': t.playbook_id,
                    'executed_by': t.executed_by,
                    'started_at': t.started_at.isoformat() if t.started_at else None,
                    'finished_at': t.finished_at.isoformat() if t.finished_at else None,
                    'duration': str(t.finished_at - t.started_at) if t.finished_at and t.started_at else None,
                    'result_summary': t.result_summary
                } for t in tasks.items],
                'total': tasks.total,
                'pages': tasks.pages,
                'current_page': page
            }
        except Exception as e:
            return {'error': str(e)}, 500
    
    @jwt_required()
    def delete(self):
        """批量删除任务"""
        try:
            data = request.get_json()
            task_ids = data.get('task_ids', [])
            
            if not task_ids:
                return {'error': 'No task IDs provided'}, 400
            
            # 删除指定的任务
            deleted_count = TaskExecution.query.filter(
                TaskExecution.id.in_(task_ids)
            ).delete(synchronize_session=False)
            
            db.session.commit()
            
            return {
                'message': f'Successfully deleted {deleted_count} tasks',
                'deleted_count': deleted_count
            }
        except Exception as e:
            db.session.rollback()
            return {'error': str(e)}, 500


class TaskResource(Resource):
    """单个任务资源"""
    
    @jwt_required()
    def get(self, task_id):
        """获取任务详情"""
        try:
            task = TaskExecution.query.get_or_404(task_id)
            
            return {
                'id': task.id,
                'task_id': task.task_id,
                'name': task.name,
                'status': task.status,
                'playbook_id': task.playbook_id,
                'executed_by': task.executed_by,
                'started_at': task.started_at.isoformat() if task.started_at else None,
                'finished_at': task.finished_at.isoformat() if task.finished_at else None,
                'duration': str(task.finished_at - task.started_at) if task.finished_at and task.started_at else None,
                'result_summary': task.result_summary,
                'error_message': task.error_message,
                'extra_vars': task.extra_vars,
                'target_hosts': task.target_hosts
            }
        except Exception as e:
            return {'error': str(e)}, 500
    
    @jwt_required()
    def delete(self, task_id):
        """删除单个任务"""
        try:
            task = TaskExecution.query.get_or_404(task_id)
            
            db.session.delete(task)
            db.session.commit()
            
            return {'message': 'Task deleted successfully'}
        except Exception as e:
            db.session.rollback()
            return {'error': str(e)}, 500


class TaskLogsResource(Resource):
    """任务日志资源"""
    
    @jwt_required()
    def get(self, task_id):
        """获取任务执行日志"""
        try:
            task = TaskExecution.query.get_or_404(task_id)
            
            # 构建日志文件路径
            log_dir = '/app/ansible_data/logs'
            log_file = os.path.join(log_dir, f'{task.task_id}', 'stdout')
            
            logs = []
            if os.path.exists(log_file):
                with open(log_file, 'r', encoding='utf-8') as f:
                    logs = f.readlines()
            
            return {
                'task_id': task.task_id,
                'logs': logs,
                'log_file_exists': os.path.exists(log_file)
            }
        except Exception as e:
            return {'error': str(e)}, 500


class TaskStatsResource(Resource):
    """任务统计资源"""
    
    @jwt_required()
    def get(self):
        """获取任务统计信息"""
        try:
            # 总任务数
            total_tasks = TaskExecution.query.count()
            
            # 各状态任务数
            running_tasks = TaskExecution.query.filter_by(status='running').count()
            successful_tasks = TaskExecution.query.filter_by(status='successful').count()
            failed_tasks = TaskExecution.query.filter_by(status='failed').count()
            
            # 最近24小时任务数
            yesterday = datetime.utcnow() - timedelta(days=1)
            recent_tasks = TaskExecution.query.filter(
                TaskExecution.started_at >= yesterday
            ).count()
            
            # 最近执行的任务
            recent_executions = TaskExecution.query.order_by(
                TaskExecution.started_at.desc()
            ).limit(5).all()
            
            return {
                'total_tasks': total_tasks,
                'running_tasks': running_tasks,
                'successful_tasks': successful_tasks,
                'failed_tasks': failed_tasks,
                'recent_tasks_24h': recent_tasks,
                'recent_executions': [{
                    'id': t.id,
                    'name': t.name,
                    'status': t.status,
                    'started_at': t.started_at.isoformat() if t.started_at else None
                } for t in recent_executions]
            }
        except Exception as e:
            return {'error': str(e)}, 500