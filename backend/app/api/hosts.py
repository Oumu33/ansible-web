from flask import request, jsonify
from flask_restful import Resource
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy.exc import IntegrityError

from app import db
from app.models import Host, HostGroup, User
from app.utils.validators import validate_host_data, validate_host_group_data
from app.services.ansible_service import AnsibleService
from app.tasks.host_tasks import check_host_connectivity


class HostListResource(Resource):
    """主机列表资源"""
    
    @jwt_required()
    def get(self):
        """获取主机列表"""
        try:
            # 查询参数
            page = request.args.get('page', 1, type=int)
            per_page = request.args.get('per_page', 20, type=int)
            group_id = request.args.get('group_id', type=int)
            status = request.args.get('status')
            search = request.args.get('search', '')
            
            # 构建查询
            query = Host.query
            
            if group_id:
                query = query.filter(Host.group_id == group_id)
            
            if status:
                query = query.filter(Host.status == status)
            
            if search:
                query = query.filter(
                    db.or_(
                        Host.name.ilike(f'%{search}%'),
                        Host.hostname.ilike(f'%{search}%'),
                        Host.ip_address.ilike(f'%{search}%')
                    )
                )
            
            # 分页
            pagination = query.paginate(
                page=page, per_page=per_page, error_out=False
            )
            
            hosts = [host.to_dict() for host in pagination.items]
            
            return {
                'hosts': hosts,
                'pagination': {
                    'page': page,
                    'per_page': per_page,
                    'total': pagination.total,
                    'pages': pagination.pages,
                    'has_next': pagination.has_next,
                    'has_prev': pagination.has_prev
                }
            }, 200
            
        except Exception as e:
            return {'error': str(e)}, 500
    
    @jwt_required()
    def post(self):
        """创建新主机"""
        try:
            data = request.get_json()
            
            # 验证数据
            errors = validate_host_data(data)
            if errors:
                return {'errors': errors}, 400
            
            # 检查IP地址是否已存在
            existing_host = Host.query.filter_by(ip_address=data['ip_address']).first()
            if existing_host:
                return {'error': 'IP address already exists'}, 409
            
            # 创建主机
            host = Host(
                name=data['name'],
                hostname=data['hostname'],
                ip_address=data['ip_address'],
                port=data.get('port', 22),
                username=data.get('username', 'root'),
                password=data.get('password'),
                private_key_path=data.get('private_key_path'),
                variables=data.get('variables', {}),
                group_id=data.get('group_id')
            )
            
            db.session.add(host)
            db.session.commit()
            
            # 异步检查连接性
            check_host_connectivity.delay(host.id)
            
            return host.to_dict(), 201
            
        except IntegrityError:
            db.session.rollback()
            return {'error': 'Host with this name already exists'}, 409
        except Exception as e:
            db.session.rollback()
            return {'error': str(e)}, 500


class HostResource(Resource):
    """单个主机资源"""
    
    @jwt_required()
    def get(self, host_id):
        """获取主机详情"""
        try:
            host = Host.query.get_or_404(host_id)
            return host.to_dict(), 200
        except Exception as e:
            return {'error': str(e)}, 500
    
    @jwt_required()
    def put(self, host_id):
        """更新主机"""
        try:
            host = Host.query.get_or_404(host_id)
            data = request.get_json()
            
            # 验证数据
            errors = validate_host_data(data, host_id=host_id)
            if errors:
                return {'errors': errors}, 400
            
            # 更新字段
            for field in ['name', 'hostname', 'ip_address', 'port', 'username', 
                         'password', 'private_key_path', 'variables', 'group_id']:
                if field in data:
                    setattr(host, field, data[field])
            
            db.session.commit()
            
            # 如果连接信息发生变化，重新检查连接性
            if any(field in data for field in ['ip_address', 'port', 'username', 'password', 'private_key_path']):
                check_host_connectivity.delay(host.id)
            
            return host.to_dict(), 200
            
        except IntegrityError:
            db.session.rollback()
            return {'error': 'Host with this name or IP already exists'}, 409
        except Exception as e:
            db.session.rollback()
            return {'error': str(e)}, 500
    
    @jwt_required()
    def delete(self, host_id):
        """删除主机"""
        try:
            host = Host.query.get_or_404(host_id)
            
            # 检查是否有正在执行的任务
            # TODO: 添加任务检查逻辑
            
            db.session.delete(host)
            db.session.commit()
            
            return {'message': 'Host deleted successfully'}, 200
            
        except Exception as e:
            db.session.rollback()
            return {'error': str(e)}, 500


class HostGroupListResource(Resource):
    """主机组列表资源"""
    
    @jwt_required()
    def get(self):
        """获取主机组列表"""
        try:
            groups = HostGroup.query.all()
            return [group.to_dict() for group in groups], 200
        except Exception as e:
            return {'error': str(e)}, 500
    
    @jwt_required()
    def post(self):
        """创建主机组"""
        try:
            data = request.get_json()
            
            # 验证数据
            errors = validate_host_group_data(data)
            if errors:
                return {'errors': errors}, 400
            
            # 创建主机组
            group = HostGroup(
                name=data['name'],
                description=data.get('description', ''),
                variables=data.get('variables', {})
            )
            
            db.session.add(group)
            db.session.commit()
            
            return group.to_dict(), 201
            
        except IntegrityError:
            db.session.rollback()
            return {'error': 'Host group with this name already exists'}, 409
        except Exception as e:
            db.session.rollback()
            return {'error': str(e)}, 500


class HostGroupResource(Resource):
    """单个主机组资源"""
    
    @jwt_required()
    def get(self, group_id):
        """获取主机组详情"""
        try:
            group = HostGroup.query.get_or_404(group_id)
            group_dict = group.to_dict()
            group_dict['hosts'] = [host.to_dict() for host in group.hosts]
            return group_dict, 200
        except Exception as e:
            return {'error': str(e)}, 500
    
    @jwt_required()
    def put(self, group_id):
        """更新主机组"""
        try:
            group = HostGroup.query.get_or_404(group_id)
            data = request.get_json()
            
            # 验证数据
            errors = validate_host_group_data(data, group_id=group_id)
            if errors:
                return {'errors': errors}, 400
            
            # 更新字段
            for field in ['name', 'description', 'variables']:
                if field in data:
                    setattr(group, field, data[field])
            
            db.session.commit()
            return group.to_dict(), 200
            
        except IntegrityError:
            db.session.rollback()
            return {'error': 'Host group with this name already exists'}, 409
        except Exception as e:
            db.session.rollback()
            return {'error': str(e)}, 500
    
    @jwt_required()
    def delete(self, group_id):
        """删除主机组"""
        try:
            group = HostGroup.query.get_or_404(group_id)
            
            # 检查是否有主机
            if group.hosts:
                return {'error': 'Cannot delete group with hosts. Move or delete hosts first.'}, 400
            
            db.session.delete(group)
            db.session.commit()
            
            return {'message': 'Host group deleted successfully'}, 200
            
        except Exception as e:
            db.session.rollback()
            return {'error': str(e)}, 500