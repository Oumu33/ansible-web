from flask import request, jsonify
from flask_restful import Resource
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models import Playbook, db
from app.tasks.ansible_tasks import execute_playbook_task, validate_playbook_syntax
import yaml


class PlaybookListResource(Resource):
    """Playbook列表资源"""
    
    @jwt_required()
    def get(self):
        """获取Playbook列表"""
        try:
            page = request.args.get('page', 1, type=int)
            per_page = request.args.get('per_page', 10, type=int)
            search = request.args.get('search', '')
            category = request.args.get('category', '')
            
            query = Playbook.query
            
            if search:
                query = query.filter(
                    Playbook.name.contains(search) |
                    Playbook.description.contains(search)
                )
            
            if category:
                query = query.filter(Playbook.category == category)
            
            playbooks = query.paginate(
                page=page, per_page=per_page, error_out=False
            )
            
            return {
                'playbooks': [{
                    'id': p.id,
                    'name': p.name,
                    'description': p.description,
                    'category': p.category,
                    'tags': p.tags,
                    'created_at': p.created_at.isoformat(),
                    'updated_at': p.updated_at.isoformat(),
                    'created_by': p.created_by
                } for p in playbooks.items],
                'total': playbooks.total,
                'pages': playbooks.pages,
                'current_page': page
            }
        except Exception as e:
            return {'error': str(e)}, 500
    
    @jwt_required()
    def post(self):
        """创建新的Playbook"""
        try:
            data = request.get_json()
            user_id = get_jwt_identity()
            
            # 验证必需字段
            if not data.get('name'):
                return {'error': 'Name is required'}, 400
            
            if not data.get('content'):
                return {'error': 'Content is required'}, 400
            
            # 验证YAML语法
            try:
                yaml.safe_load(data['content'])
            except yaml.YAMLError as e:
                return {'error': f'Invalid YAML syntax: {str(e)}'}, 400
            
            playbook = Playbook(
                name=data['name'],
                description=data.get('description', ''),
                content=data['content'],
                category=data.get('category', 'general'),
                tags=data.get('tags', []),
                variables=data.get('variables', {}),
                created_by=user_id
            )
            
            db.session.add(playbook)
            db.session.commit()
            
            return {
                'id': playbook.id,
                'name': playbook.name,
                'description': playbook.description,
                'category': playbook.category,
                'tags': playbook.tags,
                'created_at': playbook.created_at.isoformat(),
                'created_by': playbook.created_by
            }, 201
        except Exception as e:
            db.session.rollback()
            return {'error': str(e)}, 500


class PlaybookResource(Resource):
    """单个Playbook资源"""
    
    @jwt_required()
    def get(self, playbook_id):
        """获取单个Playbook详情"""
        try:
            playbook = Playbook.query.get_or_404(playbook_id)
            
            return {
                'id': playbook.id,
                'name': playbook.name,
                'description': playbook.description,
                'content': playbook.content,
                'category': playbook.category,
                'tags': playbook.tags,
                'variables': playbook.variables,
                'created_at': playbook.created_at.isoformat(),
                'updated_at': playbook.updated_at.isoformat(),
                'created_by': playbook.created_by
            }
        except Exception as e:
            return {'error': str(e)}, 500
    
    @jwt_required()
    def put(self, playbook_id):
        """更新Playbook"""
        try:
            playbook = Playbook.query.get_or_404(playbook_id)
            data = request.get_json()
            
            # 验证YAML语法（如果提供了content）
            if 'content' in data:
                try:
                    yaml.safe_load(data['content'])
                except yaml.YAMLError as e:
                    return {'error': f'Invalid YAML syntax: {str(e)}'}, 400
            
            # 更新字段
            if 'name' in data:
                playbook.name = data['name']
            if 'description' in data:
                playbook.description = data['description']
            if 'content' in data:
                playbook.content = data['content']
            if 'category' in data:
                playbook.category = data['category']
            if 'tags' in data:
                playbook.tags = data['tags']
            if 'variables' in data:
                playbook.variables = data['variables']
            
            db.session.commit()
            
            return {
                'id': playbook.id,
                'name': playbook.name,
                'description': playbook.description,
                'category': playbook.category,
                'tags': playbook.tags,
                'updated_at': playbook.updated_at.isoformat()
            }
        except Exception as e:
            db.session.rollback()
            return {'error': str(e)}, 500
    
    @jwt_required()
    def delete(self, playbook_id):
        """删除Playbook"""
        try:
            playbook = Playbook.query.get_or_404(playbook_id)
            
            db.session.delete(playbook)
            db.session.commit()
            
            return {'message': 'Playbook deleted successfully'}
        except Exception as e:
            db.session.rollback()
            return {'error': str(e)}, 500


class PlaybookExecuteResource(Resource):
    """Playbook执行资源"""
    
    @jwt_required()
    def post(self, playbook_id):
        """执行Playbook"""
        try:
            data = request.get_json()
            user_id = get_jwt_identity()
            
            # 验证Playbook是否存在
            playbook = Playbook.query.get_or_404(playbook_id)
            
            # 获取执行参数
            host_ids = data.get('host_ids', [])
            extra_vars = data.get('extra_vars', {})
            
            # 启动异步任务
            task = execute_playbook_task.delay(
                playbook_id=playbook_id,
                host_ids=host_ids,
                extra_vars=extra_vars,
                user_id=user_id
            )
            
            return {
                'task_id': task.id,
                'message': 'Playbook execution started',
                'playbook_name': playbook.name
            }, 202
        except Exception as e:
            return {'error': str(e)}, 500


class PlaybookValidateResource(Resource):
    """Playbook语法验证资源"""
    
    @jwt_required()
    def post(self, playbook_id):
        """验证Playbook语法"""
        try:
            # 启动异步验证任务
            task = validate_playbook_syntax.delay(playbook_id)
            
            return {
                'task_id': task.id,
                'message': 'Playbook validation started'
            }, 202
        except Exception as e:
            return {'error': str(e)}, 500