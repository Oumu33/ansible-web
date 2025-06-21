from flask import request, jsonify
from flask_restful import Resource
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models import Host, HostGroup, Inventory, db
from app.services.ansible_service import AnsibleService
import json


class InventoryListResource(Resource):
    """清单列表资源"""
    
    @jwt_required()
    def get(self):
        """获取清单列表"""
        try:
            page = request.args.get('page', 1, type=int)
            per_page = request.args.get('per_page', 10, type=int)
            search = request.args.get('search', '')
            
            query = Inventory.query
            
            if search:
                query = query.filter(
                    Inventory.name.contains(search) |
                    Inventory.description.contains(search)
                )
            
            inventories = query.order_by(Inventory.created_at.desc()).paginate(
                page=page, per_page=per_page, error_out=False
            )
            
            return {
                'inventories': [{
                    'id': inv.id,
                    'name': inv.name,
                    'description': inv.description,
                    'host_count': len(inv.hosts),
                    'group_count': len(inv.groups),
                    'created_at': inv.created_at.isoformat(),
                    'updated_at': inv.updated_at.isoformat()
                } for inv in inventories.items],
                'total': inventories.total,
                'pages': inventories.pages,
                'current_page': page
            }
        except Exception as e:
            return {'error': str(e)}, 500
    
    @jwt_required()
    def post(self):
        """创建新清单"""
        try:
            data = request.get_json()
            user_id = get_jwt_identity()
            
            if not data.get('name'):
                return {'error': 'Name is required'}, 400
            
            inventory = Inventory(
                name=data['name'],
                description=data.get('description', ''),
                created_by=user_id
            )
            
            db.session.add(inventory)
            db.session.commit()
            
            return {
                'id': inventory.id,
                'name': inventory.name,
                'description': inventory.description,
                'created_at': inventory.created_at.isoformat()
            }, 201
        except Exception as e:
            db.session.rollback()
            return {'error': str(e)}, 500


class InventoryResource(Resource):
    """单个清单资源"""
    
    @jwt_required()
    def get(self, inventory_id):
        """获取清单详情"""
        try:
            inventory = Inventory.query.get_or_404(inventory_id)
            
            return {
                'id': inventory.id,
                'name': inventory.name,
                'description': inventory.description,
                'hosts': [{
                    'id': host.id,
                    'name': host.name,
                    'ip': host.ip,
                    'status': host.status,
                    'groups': [g.name for g in host.groups]
                } for host in inventory.hosts],
                'groups': [{
                    'id': group.id,
                    'name': group.name,
                    'description': group.description,
                    'host_count': len(group.hosts),
                    'variables': group.variables
                } for group in inventory.groups],
                'created_at': inventory.created_at.isoformat(),
                'updated_at': inventory.updated_at.isoformat()
            }
        except Exception as e:
            return {'error': str(e)}, 500
    
    @jwt_required()
    def put(self, inventory_id):
        """更新清单"""
        try:
            inventory = Inventory.query.get_or_404(inventory_id)
            data = request.get_json()
            
            if 'name' in data:
                inventory.name = data['name']
            if 'description' in data:
                inventory.description = data['description']
            
            db.session.commit()
            
            return {
                'id': inventory.id,
                'name': inventory.name,
                'description': inventory.description,
                'updated_at': inventory.updated_at.isoformat()
            }
        except Exception as e:
            db.session.rollback()
            return {'error': str(e)}, 500
    
    @jwt_required()
    def delete(self, inventory_id):
        """删除清单"""
        try:
            inventory = Inventory.query.get_or_404(inventory_id)
            
            db.session.delete(inventory)
            db.session.commit()
            
            return {'message': 'Inventory deleted successfully'}
        except Exception as e:
            db.session.rollback()
            return {'error': str(e)}, 500


class InventoryExportResource(Resource):
    """清单导出资源"""
    
    @jwt_required()
    def get(self, inventory_id):
        """导出清单为Ansible格式"""
        try:
            inventory = Inventory.query.get_or_404(inventory_id)
            
            # 生成Ansible清单格式
            ansible_service = AnsibleService()
            inventory_content = ansible_service.generate_inventory(
                hosts=inventory.hosts,
                groups=inventory.groups
            )
            
            return {
                'inventory_id': inventory.id,
                'name': inventory.name,
                'content': inventory_content,
                'format': 'ini'
            }
        except Exception as e:
            return {'error': str(e)}, 500


