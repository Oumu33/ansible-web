from flask import Blueprint
from flask_restful import Api

# 创建API蓝图
api_bp = Blueprint('api', __name__)
api = Api(api_bp)

# 导入资源类
from app.api.hosts import HostListResource, HostResource, HostGroupListResource, HostGroupResource
from app.api.playbooks import PlaybookListResource, PlaybookResource, PlaybookExecuteResource
from app.api.tasks import TaskListResource, TaskResource, TaskLogsResource
from app.api.dashboard import DashboardStatsResource
from app.api.templates import TemplateListResource, TemplateResource
from app.api.inventory import InventoryResource, InventoryExportResource

# 注册API路由

# 主机管理
api.add_resource(HostListResource, '/hosts')
api.add_resource(HostResource, '/hosts/<int:host_id>')
api.add_resource(HostGroupListResource, '/host-groups')
api.add_resource(HostGroupResource, '/host-groups/<int:group_id>')

# Playbook管理
api.add_resource(PlaybookListResource, '/playbooks')
api.add_resource(PlaybookResource, '/playbooks/<int:playbook_id>')
api.add_resource(PlaybookExecuteResource, '/playbooks/<int:playbook_id>/execute')

# 任务管理
api.add_resource(TaskListResource, '/tasks')
api.add_resource(TaskResource, '/tasks/<int:task_id>')
api.add_resource(TaskLogsResource, '/tasks/<int:task_id>/logs')

# 仪表板
api.add_resource(DashboardStatsResource, '/dashboard/stats')

# 模板市场
api.add_resource(TemplateListResource, '/templates')
api.add_resource(TemplateResource, '/templates/<int:template_id>')

# 清单管理
api.add_resource(InventoryResource, '/inventory')
api.add_resource(InventoryExportResource, '/inventory/export')