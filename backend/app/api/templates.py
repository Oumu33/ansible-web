from flask import request, jsonify
from flask_restful import Resource
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models import PlaybookTemplate, db
import yaml


class TemplateListResource(Resource):
    """模板列表资源"""
    
    @jwt_required()
    def get(self):
        """获取模板列表"""
        try:
            page = request.args.get('page', 1, type=int)
            per_page = request.args.get('per_page', 12, type=int)
            search = request.args.get('search', '')
            category = request.args.get('category', '')
            sort_by = request.args.get('sort_by', 'created_at')
            
            query = PlaybookTemplate.query
            
            if search:
                query = query.filter(
                    PlaybookTemplate.name.contains(search) |
                    PlaybookTemplate.description.contains(search) |
                    PlaybookTemplate.tags.contains(search)
                )
            
            if category:
                query = query.filter(PlaybookTemplate.category == category)
            
            # 排序
            if sort_by == 'rating':
                query = query.order_by(PlaybookTemplate.rating.desc())
            elif sort_by == 'downloads':
                query = query.order_by(PlaybookTemplate.download_count.desc())
            else:
                query = query.order_by(PlaybookTemplate.created_at.desc())
            
            templates = query.paginate(
                page=page, per_page=per_page, error_out=False
            )
            
            return {
                'templates': [{
                    'id': t.id,
                    'name': t.name,
                    'description': t.description,
                    'category': t.category,
                    'tags': t.tags,
                    'author': t.author,
                    'version': t.version,
                    'rating': t.rating,
                    'download_count': t.download_count,
                    'created_at': t.created_at.isoformat(),
                    'updated_at': t.updated_at.isoformat()
                } for t in templates.items],
                'total': templates.total,
                'pages': templates.pages,
                'current_page': page
            }
        except Exception as e:
            return {'error': str(e)}, 500
    
    @jwt_required()
    def post(self):
        """创建新模板"""
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
            
            template = PlaybookTemplate(
                name=data['name'],
                description=data.get('description', ''),
                content=data['content'],
                category=data.get('category', 'general'),
                tags=data.get('tags', []),
                author=data.get('author', 'Anonymous'),
                version=data.get('version', '1.0.0'),
                created_by=user_id
            )
            
            db.session.add(template)
            db.session.commit()
            
            return {
                'id': template.id,
                'name': template.name,
                'description': template.description,
                'category': template.category,
                'tags': template.tags,
                'created_at': template.created_at.isoformat()
            }, 201
        except Exception as e:
            db.session.rollback()
            return {'error': str(e)}, 500


class TemplateResource(Resource):
    """单个模板资源"""
    
    @jwt_required()
    def get(self, template_id):
        """获取模板详情"""
        try:
            template = PlaybookTemplate.query.get_or_404(template_id)
            
            return {
                'id': template.id,
                'name': template.name,
                'description': template.description,
                'content': template.content,
                'category': template.category,
                'tags': template.tags,
                'author': template.author,
                'version': template.version,
                'rating': template.rating,
                'download_count': template.download_count,
                'created_at': template.created_at.isoformat(),
                'updated_at': template.updated_at.isoformat(),
                'created_by': template.created_by
            }
        except Exception as e:
            return {'error': str(e)}, 500
    
    @jwt_required()
    def put(self, template_id):
        """更新模板"""
        try:
            template = PlaybookTemplate.query.get_or_404(template_id)
            data = request.get_json()
            
            # 验证YAML语法（如果提供了content）
            if 'content' in data:
                try:
                    yaml.safe_load(data['content'])
                except yaml.YAMLError as e:
                    return {'error': f'Invalid YAML syntax: {str(e)}'}, 400
            
            # 更新字段
            if 'name' in data:
                template.name = data['name']
            if 'description' in data:
                template.description = data['description']
            if 'content' in data:
                template.content = data['content']
            if 'category' in data:
                template.category = data['category']
            if 'tags' in data:
                template.tags = data['tags']
            if 'author' in data:
                template.author = data['author']
            if 'version' in data:
                template.version = data['version']
            
            db.session.commit()
            
            return {
                'id': template.id,
                'name': template.name,
                'description': template.description,
                'updated_at': template.updated_at.isoformat()
            }
        except Exception as e:
            db.session.rollback()
            return {'error': str(e)}, 500
    
    @jwt_required()
    def delete(self, template_id):
        """删除模板"""
        try:
            template = PlaybookTemplate.query.get_or_404(template_id)
            
            db.session.delete(template)
            db.session.commit()
            
            return {'message': 'Template deleted successfully'}
        except Exception as e:
            db.session.rollback()
            return {'error': str(e)}, 500


class TemplateDownloadResource(Resource):
    """模板下载资源"""
    
    @jwt_required()
    def post(self, template_id):
        """下载模板（增加下载计数）"""
        try:
            template = PlaybookTemplate.query.get_or_404(template_id)
            
            # 增加下载计数
            template.download_count += 1
            db.session.commit()
            
            return {
                'id': template.id,
                'name': template.name,
                'content': template.content,
                'download_count': template.download_count
            }
        except Exception as e:
            db.session.rollback()
            return {'error': str(e)}, 500


class TemplateRatingResource(Resource):
    """模板评分资源"""
    
    @jwt_required()
    def post(self, template_id):
        """为模板评分"""
        try:
            data = request.get_json()
            rating = data.get('rating')
            
            if not rating or rating < 1 or rating > 5:
                return {'error': 'Rating must be between 1 and 5'}, 400
            
            template = PlaybookTemplate.query.get_or_404(template_id)
            
            # 简单的评分更新逻辑（实际应该记录每个用户的评分）
            if template.rating == 0:
                template.rating = rating
            else:
                # 简单平均（实际应该基于所有用户评分计算）
                template.rating = (template.rating + rating) / 2
            
            db.session.commit()
            
            return {
                'template_id': template.id,
                'new_rating': template.rating,
                'message': 'Rating submitted successfully'
            }
        except Exception as e:
            db.session.rollback()
            return {'error': str(e)}, 500