class InventoryImportResource(Resource):
    """清单导入资源"""
    
    @jwt_required()
    def post(self, inventory_id):
        """从文件导入清单"""
        try:
            inventory = Inventory.query.get_or_404(inventory_id)
            data = request.get_json()
            
            if not data.get('content'):
                return {'error': 'Content is required'}, 400
            
            content = data['content']
            format_type = data.get('format', 'ini')
            
            # 解析清单内容
            if format_type == 'json':
                try:
                    inventory_data = json.loads(content)
                    # 处理JSON格式的清单
                    self._import_from_json(inventory, inventory_data)
                except json.JSONDecodeError as e:
                    return {'error': f'Invalid JSON format: {str(e)}'}, 400
            else:
                # 处理INI格式的清单
                self._import_from_ini(inventory, content)
            
            db.session.commit()
            
            return {
                'message': 'Inventory imported successfully',
                'inventory_id': inventory.id
            }
        except Exception as e:
            db.session.rollback()
            return {'error': str(e)}, 500
    
    def _import_from_ini(self, inventory, content):
        """从INI格式导入清单"""
        lines = content.strip().split('\n')
        current_group = None
        
        for line in lines:
            line = line.strip()
            if not line or line.startswith('#'):
                continue
            
            if line.startswith('[') and line.endswith(']'):
                # 组定义
                group_name = line[1:-1]
                if group_name != 'all':
                    current_group = HostGroup.query.filter_by(
                        name=group_name, inventory_id=inventory.id
                    ).first()
                    if not current_group:
                        current_group = HostGroup(
                            name=group_name,
                            inventory_id=inventory.id
                        )
                        db.session.add(current_group)
            else:
                # 主机定义
                parts = line.split()
                if parts:
                    host_name = parts[0]
                    
                    # 解析主机变量
                    variables = {}
                    for part in parts[1:]:
                        if '=' in part:
                            key, value = part.split('=', 1)
                            variables[key] = value
                    
                    # 获取IP地址
                    ip = variables.get('ansible_host', host_name)
                    
                    # 创建或更新主机
                    host = Host.query.filter_by(
                        name=host_name, inventory_id=inventory.id
                    ).first()
                    if not host:
                        host = Host(
                            name=host_name,
                            ip=ip,
                            variables=variables,
                            inventory_id=inventory.id
                        )
                        db.session.add(host)
                    else:
                        host.ip = ip
                        host.variables.update(variables)
                    
                    # 添加到当前组
                    if current_group and host not in current_group.hosts:
                        current_group.hosts.append(host)
    
    def _import_from_json(self, inventory, data):
        """从JSON格式导入清单"""
        # 处理主机
        if '_meta' in data and 'hostvars' in data['_meta']:
            for host_name, host_vars in data['_meta']['hostvars'].items():
                ip = host_vars.get('ansible_host', host_name)
                
                host = Host.query.filter_by(
                    name=host_name, inventory_id=inventory.id
                ).first()
                if not host:
                    host = Host(
                        name=host_name,
                        ip=ip,
                        variables=host_vars,
                        inventory_id=inventory.id
                    )
                    db.session.add(host)
                else:
                    host.ip = ip
                    host.variables.update(host_vars)
        
        # 处理组
        for group_name, group_data in data.items():
            if group_name.startswith('_'):
                continue
            
            group = HostGroup.query.filter_by(
                name=group_name, inventory_id=inventory.id
            ).first()
            if not group:
                group = HostGroup(
                    name=group_name,
                    inventory_id=inventory.id
                )
                db.session.add(group)
            
            # 添加主机到组
            if 'hosts' in group_data:
                for host_name in group_data['hosts']:
                    host = Host.query.filter_by(
                        name=host_name, inventory_id=inventory.id
                    ).first()
                    if host and host not in group.hosts:
                        group.hosts.append(host)
            
            # 设置组变量
            if 'vars' in group_data:
                group.variables = group_data['vars']


class InventoryValidateResource(Resource):
    """清单验证资源"""
    
    @jwt_required()
    def post(self, inventory_id):
        """验证清单连接性"""
        try:
            inventory = Inventory.query.get_or_404(inventory_id)
            
            # 使用Ansible服务检查主机连接性
            ansible_service = AnsibleService()
            results = []
            
            for host in inventory.hosts:
                try:
                    result = ansible_service.check_host_connectivity([host])
                    results.append({
                        'host_id': host.id,
                        'host_name': host.name,
                        'ip': host.ip,
                        'status': 'reachable' if result.get('success') else 'unreachable',
                        'message': result.get('message', '')
                    })
                except Exception as e:
                    results.append({
                        'host_id': host.id,
                        'host_name': host.name,
                        'ip': host.ip,
                        'status': 'error',
                        'message': str(e)
                    })
            
            # 统计结果
            total_hosts = len(results)
            reachable_hosts = len([r for r in results if r['status'] == 'reachable'])
            unreachable_hosts = len([r for r in results if r['status'] == 'unreachable'])
            error_hosts = len([r for r in results if r['status'] == 'error'])
            
            return {
                'inventory_id': inventory.id,
                'validation_results': results,
                'summary': {
                    'total_hosts': total_hosts,
                    'reachable_hosts': reachable_hosts,
                    'unreachable_hosts': unreachable_hosts,
                    'error_hosts': error_hosts,
                    'success_rate': round((reachable_hosts / total_hosts * 100), 2) if total_hosts > 0 else 0
                }
            }
        except Exception as e:
            return {'error': str(e)}, 500